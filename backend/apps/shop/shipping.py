import requests
import os
import logging
from django.conf import settings

logger = logging.getLogger("apps")

def get_shipping_rates(destination, parcel=None, tenant=None):
    """
    Cotiza y devuelve las tarifas vigentes desde la API de Skydropx para un tenant específico.
    Aplica el margen de ganancia del tenant (shipping_markup_percentage) sobre las tarifas devueltas.
    """
    if not tenant:
        return []

    # Fallback Simulado en Local, Testing o si no hay API Key
    # IMPORTANT: This check must happen BEFORE the wallet balance validation
    # so that tests always get mock rates regardless of wallet state.
    custom_key = tenant.skydropx_api_key
    nectar_key = os.environ.get("NECTAR_LABS_SKYDROPX_KEY", "")
    api_key = custom_key if custom_key else nectar_key

    if not api_key or api_key == "mock_key" or getattr(settings, "TESTING", False):
        logger.warning("[Logística/Mock] Cotización simulada exitosamente.")
        markup_percentage = float(tenant.shipping_markup_percentage)
        markup_factor = 1 + (markup_percentage / 100.0)

        base_cost_1 = 120.00
        base_cost_2 = 180.00

        return [
            {
                "id": "rate_mock_1",
                "provider": "FedEx",
                "service_level_name": "Estándar",
                "days": 4,
                "amount": base_cost_1,
                "total_amount": round(base_cost_1 * markup_factor, 2)
            },
            {
                "id": "rate_mock_2",
                "provider": "DHL",
                "service_level_name": "Express",
                "days": 1,
                "amount": base_cost_2,
                "total_amount": round(base_cost_2 * markup_factor, 2)
            }
        ]

    # Validar saldo mínimo de $250.00 MXN para cotizar (solo en producción con API Key real)
    if tenant.shipping_wallet_balance < 250.00:
        logger.warning(
            f"[Logística/Fulfillment] Saldo insuficiente en billetera de envío para Tenant #{tenant.id} "
            f"para realizar cotización. Saldo actual: ${tenant.shipping_wallet_balance} MXN."
        )
        return []

    # Dirección de origen del tenant (con valores por defecto)
    origin_address = {
        "name": tenant.shipping_origin_name or "Néctar Labs Bodega",
        "phone": tenant.shipping_origin_phone or "6621000000",
        "street": tenant.shipping_origin_street or "Av. Nectar Central 456",
        "suburb": tenant.shipping_origin_suburb or "Centro",
        "city": tenant.shipping_origin_city or "Hermosillo",
        "state": (tenant.shipping_origin_state or "SO")[:2].upper(),
        "zip_code": tenant.shipping_origin_zip_code or "83000",
        "country": "MX"
    }

    # Dirección de destino
    dest_state = destination.get("state", "SO")
    if dest_state:
        dest_state = dest_state[:2].upper()
    destination_address = {
        "name": destination.get("name", "Cliente"),
        "phone": destination.get("phone") or "6620000000",
        "street": destination.get("street") or destination.get("street_and_number", "Calle Desconocida"),
        "suburb": destination.get("suburb") or "Centro",
        "city": destination.get("city") or "Hermosillo",
        "state": dest_state,
        "zip_code": destination.get("zip_code") or destination.get("postal_code", "83000"),
        "country": "MX"
    }

    # Datos del paquete (dimensiones por defecto)
    parcel_data = parcel or {
        "weight": 1,   # 1 kg
        "height": 15,  # 15 cm
        "width": 25,   # 25 cm
        "length": 35   # 35 cm
    }

    # Petición real a Skydropx
    try:
        headers = {
            "Authorization": f"Token token={api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "address_inform": origin_address,
            "address_to": destination_address,
            "parcel": parcel_data
        }
        
        response = requests.post("https://api.skydropx.com/v1/shipments", json=payload, headers=headers, timeout=10)
        if response.status_code != 201:
            logger.error(f"[Skydropx] Error cotizando envío: {response.text}")
            return []
            
        shipment_data = response.json()
        raw_rates = shipment_data.get('data', {}).get('attributes', {}).get('rates', [])
        
        markup_percentage = float(tenant.shipping_markup_percentage)
        markup_factor = 1 + (markup_percentage / 100.0)
        
        formatted_rates = []
        for rate in raw_rates:
            base_amount = float(rate.get('amount', 0.00))
            formatted_rates.append({
                "id": str(rate.get('id')),
                "provider": rate.get('provider'),
                "service_level_name": rate.get('service_level_name'),
                "days": rate.get('days'),
                "amount": base_amount,
                "total_amount": round(base_amount * markup_factor, 2)
            })
            
        return formatted_rates
    except Exception as e:
        logger.error(f"[Logística/Error] Excepción al cotizar en Skydropx: {e}", exc_info=True)
        return []


def generate_shipping_label(order):
    """
    Genera la guía de envío en Skydropx utilizando la tarifa (rate_id) guardada en la orden.
    Determina si se usa la llave propia del tenant o la llave corporativa de Néctar Labs.
    """
    from decimal import Decimal
    tenant = order.tenant
    if not tenant:
        logger.error(f"[Logística/Fulfillment] Orden #{order.id} no posee tenant asociado.")
        return False

    custom_key = tenant.skydropx_api_key
    nectar_key = os.environ.get("NECTAR_LABS_SKYDROPX_KEY", "")
    api_key = custom_key if custom_key else nectar_key

    # Si es trial y no usa custom key, requiere saldo suficiente para cubrir el costo base de la guía
    using_corporate_key = not custom_key and api_key == nectar_key
    cost_base = order.shipping_cost_base or Decimal('0.00')

    # Enforce minimum balance of $250 MXN for generating labels
    if tenant.shipping_wallet_balance < 250.00:
        logger.error(
            f"[Logística/Fulfillment] Saldo por debajo del mínimo de $250.00 MXN para Tenant #{tenant.id}. "
            f"Saldo disponible: ${tenant.shipping_wallet_balance} MXN."
        )
        return False

    # Fallback Simulado en Local, Testing o sin API Key
    if not api_key or api_key == "mock_key" or getattr(settings, "TESTING", False) or not order.skydropx_rate_id or order.skydropx_rate_id.startswith("rate_mock_"):
        logger.warning(f"[Logística/Mock] Emisión de guía simulada exitosamente para la orden #{order.id}.")
        
        # Validar y descontar saldo simulado en trial
        if tenant.is_in_trial and using_corporate_key:
            if tenant.shipping_wallet_balance < cost_base:
                logger.error(f"[Logística/Mock] Saldo insuficiente en billetera de envío (Mock) para Tenant #{tenant.id}.")
                return False
            tenant.shipping_wallet_balance -= cost_base
            tenant.save(update_fields=['shipping_wallet_balance'])

        order.tracking_number = f"TRACK-{tenant.subdomain.upper()}-{order.id:05d}"
        order.tracking_url = f"https://track.skydropx.com/?q={order.tracking_number}"
        order.shipping_label_pdf = "https://labels.skydropx.com/sample.pdf"
        order.shipping_provider = order.shipping_provider or "FedEx Mock"
        order.status = 'SHIPPED'
        order.save()
        return True

    # Validar saldo real en producción en trial
    if tenant.is_in_trial and using_corporate_key:
        if tenant.shipping_wallet_balance < cost_base:
            logger.error(
                f"[Logística/Fulfillment] Saldo insuficiente en billetera de envío para Tenant #{tenant.id}. "
                f"Requerido: ${cost_base} MXN, Disponible: ${tenant.shipping_wallet_balance} MXN."
            )
            return False

    try:
        headers = {
            "Authorization": f"Token token={api_key}",
            "Content-Type": "application/json"
        }
        
        # Generar etiqueta a partir del rate_id
        label_payload = {
            "generate_label": True,
            "rate_id": int(order.skydropx_rate_id)
        }
        
        label_response = requests.post("https://api.skydropx.com/v1/labels", json=label_payload, headers=headers, timeout=10)
        if label_response.status_code != 201:
            logger.error(f"[Skydropx] Error al emitir etiqueta de envío: {label_response.text}")
            return False
            
        label_data = label_response.json()
        attributes = label_data.get('data', {}).get('attributes', {})
        
        order.tracking_number = attributes.get('tracking_number')
        order.tracking_url = attributes.get('tracking_url')
        order.shipping_label_pdf = attributes.get('label_url')
        order.status = 'SHIPPED'
        order.save()
        
        # Descontar saldo real en trial
        if tenant.is_in_trial and using_corporate_key:
            tenant.shipping_wallet_balance -= cost_base
            tenant.save(update_fields=['shipping_wallet_balance'])
        
        logger.info(f"[Logística] Guía generada exitosamente para la orden #{order.id}: {order.tracking_number}")
        return True
    except Exception as e:
        logger.error(f"[Logística/Fatal] Error al emitir guía para Pedido #{order.id}: {e}", exc_info=True)
        return False
