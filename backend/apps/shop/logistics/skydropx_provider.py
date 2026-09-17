"""
Nectar Labs — Adaptador de Logística Skydropx Pro
Implementa BaseShippingProvider con autenticación OAuth2 resiliente,
sondeo asíncrono, correlation IDs, soporte BYO Key y cuenta maestra Nectar Labs.
"""

import os
import time
import uuid
import logging
import requests
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.core.cache import cache
from .base import BaseShippingProvider, NormalizedRate, LabelResult

logger = logging.getLogger("apps.shop")

SKYDROPX_PRO_ENDPOINTS = {
    "staging": {
        "base": "https://sb-pro.skydropx.com/api/v1",
        "oauth": "https://sb-pro.skydropx.com/api/v1/oauth/token",
    },
    "sandbox": {
        "base": "https://sb-pro.skydropx.com/api/v1",
        "oauth": "https://sb-pro.skydropx.com/api/v1/oauth/token",
    },
    "production": {
        "base": "https://app.skydropx.com/api/v1",
        "oauth": "https://app.skydropx.com/api/v1/oauth/token",
    },
MEXICO_STATES = {
    "AG": "Aguascalientes", "BC": "Baja California", "BS": "Baja California Sur",
    "CM": "Campeche", "CS": "Chiapas", "CH": "Chihuahua", "CO": "Coahuila",
    "CL": "Colima", "CX": "Ciudad de México", "DF": "Ciudad de México",
    "CDMX": "Ciudad de México", "DG": "Durango", "GT": "Guanajuato",
    "GR": "Guerrero", "HG": "Hidalgo", "JA": "Jalisco", "EM": "Estado de México",
    "MEX": "Estado de México", "MI": "Michoacán", "MO": "Morelos",
    "NA": "Nayarit", "NL": "Nuevo León", "OA": "Oaxaca", "PU": "Puebla",
    "QT": "Querétaro", "QR": "Quintana Roo", "SL": "San Luis Potosí",
    "SI": "Sinaloa", "SO": "Sonora", "TB": "Tabasco", "TM": "Tamaulipas",
    "TL": "Tlaxcala", "VE": "Veracruz", "YU": "Yucatán", "ZA": "Zacatecas"
}


def _format_skydropx_address(addr: Dict[str, Any], default_cp: str = "83000") -> Dict[str, Any]:
    cp = str(addr.get("postal_code") or addr.get("postalCode") or addr.get("zip_code") or addr.get("zip") or default_cp).strip()
    raw_state = str(addr.get("state") or addr.get("area_level1") or ("Sonora" if cp.startswith("83") else "Ciudad de México")).strip()
    state_name = MEXICO_STATES.get(raw_state.upper(), raw_state)

    city = str(addr.get("city") or addr.get("area_level2") or ("Hermosillo" if cp.startswith("83") else "Ciudad de México")).strip()
    district = str(addr.get("district") or addr.get("suburb") or addr.get("area_level3") or "Centro").strip()
    street = str(addr.get("street") or addr.get("street_and_number") or "Av. Principal 100").strip()
    country = str(addr.get("country") or addr.get("country_code") or "MX")[:2].upper()

    return {
        "postal_code": cp,
        "zip": cp,
        "area_level1": state_name,
        "area_level2": city,
        "area_level3": district,
        "country_code": country,
        "street": street
    }


class SkydropxProvider(BaseShippingProvider):
    """
    Proveedor logístico oficial para Skydropx Pro (Paquetexpress, DHL, Estafeta, FedEx, Redpack, etc.).
    Soporta autenticación OAuth2 con caché atómica en Django cache, sondeo de HTTP 202 y fallback enterprise.
    """

    def __init__(
        self,
        tenant=None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        environment: Optional[str] = None
    ):
        self.tenant = tenant
        self.environment = (
            environment or
            getattr(settings, "SKYDROPX_ENVIRONMENT", None) or
            os.environ.get("SKYDROPX_ENVIRONMENT", "staging")
        ).lower().strip()

        # BYO Key vs Master Account de Nectar Labs
        tenant_key = getattr(tenant, "skydropx_client_id", None) if tenant else None
        tenant_secret = getattr(tenant, "skydropx_client_secret", None) if tenant else None

        if self.environment in ["production", "prod"]:
            master_key = getattr(settings, "SKYDROPX_PROD_API_KEY", "") or os.environ.get("SKYDROPX_PROD_API_KEY", "")
            master_secret = getattr(settings, "SKYDROPX_PROD_API_SECRET", "") or os.environ.get("SKYDROPX_PROD_API_SECRET", "")
        else:
            master_key = getattr(settings, "SKYDROPX_SANDBOX_API_KEY", "") or os.environ.get("SKYDROPX_SANDBOX_API_KEY", "")
            master_secret = getattr(settings, "SKYDROPX_SANDBOX_API_SECRET", "") or os.environ.get("SKYDROPX_SANDBOX_API_SECRET", "")

        # Fallbacks genéricos
        if not master_key:
            master_key = os.environ.get("SKYDROPX_API_KEY", "")
        if not master_secret:
            master_secret = os.environ.get("SKYDROPX_API_SECRET", "")

        self.client_id = (client_id or tenant_key or master_key or "").strip()
        self.client_secret = (client_secret or tenant_secret or master_secret or "").strip()
        self.last_error: Optional[str] = None

        env_urls = SKYDROPX_PRO_ENDPOINTS.get(self.environment, SKYDROPX_PRO_ENDPOINTS["staging"])
        self.base_url = env_urls["base"]
        self.oauth_url = env_urls["oauth"]

        self.nectar_fee = Decimal(str(getattr(tenant, "platform_shipping_fee", "10.00") or "10.00")) if tenant else Decimal("10.00")
        markup = Decimal(str(getattr(tenant, "shipping_markup_percentage", "15.00") or "15.00")) if tenant else Decimal("15.00")
        self.markup_factor = Decimal("1.00") + (markup / Decimal("100.00"))

    @property
    def is_mock(self) -> bool:
        return bool(
            not self.client_id or
            self.client_id in ["mock_key", ""] or
            getattr(settings, "TESTING", False)
        )

    def _get_access_token(self, force_refresh: bool = False) -> Optional[str]:
        """Adquiere o renueva token OAuth2 Bearer con margen de seguridad en caché de Django."""
        if self.is_mock:
            return "mock_bearer_token"

        if not self.client_secret:
            # Si solo se proporcionó API Key sin Secret, se opera en modo Token directo
            return None

        cache_key = f"nectar_skydropx_oauth_token_{self.environment}_{self.client_id[:8]}"
        if not force_refresh:
            cached_token = cache.get(cache_key)
            if cached_token:
                return cached_token

        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }

        # Intento 1: Form-URL-Encoded (RFC 6749 estándar OAuth2)
        try:
            res = requests.post(
                self.oauth_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
                timeout=8
            )
            if res.status_code == 200:
                data = res.json()
                token = data.get("access_token")
                expires_in = int(data.get("expires_in", 7200))
                ttl = max(60, expires_in - 300)
                if token:
                    cache.set(cache_key, token, timeout=ttl)
                    return token

            # Intento 2: JSON payload (fallback específico)
            res_json = requests.post(
                self.oauth_url,
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=8
            )
            if res_json.status_code == 200:
                data = res_json.json()
                token = data.get("access_token")
                expires_in = int(data.get("expires_in", 7200))
                ttl = max(60, expires_in - 300)
                if token:
                    cache.set(cache_key, token, timeout=ttl)
                    return token

            self.last_error = f"OAuth2 HTTP {res.status_code}: {res.text[:250]}"
            logger.error(f"[SkydropxProvider] Error OAuth2 ({res.status_code}): {res.text[:200]}")
        except Exception as e:
            self.last_error = f"Excepción OAuth2: {e}"
            logger.error(f"[SkydropxProvider] Excepción solicitando token OAuth2: {e}")
        return None

    def _headers(self, force_refresh: bool = False) -> Dict[str, str]:
        token = self._get_access_token(force_refresh=force_refresh)
        auth_val = f"Bearer {token}" if token else f"Token token={self.client_id}"
        return {
            "Authorization": auth_val,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "NectarLabs-MultiTenantLogistics/2.5 (+https://nectarlabs.dev)",
            "X-Correlation-ID": f"nectar:skydropx-{uuid.uuid4().hex[:12]}"
        }

    def quote_rates(
        self,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> List[NormalizedRate]:
        """Cotiza tarifas en Skydropx Pro API v1."""
        if self.is_mock:
            mock_base_1 = Decimal("125.00")
            mock_base_2 = Decimal("165.00")
            mock_base_3 = Decimal("210.00")

            t_cost_1 = mock_base_1 + self.nectar_fee
            t_cost_2 = mock_base_2 + self.nectar_fee
            t_cost_3 = mock_base_3 + self.nectar_fee

            return [
                NormalizedRate(
                    id=f"skydropx:paquetexpress:estandar:{mock_base_1}:mock-rate-1",
                    provider="Paquetexpress",
                    carrier="paquetexpress",
                    service_level_name="Nacional Sin Recolección",
                    days=1,
                    amount=mock_base_1,
                    nectar_fee=self.nectar_fee,
                    tenant_cost=t_cost_1,
                    total_amount=round(t_cost_1 * self.markup_factor, 2),
                    provider_type="SKYDROPX",
                    is_fallback=True
                ),
                NormalizedRate(
                    id=f"skydropx:dhl:standard:{mock_base_2}:mock-rate-2",
                    provider="DHL",
                    carrier="dhl",
                    service_level_name="DHL Express Standard",
                    days=1,
                    amount=mock_base_2,
                    nectar_fee=self.nectar_fee,
                    tenant_cost=t_cost_2,
                    total_amount=round(t_cost_2 * self.markup_factor, 2),
                    provider_type="SKYDROPX",
                    is_fallback=True
                ),
                NormalizedRate(
                    id=f"skydropx:estafeta:express:{mock_base_3}:mock-rate-3",
                    provider="Estafeta",
                    carrier="estafeta",
                    service_level_name="Servicio Express",
                    days=2,
                    amount=mock_base_3,
                    nectar_fee=self.nectar_fee,
                    tenant_cost=t_cost_3,
                    total_amount=round(t_cost_3 * self.markup_factor, 2),
                    provider_type="SKYDROPX",
                    is_fallback=True
                )
            ]

        # Normalizar paquetes a especificación de Skydropx
        parcels_payload = []
        for p in packages:
            dims = p.get("dimensions", {})
            length = float(p.get("length", dims.get("length", 20.0)))
            width = float(p.get("width", dims.get("width", 15.0)))
            height = float(p.get("height", dims.get("height", 10.0)))
            weight = float(p.get("weight", 1.0))
            parcels_payload.append({
                "weight": max(0.1, weight),
                "distance_unit": "CM",
                "mass_unit": "KG",
                "length": max(1.0, length),
                "width": max(1.0, width),
                "height": max(1.0, height)
            })

        if not parcels_payload:
            parcels_payload = [{
                "weight": 1.0,
                "distance_unit": "CM",
                "mass_unit": "KG",
                "length": 20.0,
                "width": 15.0,
                "height": 10.0
        address_from = _format_skydropx_address(origin, default_cp="83000")
        address_to = _format_skydropx_address(destination, default_cp="06600")

        payload = {
            "quotation": {
                "address_from": address_from,
                "address_to": address_to,
                "parcels": parcels_payload
            }
        }

        url = f"{self.base_url}/quotations"
        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=15)
            if res.status_code == 401:
                # Reintentar una vez con token invalidado
                res = requests.post(url, json=payload, headers=self._headers(force_refresh=True), timeout=15)

            raw_rates = []
            if res.status_code in [200, 201]:
                body = res.json()
                raw_rates = body.get("rates") or body.get("data", {}).get("rates", [])
            elif res.status_code == 202:
                # Sondeo asíncrono si Skydropx devuelve procesamiento diferido
                quote_data = res.json()
                quotation_id = quote_data.get("id") or quote_data.get("data", {}).get("id")
                if quotation_id:
                    for delay in [0.8, 1.5, 2.5]:
                        time.sleep(delay)
                        poll_res = requests.get(f"{url}/{quotation_id}", headers=self._headers(), timeout=10)
                        if poll_res.status_code == 200:
                            p_data = poll_res.json()
                            rates = p_data.get("rates") or p_data.get("data", {}).get("rates", [])
                            if rates:
                                raw_rates = rates
                                break
            else:
                self.last_error = f"Pro API HTTP {res.status_code}: {res.text[:200]}"
                logger.warning(f"[SkydropxProvider] Quotation respondió HTTP {res.status_code}: {res.text[:200]}")

            # Fallback a Skydropx Standard API (api.skydropx.com/v1/shipments) si Pro no devolvió tarifas
            if not raw_rates:
                legacy_url = "https://api.skydropx.com/v1/shipments"
                legacy_headers = {
                    "Authorization": f"Token token={self.client_id}",
                    "Content-Type": "application/json"
                }
                legacy_payload = {
                    "zip_from": orig_cp,
                    "zip_to": dest_cp,
                    "parcel": {
                        "weight": float(parcels_payload[0].get("weight", 1.0)),
                        "height": float(parcels_payload[0].get("height", 10.0)),
                        "width": float(parcels_payload[0].get("width", 15.0)),
                        "length": float(parcels_payload[0].get("length", 20.0))
                    }
                }
                try:
                    leg_res = requests.post(legacy_url, json=legacy_payload, headers=legacy_headers, timeout=8)
                    if leg_res.status_code in [200, 201]:
                        leg_body = leg_res.json()
                        raw_rates = leg_body.get("rates", []) or leg_body.get("data", {}).get("rates", [])
                    else:
                        prev_err = self.last_error or f"Pro HTTP {res.status_code}"
                        self.last_error = f"{prev_err} | Standard HTTP {leg_res.status_code}: {leg_res.text[:150]}"
                except Exception as leg_e:
                    logger.warning(f"[SkydropxProvider] Fallback Standard API error: {leg_e}")

            normalized: List[NormalizedRate] = []
            for r in raw_rates:
                raw_price = r.get("total_price") or r.get("total_or_subtotal_amount") or r.get("price") or 0.00
                base_cost = Decimal(str(raw_price))
                if base_cost <= Decimal("0.00"):
                    continue

                carrier_name = str(r.get("provider") or "Courier").capitalize()
                carrier_slug = carrier_name.lower()
                service_name = str(r.get("service_level_name") or r.get("service_level") or "Standard")
                rate_uuid = str(r.get("id") or "")
                rate_id = f"skydropx:{carrier_slug}:{service_name}:{base_cost}:{rate_uuid}"

                tenant_cost = base_cost + self.nectar_fee
                buyer_cost = round(tenant_cost * self.markup_factor, 2)

                # Días hábiles
                days_raw = str(r.get("days") or "3").split()[0]
                try:
                    days = int(days_raw)
                except Exception:
                    days = 3

                normalized.append(
                    NormalizedRate(
                        id=rate_id,
                        provider=carrier_name,
                        carrier=carrier_slug,
                        service_level_name=service_name,
                        days=days,
                        amount=base_cost,
                        nectar_fee=self.nectar_fee,
                        tenant_cost=tenant_cost,
                        total_amount=buyer_cost,
                        provider_type="SKYDROPX",
                        is_fallback=False,
                        raw_data=r
                    )
                )

            return normalized
        except Exception as e:
            logger.error(f"[SkydropxProvider] Error al cotizar: {e}")
            return []

    def generate_label(
        self,
        order,
        rate_id: str,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> LabelResult:
        """Genera la guía física oficial en Skydropx Pro API v1."""
        cost_base = Decimal(str(order.shipping_cost_base or "0.00"))
        carrier = order.shipping_carrier_name or "paquetexpress"
        service = order.shipping_service_name or "standard"

        # Extraer el UUID real de la tarifa si viene en formato compuesto
        skydropx_rate_uuid = None
        if rate_id and ":" in rate_id:
            parts = rate_id.split(":")
            if len(parts) >= 5:
                # skydropx:carrier:service:price:uuid
                carrier = parts[1]
                service = parts[2]
                skydropx_rate_uuid = parts[4]
            elif len(parts) >= 4:
                carrier = parts[1]
                service = parts[2]
                skydropx_rate_uuid = parts[3]
        elif rate_id:
            skydropx_rate_uuid = rate_id

        cost_tenant = cost_base + self.nectar_fee

        if self.is_mock or not skydropx_rate_uuid or skydropx_rate_uuid.startswith("mock-"):
            subdomain = order.tenant.subdomain.upper() if order.tenant else "STORE"
            tracking = f"SKX-{subdomain}-{order.id:05d}MX"
            return LabelResult(
                success=True,
                tracking_number=tracking,
                tracking_url=f"https://app.skydropx.com/tracking/{tracking}",
                label_url="https://labels.skydropx.com/sample_label.pdf",
                shipment_id=f"SKX-MOCK-{order.id:05d}",
                carrier=carrier,
                service=service,
                cost_real=cost_base,
                cost_tenant=cost_tenant,
                provider_type="SKYDROPX"
            )

        # Flujo Real en Skydropx Pro
        url = f"{self.base_url}/shipments"
        payload = {
            "shipment": {
                "rate_id": skydropx_rate_uuid,
                "printing_format": "standard",
                "sync_label_creation": True,
                "unique_shipment": True
            }
        }

        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=25)
            if res.status_code == 401:
                res = requests.post(url, json=payload, headers=self._headers(force_refresh=True), timeout=25)

            if res.status_code in [200, 201]:
                body = res.json()
                shipment_data = body.get("data") or body.get("shipment") or body
                tracking = shipment_data.get("tracking_number")
                label_url = shipment_data.get("label_url")
                shipment_id = str(shipment_data.get("id") or "")
                carrier_res = shipment_data.get("carrier") or carrier

                return LabelResult(
                    success=True,
                    tracking_number=tracking,
                    tracking_url=f"https://app.skydropx.com/tracking/{tracking}" if tracking else None,
                    label_url=label_url,
                    shipment_id=shipment_id,
                    carrier=carrier_res,
                    service=service,
                    cost_real=cost_base,
                    cost_tenant=cost_tenant,
                    provider_type="SKYDROPX",
                    raw_response=shipment_data
                )
            elif res.status_code == 202:
                # Sondeo de guía asíncrona
                body = res.json()
                shipment_id = str(body.get("id") or body.get("data", {}).get("id") or "")
                if shipment_id:
                    for delay in [1.5, 2.5, 4.0]:
                        time.sleep(delay)
                        poll_res = requests.get(f"{url}/{shipment_id}", headers=self._headers(), timeout=12)
                        if poll_res.status_code == 200:
                            s_data = poll_res.json()
                            status = str(s_data.get("status") or "").lower()
                            if status in ["completed", "success", "paid"] or s_data.get("tracking_number"):
                                return LabelResult(
                                    success=True,
                                    tracking_number=s_data.get("tracking_number"),
                                    tracking_url=f"https://app.skydropx.com/tracking/{s_data.get('tracking_number')}",
                                    label_url=s_data.get("label_url"),
                                    shipment_id=shipment_id,
                                    carrier=s_data.get("carrier") or carrier,
                                    service=service,
                                    cost_real=cost_base,
                                    cost_tenant=cost_tenant,
                                    provider_type="SKYDROPX",
                                    raw_response=s_data
                                )

            err_msg = res.text[:250]
            logger.error(f"[SkydropxProvider] Error emitiendo guía HTTP {res.status_code}: {err_msg}")
            return LabelResult(success=False, error_message=f"HTTP {res.status_code}: {err_msg}", provider_type="SKYDROPX")
        except Exception as e:
            logger.error(f"[SkydropxProvider] Excepción emitiendo guía: {e}", exc_info=True)
            return LabelResult(success=False, error_message=str(e), provider_type="SKYDROPX")

    def cancel_shipment(self, carrier: str, tracking_number: str, shipment_id: Optional[str] = None) -> Dict[str, Any]:
        """Cancela envío en Skydropx Pro."""
        if self.is_mock or not shipment_id:
            return {"success": True, "status": "cancelled", "mock": True}
        url = f"{self.base_url}/shipments/{shipment_id}"
        try:
            res = requests.delete(url, headers=self._headers(), timeout=10)
            return res.json() if res.status_code in [200, 204] else {"error": res.text}
        except Exception as e:
            return {"error": str(e)}

    def track_shipments(self, tracking_numbers: List[str]) -> List[Dict[str, Any]]:
        """Rastreo unificado de guías Skydropx."""
        results = []
        for tr in tracking_numbers:
            if self.is_mock:
                results.append({"tracking_number": tr, "status": "in_transit", "status_detail": "En ruta a destino"})
                continue
            url = f"{self.base_url}/tracking/{tr}"
            try:
                res = requests.get(url, headers=self._headers(), timeout=8)
                if res.status_code == 200:
                    results.append(res.json())
            except Exception as e:
                logger.error(f"[SkydropxProvider] Error rastreando {tr}: {e}")
        return results

    def validate_zipcode(self, country: str, zipcode: str) -> Dict[str, Any]:
        """Valida C.P. mexicano de 5 dígitos."""
        clean_cp = str(zipcode).strip()
        is_valid = len(clean_cp) == 5 and clean_cp.isdigit()
        return {
            "valid": is_valid,
            "postal_code": clean_cp,
            "country": country.upper()
        }
