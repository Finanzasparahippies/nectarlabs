from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

# Import models
from apps.shop.models import Contract, Order, AddOnSubscription
from apps.dashboard.models import ServerCost, BusinessExpense

# ------------------------------------------------------------------------------
# SEÑALES DE SISTEMA - INVALIDACIÓN DE CACHÉ DE MÉTRICAS (REDIS)
# Este módulo monitorea mutaciones en base de datos de modelos clave (Facturación,
# Ventas, Gastos y Costos) para borrar el caché consolidado de métricas en Redis.
# Garantiza que el dashboard de administración siempre presente datos actualizados.
# ------------------------------------------------------------------------------

CACHE_KEY = 'business_stats_data'

def invalidate_business_stats_cache(sender, instance, **kwargs):
    """
    Función callback de la señal. Al detectar cualquier inserción, actualización
    o borrado en las tablas de negocio, elimina la clave 'business_stats_data' de Redis.
    La siguiente petición al dashboard de negocio recalculará las métricas desde la DB.
    """
    print(f"[Cache] Invalidando cache '{CACHE_KEY}' debido a cambios en {sender.__name__}")
    cache.delete(CACHE_KEY)

# ------------------------------------------------------------------------------
# CONEXIÓN DINÁMICA DE SEÑALES
# Conecta la función de invalidación a los eventos post_save (crear/actualizar)
# y post_delete (eliminar) de todos los modelos críticos de finanzas y hosting.
# ------------------------------------------------------------------------------
for model in [Contract, Order, ServerCost, BusinessExpense, AddOnSubscription]:
    post_save.connect(invalidate_business_stats_cache, sender=model)
    post_delete.connect(invalidate_business_stats_cache, sender=model)
