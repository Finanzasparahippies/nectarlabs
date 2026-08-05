"""
Módulo de cálculo de comisiones de Stripe para Nectar-Labs.

En Nectar-Labs, la comisión de procesamiento de Stripe es absorbida
directamente en el costo base del producto/plan.

Tarifas de referencia Stripe México:
  - Nacional: 3.6% + $3.00 MXN + 16% IVA sobre la comisión
    Tasa efectiva: 4.176% + $3.48 MXN
  - Internacional: 4.4% + $3.00 MXN + 16% IVA sobre la comisión
    Tasa efectiva: 5.104% + $3.48 MXN
"""

from typing import Dict, Any

STRIPE_PCT_FEE_DOMESTIC: float = 0.036
STRIPE_PCT_FEE_INTL: float = 0.044
STRIPE_FLAT_FEE: float = 3.00
STRIPE_IVA_RATE: float = 0.16

EFFECTIVE_PCT_DOMESTIC: float = round(STRIPE_PCT_FEE_DOMESTIC * (1 + STRIPE_IVA_RATE), 5)  # 0.04176
EFFECTIVE_PCT_INTL: float = round(STRIPE_PCT_FEE_INTL * (1 + STRIPE_IVA_RATE), 5)          # 0.05104
EFFECTIVE_FLAT_FEE: float = round(STRIPE_FLAT_FEE * (1 + STRIPE_IVA_RATE), 2)              # $3.48 MXN


def calculate_absorbed_fee(total_amount: float, is_international: bool = False) -> Dict[str, float]:
    """
    Calcula el desglose interno de la comisión retenida por Stripe y el valor neto 
    obtenido por Nectar-Labs cuando el precio exhibido al cliente absorbe la comisión.
    """
    if total_amount <= 0:
        return {
            "total_charged": 0.0,
            "stripe_fee": 0.0,
            "net_revenue": 0.0,
        }

    total: float = round(float(total_amount), 2)
    pct_fee: float = EFFECTIVE_PCT_INTL if is_international else EFFECTIVE_PCT_DOMESTIC

    stripe_fee: float = round((total * pct_fee) + EFFECTIVE_FLAT_FEE, 2)
    net_revenue: float = round(total - stripe_fee, 2)

    return {
        "total_charged": total,
        "stripe_fee": stripe_fee,
        "net_revenue": net_revenue,
    }
