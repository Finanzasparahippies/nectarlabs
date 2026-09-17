"""
Nectar Labs — Paquete de Logística y Envíos Multi-Tenant
Soporta Envia.com, Skydropx Pro y cotización dinámica multi-carrier.
"""

from .base import (
    BaseShippingProvider,
    NormalizedRate,
    LabelResult,
)
from .envia_provider import EnviaProvider
from .skydropx_provider import SkydropxProvider
from .router import (
    get_shipping_provider,
    get_shipping_rates,
    generate_shipping_label,
    validate_tenant_logistics_access,
    resolve_package_for_tenant,
    PACKAGE_TYPE_PRESETS,
)

__all__ = [
    "BaseShippingProvider",
    "NormalizedRate",
    "LabelResult",
    "EnviaProvider",
    "SkydropxProvider",
    "get_shipping_provider",
    "get_shipping_rates",
    "generate_shipping_label",
    "validate_tenant_logistics_access",
    "resolve_package_for_tenant",
    "PACKAGE_TYPE_PRESETS",
]
