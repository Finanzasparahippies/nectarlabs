from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

# Import models
from apps.shop.models import Contract, Order, AddOnSubscription
from apps.dashboard.models import ServerCost, BusinessExpense

CACHE_KEY = 'business_stats_data'

def invalidate_business_stats_cache(sender, instance, **kwargs):
    print(f"[Cache] Invalidando cache '{CACHE_KEY}' debido a cambios en {sender.__name__}")
    cache.delete(CACHE_KEY)

# Connect signals
for model in [Contract, Order, ServerCost, BusinessExpense, AddOnSubscription]:
    post_save.connect(invalidate_business_stats_cache, sender=model)
    post_delete.connect(invalidate_business_stats_cache, sender=model)
