import os
import django
import stripe
import sys

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from apps.shop.models import AddOn
from apps.sponsorship.models import SponsorshipTier

def clean_stripe():
    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not stripe_key:
        print("Error: STRIPE_SECRET_KEY no está configurada en settings.")
        sys.exit(1)

    stripe.api_key = stripe_key
    print("Conectado a Stripe de manera exitosa. Iniciando escaneo de productos...")

    # 1. Obtener los IDs válidos actualmente registrados en la Base de Datos
    active_price_ids = set()
    active_yearly_price_ids = set()
    active_addon_slugs = set()
    
    addons = AddOn.objects.all()
    for addon in addons:
        active_addon_slugs.add(addon.slug)
        if addon.stripe_price_id:
            active_price_ids.add(addon.stripe_price_id)
        if addon.stripe_yearly_price_id:
            active_yearly_price_ids.add(addon.stripe_yearly_price_id)

    active_tier_price_ids = set()
    active_tier_yearly_price_ids = set()
    
    tiers = SponsorshipTier.objects.all()
    for tier in tiers:
        if tier.stripe_price_id:
            active_tier_price_ids.add(tier.stripe_price_id)
        if tier.stripe_price_id_annual:
            active_tier_yearly_price_ids.add(tier.stripe_price_id_annual)

    # 2. Paginación de todos los productos existentes en Stripe
    print("Obteniendo lista completa de productos desde Stripe...")
    stripe_products = []
    has_more = True
    starting_after = None
    
    while has_more:
        try:
            response = stripe.Product.list(limit=100, starting_after=starting_after)
            stripe_products.extend(response.data)
            has_more = response.has_more
            if response.data:
                starting_after = response.data[-1].id
            else:
                break
        except Exception as e:
            print(f"Error al obtener productos de Stripe: {e}")
            sys.exit(1)

    print(f"Se encontraron {len(stripe_products)} productos en Stripe.")

    # 3. Analizar y procesar duplicados
    deleted_count = 0
    archived_count = 0
    skipped_count = 0

    for product in stripe_products:
        prod_id = product.id
        prod_name = product.name
        prod_metadata = product.metadata or {}
        
        # Determinar si pertenece a un Addon o a un SponsorshipTier
        is_addon = False
        is_tier = False
        
        addon_slug = prod_metadata.get("addon_slug")
        sponsorship_tier_id = prod_metadata.get("sponsorship_tier_id")
        
        # Fallback de identificación por nombre si no tiene metadatos
        if addon_slug:
            is_addon = True
        elif prod_name.startswith("[Nectar Labs Add-on]"):
            is_addon = True
            # Intentar deducir slug por nombre o usar uno genérico
            for slug in active_addon_slugs:
                if slug.replace("-", " ") in prod_name.lower():
                    addon_slug = slug
                    break
        
        if sponsorship_tier_id or prod_name.startswith("[") and "Membresía" in prod_name or "Sponsor" in prod_name:
            is_tier = True

        if not is_addon and not is_tier:
            # Producto no relacionado con Addons o Membresías, ignorar
            continue

        # Obtener los precios asociados a este producto en Stripe
        try:
            prices = stripe.Price.list(product=prod_id)
        except Exception as pe:
            print(f"Error recuperando precios de producto {prod_id}: {pe}")
            prices = MagicMock(data=[])

        # Verificar si alguno de los precios de este producto está activo en nuestra BD
        is_currently_used = False
        for price in prices.data:
            if price.id in active_price_ids or price.id in active_yearly_price_ids:
                is_currently_used = True
                break
            if price.id in active_tier_price_ids or price.id in active_tier_yearly_price_ids:
                is_currently_used = True
                break

        if is_currently_used:
            print(f"-> MANTENIENDO producto activo: '{prod_name}' (ID: {prod_id})")
            skipped_count += 1
            continue

        # El producto es un duplicado/obsoleto. Intentar eliminar o archivar.
        print(f"-> Procesando duplicado/obsoleto: '{prod_name}' (ID: {prod_id})")
        
        # Desactivar precios primero
        for price in prices.data:
            if price.active:
                try:
                    stripe.Price.modify(price.id, active=False)
                    print(f"   Precio desactivado: {price.id}")
                except Exception:
                    pass

        # Intentar eliminar producto permanentemente
        try:
            stripe.Product.delete(prod_id)
            print(f"   ELIMINADO exitosamente: '{prod_name}' (ID: {prod_id})")
            deleted_count += 1
        except stripe.error.InvalidRequestError as delete_err:
            # Si no se puede eliminar por transacciones pasadas, se archiva
            print(f"   No se pudo eliminar permanentemente ({delete_err}). Archivando...")
            try:
                stripe.Product.modify(prod_id, active=False)
                print(f"   ARCHIVADO exitosamente: '{prod_name}' (ID: {prod_id})")
                archived_count += 1
            except Exception as archive_err:
                print(f"   Error al archivar: {archive_err}")

    print("\n--- RESUMEN DE LIMPIEZA ---")
    print(f"Productos mantenidos activos: {skipped_count}")
    print(f"Productos eliminados permanentemente: {deleted_count}")
    print(f"Productos archivados (desactivados): {archived_count}")
    print("---------------------------")

if __name__ == '__main__':
    clean_stripe()
