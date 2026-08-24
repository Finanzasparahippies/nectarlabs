import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.tenants.models import Tenant
from apps.users.models import User
from apps.shop.models import Product, Order, OrderItem
from decimal import Decimal

def seed_kores_tenant():
    # 1. User owner fallback
    owner = User.objects.filter(is_superuser=True).first()
    if not owner:
        owner = User.objects.filter(role='ADMIN').first()
    if not owner:
        owner = User.objects.create_user(
            email="kores.admin@nectarlabs.dev",
            password="KoresSecurePassword2026!",
            first_name="Kōres",
            last_name="Luxury",
            is_staff=True,
            is_superuser=True
        )
        print("Created admin user for Kōres tenant.")

    # 2. Provision Tenant
    tenant, created = Tenant.objects.get_or_create(
        subdomain="kores",
        defaults={
            "name": "Kōres Premium Hair Ties",
            "owner": owner,
            "theme_color": "#C5A880",       # Champagne Gold Primary
            "accent_color": "#EADCD6",      # Nude Velvet Accent
            "bg_color": "#121110",          # Dark Canvas
            "card_bg_color": "#1C1A18",     # Card Background
            "text_color": "#FDFBF7",        # Silk Ivory Text
            "border_color": "#2A2724",      # Fine Border
            "theme_color_light": "#C5A880",
            "accent_color_light": "#EADCD6",
            "bg_color_light": "#FDFBF7",
            "card_bg_color_light": "#FFFFFF",
            "text_color_light": "#1A1918",
            "border_color_light": "#E8E5DF",
            "portal_title": "Kōres | Minimalist Luxury Hair Ties",
            "welcome_message": "Descubre la elegancia sin esfuerzo con nuestras ligas de seda Mulberry y acabados prémium.",
            "custom_frontend_url": "http://localhost:3005",
            "custom_backend_url": "http://localhost:8000/api",
        }
    )

    if not created:
        tenant.name = "Kōres Premium Hair Ties"
        tenant.theme_color = "#C5A880"
        tenant.accent_color = "#EADCD6"
        tenant.bg_color_light = "#FDFBF7"
        tenant.text_color_light = "#1A1918"
        tenant.save()

    print(f"Tenant '{tenant.name}' provisioned. Subdomain: {tenant.subdomain}. API Key: {tenant.api_key}")

    # 3. Provision Minimalist Luxury Product Catalog
    products_data = [
        {
            "name": "Silk Scrunchie Grande - Champagne",
            "description": "Elaborada en 100% Seda Mulberry de 22 Momme. Protege el cabello reduciendo el quiebre y evitando marcas no deseadas.",
            "price": Decimal("390.00"),
            "stock": 45
        },
        {
            "name": "Pack Trio Seamless Hair Ties - Obsidian Black",
            "description": "Ligas sin costuras de sujeción firme y elasticidad de alta durabilidad. Acabado mate impecable.",
            "price": Decimal("280.00"),
            "stock": 100
        },
        {
            "name": "Leather Ponytail Cuff - Saddle Tan",
            "description": "Broche de cuero genuino hecho a mano con cierre magnético discreto para colas de caballo estructuradas.",
            "price": Decimal("520.00"),
            "stock": 20
        },
        {
            "name": "Velvet Hair Ribbon - Rose Nude",
            "description": "Cinta de terciopelo suave importada de Francia. El toque final distinguido para cualquier peinado.",
            "price": Decimal("340.00"),
            "stock": 35
        }
    ]

    for p_info in products_data:
        prod, p_created = Product.objects.get_or_create(
            tenant=tenant,
            name=p_info["name"],
            defaults={
                "description": p_info["description"],
                "price": p_info["price"],
                "stock": p_info["stock"]
            }
        )
        if not p_created:
            prod.price = p_info["price"]
            prod.stock = p_info["stock"]
            prod.save()
        print(f"  - Product '{prod.name}' (${prod.price} MXN) Stock: {prod.stock}")

    print("Kōres Seed Completed Successfully.")

if __name__ == "__main__":
    seed_kores_tenant()
