"""
Nectar Labs — Adaptador de Logística Envia.com
Implementa BaseShippingProvider para Envia.com API v1.
"""

import logging
import unicodedata
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.conf import settings
from .base import BaseShippingProvider, NormalizedRate, LabelResult

logger = logging.getLogger("apps.shop")


def _clean_envia_str(val: Any) -> str:
    """Normaliza texto removiendo tildes para compatibilidad con Envia.com."""
    if not isinstance(val, str):
        return str(val) if val is not None else ""
    nfkd = unicodedata.normalize("NFKD", val)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).strip()


class EnviaProvider(BaseShippingProvider):
    """
    Proveedor logístico para Envia.com multi-carrier (FedEx, DHL, Estafeta, Paquetexpress, UPS, etc.)
    """

    def __init__(self, tenant=None, api_key: Optional[str] = None):
        self.tenant = tenant
        from apps.shop.shipping import (
            EnviaClient,
            get_envia_master_token,
            is_envia_production
        )
        custom_key = getattr(tenant, "envia_api_key", None) if tenant else None
        self.api_key = api_key or custom_key or get_envia_master_token()
        self.is_production = is_envia_production()
        self.client = EnviaClient(api_key=self.api_key)

        # Comisiones y márgenes
        self.nectar_fee = Decimal(str(getattr(tenant, "platform_shipping_fee", "10.00") or "10.00")) if tenant else Decimal("10.00")
        markup = Decimal(str(getattr(tenant, "shipping_markup_percentage", "15.00") or "15.00")) if tenant else Decimal("15.00")
        self.markup_factor = Decimal("1.00") + (markup / Decimal("100.00"))

    @property
    def is_mock(self) -> bool:
        return bool(
            not self.api_key or
            self.api_key in ["mock_key", ""] or
            getattr(settings, "TESTING", False)
        )

    def quote_rates(
        self,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> List[NormalizedRate]:
        """Cotiza tarifas en Envia.com y las normaliza a NormalizedRate."""
        if self.is_mock:
            mock_base_1 = Decimal("115.00")
            mock_base_2 = Decimal("175.00")
            tenant_cost_1 = mock_base_1 + self.nectar_fee
            tenant_cost_2 = mock_base_2 + self.nectar_fee
            buyer_1 = round(tenant_cost_1 * self.markup_factor, 2)
            buyer_2 = round(tenant_cost_2 * self.markup_factor, 2)

            return [
                NormalizedRate(
                    id=f"envia:fedex:ground:{mock_base_1}",
                    provider="FedEx",
                    carrier="fedex",
                    service_level_name="FedEx Ground",
                    days=3,
                    amount=mock_base_1,
                    nectar_fee=self.nectar_fee,
                    tenant_cost=tenant_cost_1,
                    total_amount=buyer_1,
                    provider_type="ENVIA",
                    is_fallback=True
                ),
                NormalizedRate(
                    id=f"envia:dhl:express:{mock_base_2}",
                    provider="DHL Express",
                    carrier="dhl",
                    service_level_name="Express Domestic",
                    days=1,
                    amount=mock_base_2,
                    nectar_fee=self.nectar_fee,
                    tenant_cost=tenant_cost_2,
                    total_amount=buyer_2,
                    provider_type="ENVIA",
                    is_fallback=True
                )
            ]

        raw_rates = self.client.quote_rates(origin=origin, destination=destination, packages=packages)
        normalized: List[NormalizedRate] = []

        for r in raw_rates:
            base_cost = Decimal(str(r.get("totalPrice") or r.get("price") or "0.00"))
            if base_cost <= Decimal("0.00"):
                continue

            carrier_slug = str(r.get("carrier") or "courier").lower()
            carrier_name = carrier_slug.capitalize()
            service_name = str(r.get("service") or "Standard")
            rate_id = f"envia:{carrier_slug}:{service_name}:{base_cost}"

            tenant_cost = base_cost + self.nectar_fee
            buyer_cost = round(tenant_cost * self.markup_factor, 2)

            # Robust parsing of deliveryEstimate / deliveryDays (handles dict, str, int)
            deliv_est = r.get("deliveryEstimate")
            days_val = None
            if isinstance(deliv_est, dict):
                days_val = deliv_est.get("days")
            elif isinstance(deliv_est, (int, float)):
                days_val = deliv_est
            elif isinstance(deliv_est, str):
                first_num = ''.join([c for c in deliv_est.split()[0] if c.isdigit()])
                days_val = int(first_num) if first_num else None

            if not days_val:
                days_val = r.get("deliveryDays")

            try:
                days = int(days_val or 3)
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
                    provider_type="ENVIA",
                    is_fallback=False,
                    raw_data=r
                )
            )

        return normalized

    def generate_label(
        self,
        order,
        rate_id: str,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> LabelResult:
        """Genera la guía física en Envia.com."""
        carrier = "fedex"
        service = "express"
        cost_base = Decimal(str(order.shipping_cost_base or "0.00"))

        if rate_id and ":" in rate_id:
            parts = rate_id.split(":")
            if len(parts) >= 3:
                # Format: envia:carrier:service:price
                carrier = parts[1]
                service = parts[2]
                if len(parts) >= 4 and cost_base == Decimal("0.00"):
                    try:
                        cost_base = Decimal(parts[3])
                    except Exception:
                        pass

        if self.is_mock:
            cost_tenant = cost_base + self.nectar_fee
            subdomain = order.tenant.subdomain.upper() if order.tenant else "STORE"
            tracking = f"ENVIA-{subdomain}-{order.id:05d}"
            return LabelResult(
                success=True,
                tracking_number=tracking,
                tracking_url=f"https://queries.envia.com/tracking?carrier={carrier}&trackingNumber={tracking}",
                label_url="https://labels.envia.com/sample_label.pdf",
                shipment_id=f"ENVIA-MOCK-{order.id:05d}",
                carrier=carrier,
                service=service,
                cost_real=cost_base,
                cost_tenant=cost_tenant,
                provider_type="ENVIA"
            )

        label_res = self.client.generate_label(
            origin=origin,
            destination=destination,
            packages=packages,
            carrier=carrier,
            service=service
        )

        data_list = label_res.get("data", [])
        if not data_list or not isinstance(data_list, list):
            err = str(label_res.get("error") or label_res.get("message") or label_res)
            logger.error(f"[EnviaProvider] Error generando guía orden #{order.id}: {err}")
            return LabelResult(success=False, error_message=err, provider_type="ENVIA", raw_response=label_res)

        info = data_list[0]
        tracking_number = info.get("trackingNumber")
        label_url = info.get("label")
        shipment_id = str(info.get("shipmentId") or info.get("id") or "")
        carrier_confirmed = info.get("carrier") or carrier
        cost_tenant = cost_base + self.nectar_fee

        return LabelResult(
            success=True,
            tracking_number=tracking_number,
            tracking_url=f"https://queries.envia.com/tracking?carrier={carrier_confirmed}&trackingNumber={tracking_number}",
            label_url=label_url,
            shipment_id=shipment_id,
            carrier=carrier_confirmed,
            service=service,
            cost_real=cost_base,
            cost_tenant=cost_tenant,
            provider_type="ENVIA",
            raw_response=info
        )

    def cancel_shipment(self, carrier: str, tracking_number: str, shipment_id: Optional[str] = None) -> Dict[str, Any]:
        return self.client.cancel_shipment(carrier=carrier, tracking_number=tracking_number)

    def track_shipments(self, tracking_numbers: List[str]) -> List[Dict[str, Any]]:
        return self.client.track_shipments(tracking_numbers=tracking_numbers)

    def validate_zipcode(self, country: str, zipcode: str) -> Dict[str, Any]:
        return self.client.validate_zipcode(country=country, zipcode=zipcode)
