"""
Nectar Labs — Arquitectura Logística Multi-Proveedor Base
Define contratos, tipos y estructuras de datos normalizadas para Envia.com y Skydropx Pro.
"""

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class NormalizedRate:
    """
    Estructura homogénea de tarifa de envío para cualquier transportista/proveedor.
    """
    id: str  # Formato: '{provider_type}:{carrier}:{service}:{base_cost}:{quote_id}'
    provider: str  # Nombre comercial: FedEx, DHL, Paquetexpress, Estafeta
    carrier: str  # Identificador técnico en minúsculas: 'fedex', 'dhl', 'paquetexpress'
    service_level_name: str  # Ej: 'Express', 'Ground', 'Económico'
    days: int  # Días hábiles estimados de entrega
    amount: Decimal  # Costo base del courier (sin comisiones)
    nectar_fee: Decimal  # Comisión de plataforma de Nectar Labs ($10.00 MXN)
    tenant_cost: Decimal  # Costo total que paga el inquilino (amount + nectar_fee)
    total_amount: Decimal  # Costo final al comprador (tenant_cost * markup del tenant)
    provider_type: str  # 'ENVIA' o 'SKYDROPX'
    is_fallback: bool = False
    raw_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "carrier": self.carrier,
            "service_level_name": self.service_level_name,
            "days": self.days,
            "amount": float(self.amount),
            "nectar_fee": float(self.nectar_fee),
            "tenant_cost": float(self.tenant_cost),
            "total_amount": float(self.total_amount),
            "provider_type": self.provider_type,
            "is_fallback": self.is_fallback,
        }


@dataclass
class LabelResult:
    """
    Resultado estandarizado de la emisión de una guía oficial.
    """
    success: bool
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    label_url: Optional[str] = None
    shipment_id: Optional[str] = None
    carrier: Optional[str] = None
    service: Optional[str] = None
    cost_real: Decimal = Decimal("0.00")
    cost_tenant: Decimal = Decimal("0.00")
    provider_type: str = "ENVIA"
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = field(default_factory=dict)


class BaseShippingProvider(ABC):
    """
    Interfaz abstracta que debe implementar cualquier proveedor logístico integrado a Nectar Labs.
    """

    @abstractmethod
    def quote_rates(
        self,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> List[NormalizedRate]:
        """
        Cotiza tarifas en tiempo real con el proveedor externo.
        """
        pass

    @abstractmethod
    def generate_label(
        self,
        order,
        rate_id: str,
        origin: Dict[str, Any],
        destination: Dict[str, Any],
        packages: List[Dict[str, Any]]
    ) -> LabelResult:
        """
        Genera la guía física oficial y debita el saldo correspondiente.
        """
        pass

    @abstractmethod
    def cancel_shipment(self, carrier: str, tracking_number: str, shipment_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Solicita la anulación de la guía antes de la recolección física.
        """
        pass

    @abstractmethod
    def track_shipments(self, tracking_numbers: List[str]) -> List[Dict[str, Any]]:
        """
        Consulta el estado de rastreo actual de uno o más envíos.
        """
        pass

    @abstractmethod
    def validate_zipcode(self, country: str, zipcode: str) -> Dict[str, Any]:
        """
        Valida y resuelve los datos geográficos de un código postal.
        """
        pass
