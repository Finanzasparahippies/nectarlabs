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
    "prod": {
        "base": "https://app.skydropx.com/api/v1",
        "oauth": "https://app.skydropx.com/api/v1/oauth/token",
    }
}

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
        "province": state_name,
        "city": city,
        "district": district,
        "street": street,
        "street1": street,
        "country_code": country
    }


def _extract_quotation_id(body: Any) -> Optional[str]:
    """Extrae de forma resiliente el identificador de la cotización en Skydropx Pro."""
    if not isinstance(body, dict):
        return None
    data = body.get("data")
    if isinstance(data, dict) and data.get("id"):
        return str(data["id"])
    if body.get("id"):
        return str(body["id"])
    if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get("id"):
        return str(data[0]["id"])
    quot = body.get("quotation")
    if isinstance(quot, dict) and quot.get("id"):
        return str(quot["id"])
    return None


def _extract_rates(body: Any) -> List[Dict[str, Any]]:
    """
    Extrae las tarifas de múltiples esquemas soportados por Skydropx Pro:
    - JSON:API estándar (data.attributes.rates)
    - Dict anidado (data.rates, quotation.rates)
    - Raíz plana (rates)
    - Colección de recursos en data (data = [rate1, rate2, ...])
    - Recursos incluidos (included = [rate1, ...])
    """
    if not isinstance(body, dict):
        return []

    # 1. Esquema JSON:API estándar: data -> attributes -> rates
    data = body.get("data")
    if isinstance(data, dict):
        attrs = data.get("attributes")
        if isinstance(attrs, dict):
            r = attrs.get("rates")
            if isinstance(r, list) and r:
                return r
        r = data.get("rates")
        if isinstance(r, list) and r:
            return r

    # 2. Raíz plana: rates
    root_rates = body.get("rates")
    if isinstance(root_rates, list) and root_rates:
        return root_rates

    # 3. Anidado bajo objeto quotation
    quot = body.get("quotation")
    if isinstance(quot, dict):
        if isinstance(quot.get("rates"), list) and quot["rates"]:
            return quot["rates"]
        attrs = quot.get("attributes")
        if isinstance(attrs, dict) and isinstance(attrs.get("rates"), list) and attrs["rates"]:
            return attrs["rates"]

    # 4. Lista directa en 'data'
    if isinstance(data, list) and data:
        if isinstance(data[0], dict):
            if data[0].get("attributes", {}).get("rates"):
                return data[0]["attributes"]["rates"]
            if data[0].get("type") in ["rates", "rate"] or data[0].get("total_price") or data[0].get("amount"):
                return data

    # 5. Side-loading en 'included'
    included = body.get("included")
    if isinstance(included, list):
        inc_rates = [
            item for item in included
            if isinstance(item, dict) and item.get("type") in ["rates", "rate", "quotation_rate"]
        ]
        if inc_rates:
            return inc_rates

    return []


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
            raw_pkg_type = str(p.get("package_type") or p.get("type") or "box").lower()
            if raw_pkg_type not in ["box", "envelope", "pallet"]:
                raw_pkg_type = "box"
            parcels_payload.append({
                "weight": max(0.01, weight),
                "distance_unit": "CM",
                "mass_unit": "KG",
                "length": max(1.0, length),
                "width": max(1.0, width),
                "height": max(1.0, height),
                "package_type": raw_pkg_type
            })

        if not parcels_payload:
            parcels_payload = [{
                "weight": 1.0,
                "distance_unit": "CM",
                "mass_unit": "KG",
                "length": 20.0,
                "width": 15.0,
                "height": 10.0,
                "package_type": "box"
            }]

        address_from = _format_skydropx_address(origin, default_cp="83000")
        address_to = _format_skydropx_address(destination, default_cp="06600")
        orig_cp = str(address_from.get("postal_code") or "83000")
        dest_cp = str(address_to.get("postal_code") or "06600")

        payload = {
            "quotation": {
                "address_from": address_from,
                "address_to": address_to,
                "parcels": parcels_payload,
                "currency": "MXN"
            }
        }

        url = f"{self.base_url}/quotations"
        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=15)
            if res.status_code == 401:
                # Reintentar una vez con token invalidado
                res = requests.post(url, json=payload, headers=self._headers(force_refresh=True), timeout=15)

            raw_rates = []
            quotation_id = None
            is_completed = False

            if res.status_code in [200, 201, 202]:
                try:
                    body = res.json()
                    quotation_id = _extract_quotation_id(body)
                    raw_rates = _extract_rates(body)
                    if isinstance(body.get("data"), dict):
                        is_completed = bool(body["data"].get("attributes", {}).get("is_completed", False))
                    elif isinstance(body.get("quotation"), dict):
                        is_completed = bool(body["quotation"].get("is_completed", False))
                except Exception as parse_e:
                    logger.warning(f"[SkydropxProvider] Error parseando respuesta JSON inicial: {parse_e}")
                    body = {}

                # Sondeo asíncrono (Polling): Skydropx Pro calcula tarifas de paqueterías en background
                # Si no hay tarifas aún o is_completed es False, consultamos GET /quotations/{quotation_id}
                if (not raw_rates or not is_completed) and quotation_id:
                    for delay in [1.0, 1.5, 2.0, 2.5]:
                        time.sleep(delay)
                        try:
                            poll_res = requests.get(f"{url}/{quotation_id}", headers=self._headers(), timeout=10)
                            if poll_res.status_code == 200:
                                p_data = poll_res.json()
                                rates = _extract_rates(p_data)
                                if rates:
                                    raw_rates = rates
                                    p_attrs = p_data.get("data", {}).get("attributes", {}) if isinstance(p_data.get("data"), dict) else {}
                                    if p_attrs.get("is_completed"):
                                        break
                        except Exception as poll_e:
                            logger.warning(f"[SkydropxProvider] Error durante polling de cotización {quotation_id}: {poll_e}")
            else:
                self.last_error = f"Pro API HTTP {res.status_code}: {res.text[:250]}"
                logger.warning(f"[SkydropxProvider] Quotation respondió HTTP {res.status_code}: {res.text[:200]}")

            # Fallback a Skydropx Standard API si Pro no devolvió tarifas
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
                        raw_rates = _extract_rates(leg_body)
                    else:
                        prev_err = self.last_error or f"Pro HTTP {res.status_code}"
                        self.last_error = f"{prev_err} | Standard HTTP {leg_res.status_code}: {leg_res.text[:150]}"
                except Exception as leg_e:
                    logger.warning(f"[SkydropxProvider] Fallback Standard API error: {leg_e}")

            if not raw_rates and not self.last_error:
                diag = f"HTTP {res.status_code}"
                if quotation_id:
                    diag += f" (ID: {quotation_id}, completado={is_completed})"
                self.last_error = f"Sin tarifas disponibles para la ruta CP {orig_cp} -> CP {dest_cp} [{diag}]"

            # Mapa de couriers desde included (JSON:API)
            carrier_map = {}
            for inc in (body.get("included") or []):
                if isinstance(inc, dict) and inc.get("type") in ["carrier", "carriers", "courier", "provider"]:
                    c_id = str(inc.get("id"))
                    c_attrs = inc.get("attributes", {}) if isinstance(inc.get("attributes"), dict) else {}
                    c_name = c_attrs.get("name") or c_attrs.get("carrier_name") or inc.get("name")
                    if c_name:
                        carrier_map[c_id] = str(c_name).strip()

            normalized: List[NormalizedRate] = []
            for r in raw_rates:
                attrs = r.get("attributes", {}) if isinstance(r.get("attributes"), dict) else {}
                raw_price = (
                    attrs.get("amount") or
                    attrs.get("total_price") or
                    attrs.get("total_or_subtotal_amount") or
                    attrs.get("price") or
                    r.get("total_price") or
                    r.get("total_or_subtotal_amount") or
                    r.get("amount") or
                    r.get("price") or
                    0.00
                )
                try:
                    base_cost = Decimal(str(raw_price))
                except Exception:
                    continue

                if base_cost <= Decimal("0.00"):
                    continue

                # Resolver nombre del courier desde relaciones, atributos o códigos
                rel_carrier_id = str(r.get("relationships", {}).get("carrier", {}).get("data", {}).get("id") or "")
                carrier_raw = (
                    carrier_map.get(rel_carrier_id) or
                    attrs.get("carrier_name") or
                    attrs.get("provider_name") or
                    attrs.get("carrier_code") or
                    attrs.get("provider_code") or
                    attrs.get("carrier") or
                    attrs.get("provider") or
                    r.get("carrier_name") or
                    r.get("provider_name") or
                    r.get("carrier_code") or
                    r.get("carrier") or
                    r.get("provider")
                )
                if isinstance(carrier_raw, dict):
                    carrier_raw = carrier_raw.get("name") or carrier_raw.get("code") or carrier_raw.get("description")

                carrier_name = str(carrier_raw or "Skydropx").capitalize()
                carrier_slug = carrier_name.lower()

                # Días hábiles
                days_raw = str(
                    attrs.get("days") or
                    attrs.get("delivery_days") or
                    r.get("days") or
                    r.get("delivery_days") or
                    "3"
                ).split()[0]
                try:
                    days = int(days_raw)
                except Exception:
                    days = 3

                # Resolver nombre de servicio o modalidad (evitando etiquetas genéricas)
                service_candidates = [
                    attrs.get("service_name"),
                    attrs.get("description"),
                    attrs.get("service_level_name"),
                    attrs.get("service_level_code"),
                    attrs.get("service_level"),
                    attrs.get("service"),
                    r.get("service_name"),
                    r.get("description"),
                    r.get("service_level_name"),
                    r.get("service_level"),
                    r.get("service")
                ]
                service_raw = None
                for cand in service_candidates:
                    if isinstance(cand, dict):
                        cand = cand.get("name") or cand.get("description") or cand.get("code")
                    if cand and str(cand).strip() and str(cand).strip().lower() not in ["standard", "none"]:
                        service_raw = str(cand).strip()
                        break

                if not service_raw:
                    base_srv = str(attrs.get("service_level_name") or r.get("service_level_name") or "Standard").strip()
                    if days == 1 and base_srv.lower() == "standard":
                        service_raw = "Express (Día Siguiente)"
                    elif days <= 2 and base_srv.lower() == "standard":
                        service_raw = "Prioritario (2 días)"
                    elif days >= 5 and base_srv.lower() == "standard":
                        service_raw = f"Terrestre ({days} días)"
                    else:
                        service_raw = base_srv

                service_name = service_raw or "Standard"

                rate_uuid = str(r.get("id") or attrs.get("id") or "")
                rate_id = f"skydropx:{carrier_slug}:{service_name}:{base_cost}:{rate_uuid}"

                tenant_cost = base_cost + self.nectar_fee
                buyer_cost = round(tenant_cost * self.markup_factor, 2)

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
            self.last_error = f"Excepción en SkydropxProvider: {e}"
            logger.error(f"[SkydropxProvider] Error al cotizar: {e}", exc_info=True)
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
                attrs = shipment_data.get("attributes", {}) if isinstance(shipment_data, dict) else {}

                tracking = (
                    attrs.get("tracking_number") or
                    attrs.get("trackingNumber") or
                    shipment_data.get("tracking_number") or
                    shipment_data.get("trackingNumber")
                )
                label_url = (
                    attrs.get("label_url") or
                    attrs.get("label") or
                    attrs.get("url") or
                    shipment_data.get("label_url") or
                    shipment_data.get("label") or
                    shipment_data.get("url")
                )
                shipment_id = str(shipment_data.get("id") or attrs.get("id") or "")
                carrier_res = (
                    attrs.get("carrier") or
                    attrs.get("carrier_name") or
                    shipment_data.get("carrier") or
                    carrier
                )

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
                s_data = body.get("data") or body.get("shipment") or body
                s_attrs = s_data.get("attributes", {}) if isinstance(s_data, dict) else {}
                shipment_id = str(s_data.get("id") or s_attrs.get("id") or body.get("id") or "")
                if shipment_id:
                    for delay in [1.5, 2.5, 4.0]:
                        time.sleep(delay)
                        poll_res = requests.get(f"{url}/{shipment_id}", headers=self._headers(), timeout=12)
                        if poll_res.status_code == 200:
                            p_data = poll_res.json()
                            p_ship = p_data.get("data") or p_data.get("shipment") or p_data
                            p_attrs = p_ship.get("attributes", {}) if isinstance(p_ship, dict) else {}

                            status = str(p_attrs.get("status") or p_ship.get("status") or "").lower()
                            tracking = (
                                p_attrs.get("tracking_number") or
                                p_attrs.get("trackingNumber") or
                                p_ship.get("tracking_number")
                            )
                            if status in ["completed", "success", "paid", "ready"] or tracking:
                                label_url = (
                                    p_attrs.get("label_url") or
                                    p_attrs.get("label") or
                                    p_ship.get("label_url") or
                                    p_ship.get("label")
                                )
                                return LabelResult(
                                    success=True,
                                    tracking_number=tracking,
                                    tracking_url=f"https://app.skydropx.com/tracking/{tracking}" if tracking else None,
                                    label_url=label_url,
                                    shipment_id=shipment_id,
                                    carrier=p_attrs.get("carrier") or p_ship.get("carrier") or carrier,
                                    service=service,
                                    cost_real=cost_base,
                                    cost_tenant=cost_tenant,
                                    provider_type="SKYDROPX",
                                    raw_response=p_data
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
