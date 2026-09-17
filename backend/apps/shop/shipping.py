import os
import hmac
import hashlib
import logging
import unicodedata
import requests
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.db import transaction

logger = logging.getLogger("apps")

def _clean_envia_str(val: Any) -> str:
    """
    Normaliza texto removiendo caracteres con diacríticos/tildes para compatibilidad
    con los parsers internos PHP/Laravel de Envia.com que devuelven 'Malformed UTF-8'.
    """
    if not isinstance(val, str):
        return str(val) if val is not None else ""
    nfkd = unicodedata.normalize("NFKD", val)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).strip()

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN Y RESOLUCIÓN DE AMBIENTES ENVIA.COM
# ──────────────────────────────────────────────────────────────────────────────
def is_envia_production() -> bool:
    """
    Determina si la pasarela debe operar en el ambiente de producción de Envia.com.
    Prioriza ENVIA_ENVIRONMENT sobre ENVIRONMENT general.
    """
    envia_env = getattr(settings, "ENVIA_ENVIRONMENT", os.environ.get("ENVIA_ENVIRONMENT", "")).lower()
    if envia_env in ["production", "prod"]:
        return True
    if envia_env in ["sandbox", "test", "staging", "local"]:
        return False
    current_env = getattr(settings, "ENVIRONMENT", os.environ.get("ENVIRONMENT", "local")).lower()
    return current_env in ["production", "prod"]

def get_envia_shipping_base_url() -> str:
    return "https://api.envia.com" if is_envia_production() else "https://api-test.envia.com"

def get_envia_queries_base_url() -> str:
    return "https://queries.envia.com" if is_envia_production() else "https://queries.test.envia.com"

def get_envia_geocodes_base_url() -> str:
    return "https://geocodes.envia.com"

def get_envia_master_token() -> str:
    """
    Obtiene el token corporativo maestro de Néctar Labs según el ambiente activo.
    """
    if is_envia_production():
        return getattr(settings, "ENVIA_PRODUCTION_TOKEN", os.environ.get("ENVIA_PRODUCTION_TOKEN", os.environ.get("ENVIA_API_KEY", "")))
    return getattr(settings, "ENVIA_SANDBOX_TOKEN", os.environ.get("ENVIA_SANDBOX_TOKEN", os.environ.get("ENVIA_API_KEY", "")))

def get_envia_webhook_secret() -> str:
    return getattr(settings, "ENVIA_WEBHOOK_SECRET", os.environ.get("ENVIA_WEBHOOK_SECRET", ""))

def verify_envia_webhook_bearer_token(auth_header: str) -> bool:
    """
    Valida las peticiones de webhook autenticadas con Bearer Token (ej. webhooks Tipo 1 y 2).
    """
    if not auth_header:
        return False
    token = auth_header.replace("Bearer ", "").replace("bearer ", "").strip()
    allowed_tokens = getattr(settings, "ENVIA_WEBHOOK_TOKENS", [])
    if token in allowed_tokens:
        return True
    active_tokens = [
        getattr(settings, "ENVIA_PRODUCTION_TOKEN", ""),
        getattr(settings, "ENVIA_SANDBOX_TOKEN", ""),
        os.environ.get("ENVIA_API_KEY", "")
    ]
    return token in [t for t in active_tokens if t]


# ──────────────────────────────────────────────────────────────────────────────
# CLIENTE CORE ENVIA.COM
# ──────────────────────────────────────────────────────────────────────────────
class EnviaClient:
    """
    Cliente desacoplado y robusto para interactuar con las APIs de Envia.com:
    Shipping, Queries y Geocodes con conmutación dinámica Sandbox/Producción.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_envia_master_token()
        self.shipping_base = get_envia_shipping_base_url()
        self.queries_base = get_envia_queries_base_url()
        self.geocodes_base = get_envia_geocodes_base_url()

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _format_packages(self, packages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for p in packages:
            dims = p.get("dimensions", {})
            length = float(p.get("length", dims.get("length", 20.0)))
            width = float(p.get("width", dims.get("width", 15.0)))
            height = float(p.get("height", dims.get("height", 10.0)))
            weight = float(p.get("weight", 1.0))
            declared_val = float(p.get("declaredValue", p.get("declared_value", 500.0)))
            raw_content = p.get("content", "Mercancia general")
            formatted.append({
                "type": p.get("type", "box"),
                "content": _clean_envia_str(raw_content) or "Mercancia general",
                "amount": int(p.get("amount", 1)),
                "declaredValue": declared_val,
                "lengthUnit": "CM",
                "weightUnit": "KG",
                "weight": max(0.1, weight),
                "dimensions": {
                    "length": max(1.0, length),
                    "width": max(1.0, width),
                    "height": max(1.0, height)
                }
            })
        return formatted or [{
            "type": "box",
            "content": "Mercancia general",
            "amount": 1,
            "declaredValue": 500.0,
            "lengthUnit": "CM",
            "weightUnit": "KG",
            "weight": 1.0,
            "dimensions": {"length": 20.0, "width": 15.0, "height": 10.0}
        }]

    def _format_address(self, addr: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formatea y sanitiza direcciones de origen y destino conforme a la especificación de Envia.com:
        - Asegura 'district' (colonia) para couriers en México.
        - Asegura 'number' (número exterior) requerido estrictamente para /ship/generate/.
        - Sanitiza tildes o caracteres especiales que rompen los parsers internos de Envia.
        """
        formatted = dict(addr)
        for k, v in formatted.items():
            if isinstance(v, str):
                formatted[k] = _clean_envia_str(v)

        if not formatted.get("district"):
            formatted["district"] = formatted.get("suburb") or "Centro"
        if not formatted.get("number"):
            formatted["number"] = formatted.get("street_number") or formatted.get("exterior_number") or "S/N"

        return formatted

    # 1. Geocodes API (Público, sin auth)
    def validate_zipcode(self, country: str, zipcode: str) -> Dict[str, Any]:
        url = f"{self.geocodes_base}/zipcode/{country.upper()}/{zipcode}"
        try:
            res = requests.get(url, timeout=6)
            if res.status_code == 200:
                return res.json()
            return {"success": False, "message": f"HTTP {res.status_code}"}
        except Exception as e:
            logger.error(f"[Envia/Geocodes] Error validando C.P. {zipcode}: {e}")
            return {"success": False, "error": str(e)}

    def locate_city(self, country: str, city: str) -> Dict[str, Any]:
        url = f"{self.geocodes_base}/locate/{country.upper()}/{city}"
        try:
            res = requests.get(url, timeout=6)
            if res.status_code == 200:
                return res.json()
            return {"success": False, "message": f"HTTP {res.status_code}"}
        except Exception as e:
            logger.error(f"[Envia/Geocodes] Error localizando ciudad {city}: {e}")
            return {"success": False, "error": str(e)}

    # 2. Queries API
    def get_carriers(self, country: str = "MX") -> List[Dict[str, Any]]:
        url = f"{self.queries_base}/carrier?country_code={country.upper()}"
        try:
            res = requests.get(url, headers=self._headers(), timeout=8)
            if res.status_code == 200:
                data = res.json()
                return data.get("data", []) if isinstance(data, dict) else data
            return []
        except Exception as e:
            logger.error(f"[Envia/Queries] Error obteniendo carriers para {country}: {e}")
            return []

    def get_services(self, carrier: str, country: str = "MX") -> List[Dict[str, Any]]:
        url = f"{self.queries_base}/available-service/{country.upper()}"
        try:
            res = requests.get(url, headers=self._headers(), timeout=8)
            if res.status_code == 200:
                data = res.json()
                return data.get("data", []) if isinstance(data, dict) else data
            return []
        except Exception as e:
            logger.error(f"[Envia/Queries] Error obteniendo servicios {carrier}: {e}")
            return []

    # 3. Shipping API - Cotizaciones
    def quote_rates(self, origin: Dict[str, Any], destination: Dict[str, Any], packages: List[Dict[str, Any]], carrier: Optional[str] = None) -> List[Dict[str, Any]]:
        url = f"{self.shipping_base}/ship/rate/"
        orig = self._format_address(origin)
        dest = self._format_address(destination)

        formatted_packages = self._format_packages(packages)

        carriers_to_try = [carrier] if carrier else (
            ["paquetexpress", "sendex", "ups"] if not is_envia_production() else ["fedex", "dhl", "estafeta", "paquetexpress", "redpack"]
        )

        aggregated_rates: List[Dict[str, Any]] = []

        for c in carriers_to_try:
            payload = {
                "origin": orig,
                "destination": dest,
                "packages": formatted_packages,
                "shipment": {
                    "type": 1,
                    "carrier": c
                }
            }
            try:
                res = requests.post(url, json=payload, headers=self._headers(), timeout=20)
                if res.status_code in [200, 201]:
                    data = res.json()
                    rates = data.get("data", [])
                    if isinstance(rates, list):
                        aggregated_rates.extend(rates)
                else:
                    logger.warning(f"[Envia/Rates] Carrier {c} respondió HTTP {res.status_code}: {res.text[:150]}")
            except Exception as e:
                logger.warning(f"[Envia/Rates] Excepción cotizando carrier {c}: {e}")

        return aggregated_rates


    # 4. Shipping API - Emisión de Guía
    def generate_label(self, origin: Dict[str, Any], destination: Dict[str, Any], packages: List[Dict[str, Any]], carrier: str, service: str, label_format: str = "pdf") -> Dict[str, Any]:
        url = f"{self.shipping_base}/ship/generate/"
        orig = self._format_address(origin)
        dest = self._format_address(destination)

        formatted_packages = self._format_packages(packages)
        payload = {
            "origin": orig,
            "destination": dest,
            "packages": formatted_packages,
            "shipment": {
                "carrier": carrier,
                "service": service,
                "type": 1
            },
            "settings": {
                "labelFormat": label_format.lower(),
                "printFormat": label_format.upper(),
                "printSize": "STOCK_4X6",
                "currency": "MXN"
            }
        }

        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=25)
            if res.status_code in [200, 201]:
                return res.json()
            logger.error(f"[Envia/Generate] Error generando etiqueta ({res.status_code}): {res.text}")
            return {"error": res.text, "status_code": res.status_code}
        except Exception as e:
            logger.error(f"[Envia/Generate] Excepción emitiendo guía: {e}", exc_info=True)
            return {"error": str(e)}

    # 5. Shipping API - Cancelación de Guía
    def cancel_shipment(self, carrier: str, tracking_number: str) -> Dict[str, Any]:
        url = f"{self.shipping_base}/ship/cancel/"
        payload = {
            "carrier": carrier,
            "trackingNumber": tracking_number
        }
        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            return res.json() if res.status_code in [200, 201] else {"error": res.text}
        except Exception as e:
            logger.error(f"[Envia/Cancel] Error cancelando guía {tracking_number}: {e}")
            return {"error": str(e)}

    # 6. Shipping API - Rastreo
    def track_shipments(self, tracking_numbers: List[str]) -> List[Dict[str, Any]]:
        url = f"{self.shipping_base}/ship/generaltrack/"
        payload = {"trackingNumbers": tracking_numbers}
        try:
            res = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            if res.status_code in [200, 201]:
                return res.json().get("data", [])
            return []
        except Exception as e:
            logger.error(f"[Envia/Track] Error rastreando guías: {e}")
            return []


# ──────────────────────────────────────────────────────────────────────────────
# SERVICIOS DE ALTO NIVEL CON ACCESO MULTI-TENANT Y MOTOR DE MARGEN
# ──────────────────────────────────────────────────────────────────────────────
def validate_tenant_logistics_access(tenant) -> bool:
    """
    Verifica que el tenant tenga permiso activo para utilizar el módulo de paquetería:
    Requiere addon 'shop', 'logistics-gps', 'delivery-tracking' activo o encontrarse en periodo de prueba.
    """
    if not tenant or not tenant.is_active:
        return False
    if tenant.is_in_trial:
        return True
    active_addons = getattr(tenant, "active_addons", [])
    has_addon = any(addon in active_addons for addon in ["shop", "logistics-gps", "delivery-tracking", "ecommerce-combo"])
    return has_addon


def get_shipping_rates(destination: Dict[str, Any], parcel: Optional[Dict[str, Any]] = None, tenant=None) -> List[Dict[str, Any]]:
    """
    Fachada unificada para cotización multi-proveedor (Envia.com y Skydropx Pro).
    Delega al enrutador logístico con soporte para multicotizador dinámico y BYO keys.
    """
    from apps.shop.logistics.router import get_shipping_rates as _router_get_shipping_rates
    return _router_get_shipping_rates(destination=destination, parcel=parcel, tenant=tenant)


def generate_shipping_label(order) -> bool:
    """
    Fachada unificada para emisión de guías multi-proveedor (Envia.com y Skydropx Pro).
    Delega al enrutador logístico con débito atómico y protección contra deadlocks.
    """
    from apps.shop.logistics.router import generate_shipping_label as _router_generate_label
    return _router_generate_label(order=order)


def verify_envia_webhook_signature(raw_body: bytes, signature: str, timestamp: str, event_name: str) -> bool:
    """
    Verifica la firma HMAC-SHA256 enviada por Envia.com en X-Webhook-Signature.
    Fórmula oficial: v1 = HMAC_SHA256(timestamp + "." + event + "." + raw_body, secret)
    """
    secret = get_envia_webhook_secret()
    if not secret:
        return False

    computed = hmac.new(
        secret.encode("utf-8"),
        f"{timestamp}.{event_name}.".encode("utf-8") + raw_body,
        hashlib.sha256
    ).hexdigest()

    expected_sig = f"v1={computed}"
    return hmac.compare_digest(signature, expected_sig)


def verify_skydropx_webhook(token_header: str, tenant=None) -> bool:
    """
    Valida la autenticidad del webhook entrante de Skydropx Pro (Token o HMAC secret).
    """
    if not token_header:
        return False

    clean_token = token_header.replace("Bearer ", "").replace("Token token=", "").strip()
    expected_secrets = [
        getattr(settings, "SKYDROPX_WEBHOOK_SECRET", ""),
        os.environ.get("SKYDROPX_WEBHOOK_SECRET", "")
    ]
    if tenant and getattr(tenant, "skydropx_webhook_secret", None):
        expected_secrets.append(tenant.skydropx_webhook_secret)

    for sec in expected_secrets:
        if sec and hmac.compare_digest(clean_token, sec.strip()):
            return True
    return False
