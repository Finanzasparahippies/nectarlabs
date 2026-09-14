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
    return getattr(settings, "ENVIA_WEBHOOK_SECRET", os.environ.get("ENVIA_WEBHOOK_SECRET", "nectar_envia_whsec_default"))

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
                res = requests.post(url, json=payload, headers=self._headers(), timeout=12)
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
            res = requests.post(url, json=payload, headers=self._headers(), timeout=15)
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
    Cotiza y devuelve las tarifas vigentes desde Envia.com para un tenant específico.
    Aplica:
    1. Comisión fija obligatoria de Néctar Labs (+ $10.00 MXN).
    2. Margen comercial configurado por el tenant (shipping_markup_percentage) hacia el comprador final.
    """
    if not tenant:
        return []

    # Validar acceso por addon o trial
    if not validate_tenant_logistics_access(tenant):
        logger.warning(f"[Logística/Envia] Tenant #{tenant.id} no cuenta con addon activo de envíos ni trial vigente.")
        return []

    custom_key = getattr(tenant, "envia_api_key", None)
    master_key = get_envia_master_token()
    api_key = custom_key if custom_key else master_key

    # Comisión de Nectar Labs fija de $10.00 MXN tipada a Decimal
    nectar_commission = Decimal(str(getattr(tenant, "platform_shipping_fee", "10.00") or "10.00"))
    markup_percentage = Decimal(str(tenant.shipping_markup_percentage or "15.00"))
    markup_factor = Decimal("1.00") + (markup_percentage / Decimal("100.00"))


    # Mock fallback en testing unitario o cuando no hay credenciales configuradas
    if not api_key or api_key in ["mock_key", ""] or getattr(settings, "TESTING", False):
        logger.info(f"[Logística/Mock Envia] Cotización simulada (Ambiente: {'Prod' if is_envia_production() else 'Sandbox'}).")
        mock_base_1 = Decimal("115.00")
        mock_base_2 = Decimal("175.00")

        # Costo Tenant = Base + $10.00
        tenant_cost_1 = mock_base_1 + nectar_commission
        tenant_cost_2 = mock_base_2 + nectar_commission

        # Costo Comprador = Costo Tenant * Markup
        final_1 = round(tenant_cost_1 * markup_factor, 2)
        final_2 = round(tenant_cost_2 * markup_factor, 2)

        return [
            {
                "id": "rate_envia_mock_fedex",
                "carrier": "fedex",
                "provider": "FedEx",
                "service_level_name": "FedEx Ground",
                "days": 3,
                "amount": float(mock_base_1),
                "nectar_fee": float(nectar_commission),
                "tenant_cost": float(tenant_cost_1),
                "total_amount": float(final_1)
            },
            {
                "id": "rate_envia_mock_dhl",
                "carrier": "dhl",
                "provider": "DHL Express",
                "service_level_name": "Express Domestic",
                "days": 1,
                "amount": float(mock_base_2),
                "nectar_fee": float(nectar_commission),
                "tenant_cost": float(tenant_cost_2),
                "total_amount": float(final_2)
            }
        ]

    # Validar saldo mínimo de $250.00 MXN para cotizar si utiliza cuenta de Néctar Labs
    if not custom_key and tenant.shipping_wallet_balance < Decimal("300.00"):
        logger.warning(
            f"[Logística/Envia] Saldo insuficiente en billetera para Tenant #{tenant.id} (${tenant.shipping_wallet_balance} MXN < $250.00 MXN)."
        )
        return []

    # Preparar Dirección de Origen
    origin_address = {
        "name": tenant.shipping_origin_name or "Néctar Labs Bodega",
        "company": tenant.name or "Nectar Store",
        "email": getattr(tenant.owner, "email", "envios@nectarlabs.dev") if getattr(tenant, "owner", None) else "envios@nectarlabs.dev",
        "phone": tenant.shipping_origin_phone or "6621000000",
        "street": tenant.shipping_origin_street or "Av. Central 100",
        "number": "100",
        "district": tenant.shipping_origin_suburb or "Centro",
        "city": tenant.shipping_origin_city or "Hermosillo",
        "state": (tenant.shipping_origin_state or "SO")[:2].upper(),
        "postalCode": str(tenant.shipping_origin_zip_code or "83000"),
        "country": "MX"
    }

    # Preparar Dirección de Destino
    dest_zip = str(destination.get("zip_code") or destination.get("postal_code") or "83000")
    dest_state = (destination.get("state") or "SO")[:2].upper()
    destination_address = {
        "name": destination.get("name") or "Cliente",
        "company": destination.get("company") or "",
        "email": destination.get("email") or "cliente@example.com",
        "phone": destination.get("phone") or "6620000000",
        "street": destination.get("street") or destination.get("street_and_number") or "Calle Principal",
        "number": destination.get("number") or "1",
        "district": destination.get("suburb") or "Centro",
        "city": destination.get("city") or "Hermosillo",
        "state": dest_state,
        "postalCode": dest_zip,
        "country": (destination.get("country") or "MX")[:2].upper()
    }

    # Datos del paquete
    parcel_data = parcel or {
        "content": "Mercancía general",
        "amount": 1,
        "type": "box",
        "weight": 1,
        "length": 25,
        "height": 15,
        "width": 20
    }

    client = EnviaClient(api_key=api_key)
    raw_rates = client.quote_rates(origin=origin_address, destination=destination_address, packages=[parcel_data])

    formatted_rates = []
    for r in raw_rates:
        base_cost = Decimal(str(r.get("totalPrice") or r.get("price") or 0.00))
        carrier_name = r.get("carrier", "Courier").capitalize()
        service_name = r.get("service", "Standard")
        rate_id = f"{r.get('carrier')}:{r.get('service')}:{base_cost}"

        # Costo Tenant = Base Courier + $10.00 MXN Comisión Nectar Labs
        tenant_cost = base_cost + nectar_commission
        # Costo Final al Comprador = Costo Tenant * Markup del Tenant
        buyer_cost = round(tenant_cost * markup_factor, 2)

        formatted_rates.append({
            "id": rate_id,
            "carrier": r.get("carrier"),
            "provider": carrier_name,
            "service_level_name": service_name,
            "days": r.get("deliveryEstimate", {}).get("days") or r.get("deliveryDays", 3),
            "amount": float(base_cost),
            "nectar_fee": float(nectar_commission),
            "tenant_cost": float(tenant_cost),
            "total_amount": float(buyer_cost)
        })

    return formatted_rates


def generate_shipping_label(order) -> bool:
    """
    Emite la guía oficial en Envia.com para la orden especificada:
    1. Ejecuta verificación y descuento atómico en la billetera del tenant (Costo Courier + $10.00 MXN Nectar).
    2. Registra la transacción en el ledger ShippingWalletTransaction.
    3. Contacta a Envia.com (/ship/generate/) y almacena tracking_number, tracking_url y PDF en la orden.
    """
    tenant = order.tenant
    if not tenant:
        logger.error(f"[Logística/Envia] Orden #{order.id} sin tenant asociado.")
        return False

    custom_key = getattr(tenant, "envia_api_key", None)
    master_key = get_envia_master_token()
    api_key = custom_key if custom_key else master_key
    using_corporate_key = not custom_key

    nectar_commission = Decimal(str(getattr(tenant, "platform_shipping_fee", "10.00") or "10.00"))
    cost_base = Decimal(str(order.shipping_cost_base or "0.00"))
    costo_tenant = cost_base + nectar_commission

    # Fallback Simulado en testing o sin credenciales
    is_mock = (
        not api_key or
        api_key in ["mock_key", ""] or
        getattr(settings, "TESTING", False) or
        (order.shipping_rate_id and order.shipping_rate_id.startswith("rate_envia_mock_")) or
        (order.shipping_rate_id and order.shipping_rate_id.startswith("rate_mock_"))
    )

    if is_mock:
        logger.info(f"[Logística/Mock Envia] Generación simulada para orden #{order.id}.")
        with transaction.atomic():
            from apps.tenants.models import Tenant
            from apps.shop.models import ShippingWalletTransaction

            t_locked = Tenant.objects.select_for_update().get(id=tenant.id)
            if using_corporate_key:
                if t_locked.shipping_wallet_balance < costo_tenant:
                    logger.error(f"[Logística/Mock Envia] Saldo insuficiente en Tenant #{tenant.id}: ${t_locked.shipping_wallet_balance} < ${costo_tenant}")
                    return False
                t_locked.shipping_wallet_balance -= costo_tenant
                t_locked.save(update_fields=["shipping_wallet_balance"])

                ShippingWalletTransaction.objects.create(
                    tenant=t_locked,
                    order=order,
                    amount=-costo_tenant,
                    balance_after=t_locked.shipping_wallet_balance,
                    transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
                    reference_id=f"ENVIA-MOCK-{order.id:05d}",
                    description=f"Emisión de guía simulada (Costo Envia: ${cost_base} MXN + Comisión Néctar Labs: ${nectar_commission} MXN)"
                )

            order.tracking_number = f"ENVIA-{tenant.subdomain.upper()}-{order.id:05d}"
            order.tracking_url = f"https://queries.envia.com/tracking?carrier=fedex&trackingNumber={order.tracking_number}"
            order.shipping_label_pdf = "https://labels.envia.com/sample_label.pdf"
            order.shipping_cost_real = cost_base
            order.shipping_cost_tenant = costo_tenant
            order.status = "SHIPPED"
            order.save()
            return True

    # Flujo Real en Producción / Sandbox
    with transaction.atomic():
        from apps.tenants.models import Tenant
        from apps.shop.models import ShippingWalletTransaction

        t_locked = Tenant.objects.select_for_update().get(id=tenant.id)

        # Si usa cuenta maestra corporativa, validar saldo mínimo y saldo suficiente
        if using_corporate_key:
            if t_locked.shipping_wallet_balance < Decimal("250.00"):
                logger.error(f"[Logística/Envia] Saldo por debajo del mínimo de $250.00 MXN para Tenant #{tenant.id}.")
                return False

            if t_locked.shipping_wallet_balance < costo_tenant:
                logger.error(
                    f"[Logística/Envia] Saldo insuficiente para Tenant #{tenant.id}. Requiere ${costo_tenant} MXN, Disponible: ${t_locked.shipping_wallet_balance} MXN."
                )
                return False

        # Parsear carrier y service desde shipping_rate_id o campos de orden
        carrier = order.shipping_carrier_name or "fedex"
        service = order.shipping_service_name or "express"
        if order.shipping_rate_id and ":" in order.shipping_rate_id:
            parts = order.shipping_rate_id.split(":")
            carrier = parts[0]
            service = parts[1]

        # Preparar direcciones
        origin_address = {
            "name": tenant.shipping_origin_name or "Néctar Labs Bodega",
            "company": tenant.name or "Nectar Store",
            "email": getattr(tenant.owner, "email", "envios@nectarlabs.dev") if getattr(tenant, "owner", None) else "envios@nectarlabs.dev",
            "phone": tenant.shipping_origin_phone or "6621000000",
            "street": tenant.shipping_origin_street or "Av. Central 100",
            "number": "100",
            "district": tenant.shipping_origin_suburb or "Centro",
            "city": tenant.shipping_origin_city or "Hermosillo",
            "state": (tenant.shipping_origin_state or "SO")[:2].upper(),
            "postalCode": str(tenant.shipping_origin_zip_code or "83000"),
            "country": "MX"
        }

        destination_address = {
            "name": order.full_name or "Cliente",
            "company": "",
            "email": order.user_email or (order.user.email if order.user else "cliente@example.com"),
            "phone": order.phone or "6620000000",
            "street": order.street_and_number or "Calle Principal",
            "number": "1",
            "district": order.suburb or "Centro",
            "city": order.city or "Hermosillo",
            "state": (order.state or "SO")[:2].upper(),
            "postalCode": str(order.postal_code or "83000"),
            "country": (order.country or "MX")[:2].upper()
        }

        package_data = {
            "content": f"Pedido #{order.id}",
            "amount": 1,
            "type": "box",
            "weight": 1,
            "length": 25,
            "height": 15,
            "width": 20
        }

        client = EnviaClient(api_key=api_key)
        label_res = client.generate_label(
            origin=origin_address,
            destination=destination_address,
            packages=[package_data],
            carrier=carrier,
            service=service
        )

        data_list = label_res.get("data", [])
        if not data_list or not isinstance(data_list, list):
            err_msg = str(label_res.get("error") or label_res.get("message") or label_res)
            logger.error(f"[Logística/Envia] Error al emitir etiqueta para Orden #{order.id}: {err_msg}")
            order.shipping_error = err_msg
            order.save(update_fields=["shipping_error"])
            return False

        label_info = data_list[0]
        tracking_number = label_info.get("trackingNumber")
        label_url = label_info.get("label")
        shipment_id = str(label_info.get("shipmentId") or label_info.get("id") or "")
        carrier_confirmed = label_info.get("carrier") or carrier

        # Descuento definitivo en billetera
        if using_corporate_key:
            t_locked.shipping_wallet_balance -= costo_tenant
            t_locked.save(update_fields=["shipping_wallet_balance"])

            ShippingWalletTransaction.objects.create(
                tenant=t_locked,
                order=order,
                amount=-costo_tenant,
                balance_after=t_locked.shipping_wallet_balance,
                transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
                reference_id=tracking_number or shipment_id,
                description=f"Emisión de guía Envia.com #{tracking_number} (Costo Courier: ${cost_base} MXN + Comisión Néctar Labs: ${nectar_commission} MXN)"
            )

        # Actualizar Orden
        order.tracking_number = tracking_number
        order.tracking_url = f"https://queries.envia.com/tracking?carrier={carrier_confirmed}&trackingNumber={tracking_number}"
        order.shipping_label_pdf = label_url
        order.envia_shipment_id = shipment_id
        order.shipping_carrier_name = carrier_confirmed
        order.shipping_service_name = service
        order.shipping_cost_real = cost_base
        order.shipping_cost_tenant = costo_tenant
        order.status = "SHIPPED"
        order.save()

        logger.info(f"[Logística/Envia] Guía emitida con éxito para orden #{order.id}. Tracking: {tracking_number}")
        return True


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
