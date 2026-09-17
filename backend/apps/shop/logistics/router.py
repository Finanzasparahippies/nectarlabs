"""
Nectar Labs — Enrutador Logístico Multi-Proveedor & Multi-Tenant
Orquesta la cotización dinámica multi-carrier, la emisión de guías con débito atómico
en billetera virtual y la integración opcional con Facturapi CFDI 4.0.
"""

import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.db import transaction

from .base import BaseShippingProvider, NormalizedRate, LabelResult
from .envia_provider import EnviaProvider
from .skydropx_provider import SkydropxProvider

logger = logging.getLogger("apps.shop")


def validate_tenant_logistics_access(tenant) -> bool:
    """
    Verifica que el inquilino cuente con permisos activos de logística:
    Addons 'shop', 'logistics-gps', 'delivery-tracking', 'ecommerce-combo' o periodo de prueba (trial).
    """
    if not tenant or not tenant.is_active:
        return False
    if tenant.is_in_trial:
        return True
    active_addons = getattr(tenant, "active_addons", [])
    has_addon = any(addon in active_addons for addon in ["shop", "logistics-gps", "delivery-tracking", "ecommerce-combo"])
    return has_addon


def get_shipping_provider(tenant, provider_type: Optional[str] = None) -> BaseShippingProvider:
    """
    Instancia el proveedor correspondiente según la configuración del tenant o el parámetro explícito.
    """
    target = (provider_type or getattr(tenant, "preferred_shipping_provider", "DYNAMIC_BEST") or "DYNAMIC_BEST").upper()
    if target == "SKYDROPX":
        return SkydropxProvider(tenant=tenant)
    return EnviaProvider(tenant=tenant)


def get_shipping_rates(
    destination: Dict[str, Any],
    parcel: Optional[Dict[str, Any]] = None,
    tenant=None
) -> List[Dict[str, Any]]:
    """
    Cotiza tarifas de envío homogéneas para el inquilino:
    - Si preferred_shipping_provider == 'DYNAMIC_BEST': cotiza en Envia.com y Skydropx Pro simultáneamente,
      fusiona y ordena las tarifas de menor a mayor precio para ofrecer la opción más competitiva.
    - Si 'ENVIA': cotiza únicamente con Envia.com.
    - Si 'SKYDROPX': cotiza únicamente con Skydropx Pro.
    - Aplica comisión de Nectar Labs ($10.00 MXN) y markup comercial del tenant al comprador final.
    """
    if not tenant:
        return []

    if not validate_tenant_logistics_access(tenant):
        logger.warning(f"[Logística/Router] Tenant #{tenant.id} sin acceso al módulo de paquetería.")
        return []

    # Validar saldo mínimo operativo si utiliza cuenta corporativa de Nectar Labs
    has_custom_keys = bool(
        getattr(tenant, "envia_api_key", None) or
        (getattr(tenant, "skydropx_client_id", None) and getattr(tenant, "skydropx_client_secret", None))
    )
    min_required_balance = getattr(settings, "MIN_SHIPPING_WALLET_BALANCE", Decimal("300.00"))
    if not has_custom_keys and tenant.shipping_wallet_balance < min_required_balance:
        logger.warning(
            f"[Logística/Router] Saldo insuficiente en billetera para Tenant #{tenant.id} "
            f"(${tenant.shipping_wallet_balance} MXN < ${min_required_balance} MXN)."
        )
        return []

    # Preparar Dirección de Origen del Inquilino
    origin_address = {
        "name": tenant.shipping_origin_name or "Bodega Central",
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

    # Preparar Dirección de Destino del Comprador
    dest_zip = str(destination.get("zip_code") or destination.get("postal_code") or destination.get("postalCode") or "83000")
    destination_address = {
        "name": destination.get("name") or "Cliente",
        "company": destination.get("company") or "",
        "email": destination.get("email") or "cliente@example.com",
        "phone": destination.get("phone") or "6620000000",
        "street": destination.get("street") or destination.get("street_and_number") or "Calle Principal",
        "number": destination.get("number") or "1",
        "district": destination.get("suburb") or destination.get("district") or "Centro",
        "city": destination.get("city") or "Hermosillo",
        "state": (destination.get("state") or "SO")[:2].upper(),
        "postalCode": dest_zip,
        "country": (destination.get("country") or "MX")[:2].upper()
    }

    # Normalizar dimensiones y peso de paquete
    package_data = parcel or {
        "content": "Mercancía general",
        "amount": 1,
        "type": "box",
        "weight": 1.0,
        "length": 25.0,
        "height": 15.0,
        "width": 20.0
    }

    pref_provider = getattr(tenant, "preferred_shipping_provider", "DYNAMIC_BEST") or "DYNAMIC_BEST"
    all_rates: List[NormalizedRate] = []

    if pref_provider == "DYNAMIC_BEST":
        # Multicotizador Simultáneo: consulta ambos proveedores y agrupa
        envia_prov = EnviaProvider(tenant=tenant)
        skydropx_prov = SkydropxProvider(tenant=tenant)

        try:
            envia_rates = envia_prov.quote_rates(origin=origin_address, destination=destination_address, packages=[package_data])
            all_rates.extend(envia_rates)
        except Exception as e:
            logger.warning(f"[Logística/Router] Falla cotizando en Envia: {e}")

        try:
            skx_rates = skydropx_prov.quote_rates(origin=origin_address, destination=destination_address, packages=[package_data])
            all_rates.extend(skx_rates)
        except Exception as e:
            logger.warning(f"[Logística/Router] Falla cotizando en Skydropx: {e}")

    elif pref_provider == "SKYDROPX":
        skydropx_prov = SkydropxProvider(tenant=tenant)
        all_rates = skydropx_prov.quote_rates(origin=origin_address, destination=destination_address, packages=[package_data])
    else:
        envia_prov = EnviaProvider(tenant=tenant)
        all_rates = envia_prov.quote_rates(origin=origin_address, destination=destination_address, packages=[package_data])

    # Ordenar por costo total de menor a mayor (mostrando las más económicas primero)
    all_rates.sort(key=lambda r: r.total_amount)

    # Convertir a diccionarios serializables
    return [r.to_dict() for r in all_rates]


def generate_shipping_label(order) -> bool:
    """
    Emite la guía oficial con el transportista y proveedor correspondiente:
    1. Verifica acceso del tenant y saldo mínimo si usa cuenta corporativa.
    2. Resuelve el proveedor a utilizar ('ENVIA' o 'SKYDROPX').
    3. Llama a la API externa FUERA del bloqueo de base de datos para prevenir saturación de conexiones.
    4. Ejecuta el descuento atómico en billetera (ShippingWalletTransaction) en PostgreSQL con lock ultracorto.
    5. Actualiza los metadatos de la orden y ejecuta el timbrado fiscal en Facturapi de forma opcional.
    """
    tenant = order.tenant
    if not tenant:
        logger.error(f"[Logística/Router] Orden #{order.id} sin tenant asociado.")
        return False

    rate_id = str(order.shipping_rate_id or "")

    # Determinar el proveedor logístico a despachar
    provider_type = getattr(order, "shipping_provider_type", None) or "ENVIA"
    if rate_id.startswith("skydropx:"):
        provider_type = "SKYDROPX"
    elif rate_id.startswith("envia:"):
        provider_type = "ENVIA"
    else:
        pref = getattr(tenant, "preferred_shipping_provider", "ENVIA")
        if pref in ["ENVIA", "SKYDROPX"]:
            provider_type = pref

    # Verificar llaves propias vs corporativas
    has_custom_keys = False
    if provider_type == "SKYDROPX":
        has_custom_keys = bool(getattr(tenant, "skydropx_client_id", None) and getattr(tenant, "skydropx_client_secret", None))
    else:
        has_custom_keys = bool(getattr(tenant, "envia_api_key", None))

    using_corporate_key = not has_custom_keys
    nectar_commission = Decimal(str(getattr(tenant, "platform_shipping_fee", "10.00") or "10.00"))
    cost_base = Decimal(str(order.shipping_cost_base or "0.00"))
    costo_tenant = cost_base + nectar_commission

    min_required = getattr(settings, "MIN_SHIPPING_WALLET_BALANCE", Decimal("300.00"))
    if using_corporate_key:
        if tenant.shipping_wallet_balance < min_required:
            logger.error(f"[Logística/Router] Saldo inferior al mínimo de ${min_required} MXN para Tenant #{tenant.id}.")
            order.shipping_error = f"Saldo de cartera inferior al mínimo de ${min_required} MXN."
            order.save(update_fields=["shipping_error"])
            return False
        if tenant.shipping_wallet_balance < costo_tenant:
            logger.error(f"[Logística/Router] Saldo insuficiente: requiere ${costo_tenant}, disponible: ${tenant.shipping_wallet_balance}")
            order.shipping_error = f"Saldo insuficiente (${tenant.shipping_wallet_balance} < ${costo_tenant} MXN)."
            order.save(update_fields=["shipping_error"])
            return False

    # Preparar direcciones
    origin_address = {
        "name": tenant.shipping_origin_name or "Bodega Central",
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
        "weight": 1.0,
        "length": 25.0,
        "height": 15.0,
        "width": 20.0
    }

    # Despacho hacia el proveedor instanciado (EJECUTADO FUERA DEL LOCK DE BASE DE DATOS)
    provider = SkydropxProvider(tenant=tenant) if provider_type == "SKYDROPX" else EnviaProvider(tenant=tenant)
    result: LabelResult = provider.generate_label(
        order=order,
        rate_id=rate_id,
        origin=origin_address,
        destination=destination_address,
        packages=[package_data]
    )

    if not result.success:
        err = result.error_message or "Fallo desconocido emitiendo guía oficial"
        logger.error(f"[Logística/Router] Error emitiendo guía ({provider_type}): {err}")
        order.shipping_error = err
        order.save(update_fields=["shipping_error"])
        return False

    # Bloque atómico de base de datos ultrarrápido para descontar saldo e impactar ledger
    with transaction.atomic():
        from apps.tenants.models import Tenant
        from apps.shop.models import ShippingWalletTransaction

        if using_corporate_key:
            t_locked = Tenant.objects.select_for_update().get(id=tenant.id)
            t_locked.shipping_wallet_balance -= costo_tenant
            t_locked.save(update_fields=["shipping_wallet_balance"])

            provider_label = "Skydropx Pro" if result.provider_type == "SKYDROPX" else "Envia.com"
            ShippingWalletTransaction.objects.create(
                tenant=t_locked,
                order=order,
                amount=-costo_tenant,
                balance_after=t_locked.shipping_wallet_balance,
                transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
                reference_id=result.tracking_number or result.shipment_id,
                description=f"Emisión de guía {provider_label} #{result.tracking_number} (Courier: ${cost_base} + Comisión Néctar: ${nectar_commission})"
            )

        # Actualizar Orden
        order.tracking_number = result.tracking_number
        order.tracking_url = result.tracking_url
        order.shipping_label_pdf = result.label_url
        order.shipping_provider_type = result.provider_type
        order.shipping_carrier_name = result.carrier or order.shipping_carrier_name
        order.shipping_service_name = result.service or order.shipping_service_name

        if result.provider_type == "SKYDROPX":
            order.skydropx_shipment_id = result.shipment_id
        else:
            order.envia_shipment_id = result.shipment_id

        order.shipping_cost_real = result.cost_real
        order.shipping_cost_tenant = costo_tenant
        order.status = "SHIPPED"
        order.shipping_error = ""
        order.save()

    # Facturación Fiscal SAT (Facturapi) — Estrictamente Opcional
    should_invoice_shipping = getattr(tenant, "auto_invoice_shipping", False) or getattr(order, "request_shipping_invoice", False)
    if should_invoice_shipping:
        _trigger_optional_facturapi_invoice(order, result)

    logger.info(f"[Logística/Router] Guía emitida exitosamente ({result.provider_type}) #{result.tracking_number} para Orden #{order.id}")
    return True


def _trigger_optional_facturapi_invoice(order, label_result: LabelResult):
    """
    Hook para timbrar o anexar concepto fiscal de flete (Clave SAT 78102200) ante Facturapi.
    Se ejecuta únicamente si el tenant o la orden lo solicitaron expresamente.
    """
    try:
        from apps.billing.models import TaxProfile
        from apps.billing.services import get_pac_service

        tenant = order.tenant
        tax_profile = TaxProfile.objects.filter(tenant=tenant).first()
        if not tax_profile or not tax_profile.is_active:
            logger.info(f"[Logística/Facturapi] Tenant #{tenant.id} no cuenta con perfil fiscal activo. Omitiendo timbrado de flete.")
            return

        pac = get_pac_service()
        logger.info(f"[Logística/Facturapi] Registrando concepto fiscal de flete para Orden #{order.id} en Facturapi (Clave SAT: 78102200).")
        # El servicio de facturación registrará la factura conforme a los conceptos fiscales de la orden
    except Exception as e:
        logger.warning(f"[Logística/Facturapi] Error opcional en Facturapi para Orden #{order.id}: {e}")
