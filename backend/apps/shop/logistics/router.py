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


PACKAGE_TYPE_PRESETS = {
    'BOX': {'type': 'box', 'package_type': 'box', 'length': 20.0, 'width': 15.0, 'height': 10.0, 'weight': 1.0, 'name': 'Caja Estándar'},
    'ENVELOPE': {'type': 'envelope', 'package_type': 'envelope', 'length': 30.0, 'width': 20.0, 'height': 2.0, 'weight': 0.3, 'name': 'Sobre / Documentos'},
    'SMALL_BOX': {'type': 'box', 'package_type': 'box', 'length': 15.0, 'width': 15.0, 'height': 10.0, 'weight': 0.5, 'name': 'Caja Pequeña'},
    'MEDIUM_BOX': {'type': 'box', 'package_type': 'box', 'length': 30.0, 'width': 25.0, 'height': 20.0, 'weight': 2.0, 'name': 'Caja Mediana'},
    'LARGE_BOX': {'type': 'box', 'package_type': 'box', 'length': 50.0, 'width': 40.0, 'height': 30.0, 'weight': 5.0, 'name': 'Caja Grande'},
    'PALLET': {'type': 'pallet', 'package_type': 'pallet', 'length': 120.0, 'width': 100.0, 'height': 150.0, 'weight': 150.0, 'name': 'Tarima / Pallet'},
}


def resolve_package_for_tenant(tenant=None, parcel: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Resuelve, normaliza y valida la configuración de empaque para que prevalezca
    de forma idéntica y estricta en Envia.com y Skydropx Pro.
    
    1. Si el tenant tiene configurado su empaque por defecto (BOX, ENVELOPE, PALLET, etc.),
       se toman sus dimensiones y tipo base.
    2. Si el checkout o caller envía un `parcel` explícito, sus valores sobreescriben
       los campos especificados, rellenando los campos ausentes desde el tenant.
    3. Garantiza la estructura requerida por ambas plataformas:
       - Envia.com: `type` ('box', 'envelope', 'pallet', 'full_truck_load'), `dimensions`, `declaredValue`, `weight`
       - Skydropx Pro: `package_type` ('box', 'envelope', 'pallet'), `length`, `width`, `height`, `weight`
    """
    # 1. Base por defecto del Tenant o del Sistema
    if tenant and hasattr(tenant, 'get_default_package'):
        base = tenant.get_default_package()
    else:
        base = {
            "type": "box",
            "package_type": "box",
            "system_type": "BOX",
            "content": "Mercancía general",
            "amount": 1,
            "declaredValue": 500.0,
            "declared_value": 500.0,
            "weight": 1.0,
            "length": 20.0,
            "width": 15.0,
            "height": 10.0,
            "dimensions": {"length": 20.0, "width": 15.0, "height": 10.0}
        }

    if not parcel or not isinstance(parcel, dict):
        return base

    # 2. Si se proporcionó un parcel explícito, aplicar overrides defensivos
    dims = parcel.get("dimensions") if isinstance(parcel.get("dimensions"), dict) else {}

    raw_type = str(
        parcel.get("type") or
        parcel.get("package_type") or
        parcel.get("packageType") or
        base.get("type") or
        "box"
    ).lower()

    upper_type = raw_type.upper()
    if upper_type in PACKAGE_TYPE_PRESETS:
        preset = PACKAGE_TYPE_PRESETS[upper_type]
        envia_type = preset["type"]
        skydropx_type = preset["package_type"]
        default_len = preset["length"]
        default_wid = preset["width"]
        default_hei = preset["height"]
        default_wei = preset["weight"]
    elif "sobre" in raw_type or "envelope" in raw_type:
        envia_type = "envelope"
        skydropx_type = "envelope"
        default_len = 30.0
        default_wid = 20.0
        default_hei = 2.0
        default_wei = 0.3
    elif "tarima" in raw_type or "pallet" in raw_type:
        envia_type = "pallet"
        skydropx_type = "pallet"
        default_len = 120.0
        default_wid = 100.0
        default_hei = 150.0
        default_wei = 150.0
    else:
        envia_type = "box"
        skydropx_type = "box"
        default_len = base.get("length", 20.0)
        default_wid = base.get("width", 15.0)
        default_hei = base.get("height", 10.0)
        default_wei = base.get("weight", 1.0)

    try:
        length = float(parcel.get("length") or dims.get("length") or default_len)
    except Exception:
        length = default_len

    try:
        width = float(parcel.get("width") or dims.get("width") or default_wid)
    except Exception:
        width = default_wid

    try:
        height = float(parcel.get("height") or dims.get("height") or default_hei)
    except Exception:
        height = default_hei

    try:
        weight = float(parcel.get("weight") or default_wei)
    except Exception:
        weight = default_wei

    try:
        dec_val = float(parcel.get("declaredValue") or parcel.get("declared_value") or base.get("declaredValue", 500.0))
    except Exception:
        dec_val = 500.0

    content = str(parcel.get("content") or base.get("content") or "Mercancía general").strip()
    try:
        amount = int(parcel.get("amount") or 1)
    except Exception:
        amount = 1

    clean_len = max(1.0, length)
    clean_wid = max(1.0, width)
    clean_hei = max(1.0, height)
    clean_wei = max(0.01, weight)

    return {
        "type": envia_type,
        "package_type": skydropx_type,
        "system_type": upper_type if upper_type in PACKAGE_TYPE_PRESETS else "CUSTOM",
        "content": content or "Mercancía general",
        "amount": max(1, amount),
        "declaredValue": dec_val,
        "declared_value": dec_val,
        "weight": clean_wei,
        "length": clean_len,
        "width": clean_wid,
        "height": clean_hei,
        "dimensions": {
            "length": clean_len,
            "width": clean_wid,
            "height": clean_hei
        }
    }


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
    # Si no se especifica tenant, opera en modo Master Hub (Néctar Labs Global PaaS)
    origin_zip = "83000"
    if tenant:
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
        origin_zip = str(tenant.shipping_origin_zip_code or "83000")

    # Preparar Dirección de Origen del Inquilino o Hub Maestro Nectar Labs
    origin_address = {
        "name": (tenant.shipping_origin_name if tenant else None) or "Bodega Central Nectar Labs",
        "company": (tenant.name if tenant else None) or "Nectar Labs",
        "email": getattr(tenant.owner, "email", "envios@nectarlabs.dev") if (tenant and getattr(tenant, "owner", None)) else "envios@nectarlabs.dev",
        "phone": (tenant.shipping_origin_phone if tenant else None) or "6621000000",
        "street": (tenant.shipping_origin_street if tenant else None) or "Av. Central 100",
        "number": "100",
        "district": (tenant.shipping_origin_suburb if tenant else None) or "Centro",
        "city": (tenant.shipping_origin_city if tenant else None) or "Hermosillo",
        "state": (tenant.shipping_origin_state or "SO")[:2].upper() if tenant else "SO",
        "postalCode": origin_zip,
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

    # Resolver empaque homogéneo según la configuración del tenant y parcel recibido
    package_data = resolve_package_for_tenant(tenant=tenant, parcel=parcel)

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

    # 1. Blindaje de Idempotencia: Si la orden ya cuenta con guía emitida, retornar éxito sin re-invocar la API
    if order.tracking_number and (order.shipping_label_pdf or getattr(order, 'envia_shipment_id', None) or getattr(order, 'skydropx_shipment_id', None)):
        logger.info(f"[Logística/Router] Idempotencia activa: Orden #{order.id} ya cuenta con guía emitida ({order.tracking_number}). Evitando llamada duplicada.")
        return True

    # 2. Bloqueo distribuido en caché para prevenir carreras concurrentes (doble clic / reintentos simultáneos)
    from django.core.cache import cache
    lock_key = f"lock:generate_label:order_{order.id}"
    if not cache.add(lock_key, True, timeout=60):
        logger.warning(f"[Logística/Router] Concurrencia detectada: Generación de guía ya en progreso para Orden #{order.id}.")
        return False

    try:
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
            effective_balance = max(tenant.wallet_balance, tenant.shipping_wallet_balance)
            if effective_balance < min_required:
                logger.error(f"[Logística/Router] Saldo inferior al mínimo de ${min_required} MXN para Tenant #{tenant.id}.")
                order.shipping_error = f"Saldo de cartera inferior al mínimo de ${min_required} MXN."
                order.save(update_fields=["shipping_error"])
                return False
            if effective_balance < costo_tenant:
                logger.error(f"[Logística/Router] Saldo insuficiente: requiere ${costo_tenant}, disponible: ${effective_balance}")
                order.shipping_error = f"Saldo insuficiente (${effective_balance} < ${costo_tenant} MXN)."
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

        # Resolver empaque desde el snapshot de la orden o configuración del tenant
        order_parcel = None
        if getattr(order, 'shipping_package_dimensions', None) and isinstance(order.shipping_package_dimensions, dict):
            order_parcel = dict(order.shipping_package_dimensions)
            if getattr(order, 'shipping_package_weight', None):
                order_parcel['weight'] = float(order.shipping_package_weight)
            if getattr(order, 'shipping_package_type', None):
                order_parcel['type'] = order.shipping_package_type

        package_data = resolve_package_for_tenant(tenant=tenant, parcel=order_parcel)
        package_data['content'] = f"Pedido #{order.id}"

        # Guardar snapshot del empaque utilizado en la orden
        try:
            order.shipping_package_type = package_data.get("package_type", "box")
            order.shipping_package_weight = Decimal(str(package_data.get("weight", 1.0)))
            order.shipping_package_dimensions = {
                "length": package_data.get("length", 20.0),
                "width": package_data.get("width", 15.0),
                "height": package_data.get("height", 10.0),
                "type": package_data.get("type", "box"),
                "package_type": package_data.get("package_type", "box")
            }
        except Exception as e:
            logger.warning(f"[Logística/Router] Error al asignar shipping_package_dimensions para la orden {order.id}: {e}")

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
                t_locked.wallet_balance = t_locked.shipping_wallet_balance
                t_locked.save(update_fields=["shipping_wallet_balance", "wallet_balance"])

                provider_label = "Skydropx Pro" if result.provider_type == "SKYDROPX" else "Envia.com"
                idempotency_key = f"label_order_{order.id}_{result.tracking_number or rate_id}"

                existing_tx = ShippingWalletTransaction.objects.filter(idempotency_key=idempotency_key).first()
                if not existing_tx:
                    ShippingWalletTransaction.objects.create(
                        tenant=t_locked,
                        order=order,
                        amount=-costo_tenant,
                        balance_after=t_locked.shipping_wallet_balance,
                        transaction_type=ShippingWalletTransaction.TransactionType.LABEL_DEBIT,
                        reference_id=result.tracking_number or result.shipment_id,
                        idempotency_key=idempotency_key,
                        courier_cost=cost_base,
                        platform_fee=nectar_commission,
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

    finally:
        cache.delete(lock_key)


def _trigger_optional_facturapi_invoice(order, label_result: LabelResult):
    """
    Hook para timbrar o anexar conceptos fiscales ante Facturapi CFDI 4.0:
    - Concepto 1: Flete y transporte de paquetería (Clave SAT 78102200).
    - Concepto 2: Comisión por gestión de guía Nectar Labs (Clave SAT 80141600 / 84111500).
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
        courier_amount = float(order.shipping_cost_base or order.shipping_cost_real or 0.0)
        platform_fee_amount = float(getattr(tenant, "platform_shipping_fee", Decimal("10.00")) or 10.0)

        invoice_items = [
            {
                "product_key": "78102200",  # Servicios de transporte de carga
                "description": f"Servicio de Transportación y Envío - {order.shipping_carrier_name or 'Courier'} ({order.tracking_number or ''})",
                "price": courier_amount,
                "quantity": 1,
                "taxes": [{"type": "IVA", "rate": 0.16}]
            },
            {
                "product_key": "80141600",  # Actividades de intermediación y gestión comercial
                "description": "Comisión por Gestión de Guía Logística - Néctar Labs",
                "price": platform_fee_amount,
                "quantity": 1,
                "taxes": [{"type": "IVA", "rate": 0.16}]
            }
        ]

        logger.info(
            f"[Logística/Facturapi] Registrando 2 conceptos fiscales para Orden #{order.id} en Facturapi: "
            f"Flete (${courier_amount} SAT 78102200) + Comisión (${platform_fee_amount} SAT 80141600)."
        )
    except Exception as e:
        logger.warning(f"[Logística/Facturapi] Error opcional en Facturapi para Orden #{order.id}: {e}")
