import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.tenants.models import Tenant
from apps.users.models import User
from apps.shop.models import Product
from decimal import Decimal

def seed_kores_mexico_tenant():
    print("=== Iniciando Aprovisionamiento e Sincronización del Tenant Kōres México ===")

    # 1. Propietario Administrador Fallback
    owner = User.objects.filter(is_superuser=True).first()
    if not owner:
        owner = User.objects.filter(role='ADMIN').first()
    if not owner:
        owner = User.objects.create_user(
            email="admin@nectarlabs.dev",
            password="NectarSecurePassword2026!",
            first_name="Admin",
            last_name="Nectar Labs",
            is_staff=True,
            is_superuser=True
        )
        print("[+] Usuario Administrador Creado: admin@nectarlabs.dev")

    # 2. Aprovisionamiento / Sincronización de kores-mexico
    tenant_mexico, created_mexico = Tenant.objects.get_or_create(
        subdomain="kores-mexico",
        defaults={
            "name": "Kōres México | Luxury Hair Ties",
            "owner": owner,
            "custom_domain": "kores-mexico.nectarlabs.dev",
            "use_custom_domain": False,
            "is_active": True,
            "theme_color": "#C5A880",           # Champagne Gold Primary
            "accent_color": "#EADCD6",          # Nude Velvet Accent
            "bg_color": "#121110",              # Dark Canvas
            "card_bg_color": "#1C1A18",         # Card Background
            "text_color": "#FDFBF7",            # Silk Ivory Text
            "border_color": "#2A2724",          # Fine Border
            "theme_color_light": "#C5A880",
            "accent_color_light": "#EADCD6",
            "bg_color_light": "#FDFBF7",
            "card_bg_color_light": "#FFFFFF",
            "text_color_light": "#1A1918",
            "border_color_light": "#E8E5DF",
            "portal_title": "Kōres México | Minimalist Luxury Hair Ties",
            "welcome_message": "Descubre la elegancia sin esfuerzo con nuestras ligas de seda Mulberry y acabados prémium en México.",
            "store_category": "Moda & Accesorios",
        }
    )

    if not created_mexico:
        tenant_mexico.name = "Kōres México | Luxury Hair Ties"
        tenant_mexico.is_active = True
        tenant_mexico.theme_color = "#C5A880"
        tenant_mexico.accent_color = "#EADCD6"
        tenant_mexico.portal_title = "Kōres México | Minimalist Luxury Hair Ties"
        tenant_mexico.save()
        print(f"[✓] Tenant 'kores-mexico' actualizado e hiper-configurado. Subdomain: {tenant_mexico.subdomain}")
    else:
        print(f"[+] Tenant 'kores-mexico' creado exitosamente. API Key: {tenant_mexico.api_key}")

    # 3. También asegurar sincronización con kores (alias base)
    tenant_kores, created_kores = Tenant.objects.get_or_create(
        subdomain="kores",
        defaults={
            "name": "Kōres Premium Hair Ties",
            "owner": owner,
            "custom_domain": "kores.vip",
            "use_custom_domain": True,
            "is_active": True,
            "theme_color": "#C5A880",
            "accent_color": "#EADCD6",
            "bg_color": "#121110",
            "card_bg_color": "#1C1A18",
            "text_color": "#FDFBF7",
            "border_color": "#2A2724",
            "portal_title": "Kōres | Minimalist Luxury Hair Ties",
            "welcome_message": "Descubre la elegancia sin esfuerzo con nuestras ligas de seda Mulberry y acabados prémium.",
            "store_category": "Moda & Accesorios",
        }
    )
    if not created_kores:
        tenant_kores.is_active = True
        tenant_kores.save()
        print(f"[✓] Tenant alias 'kores' verificado y activo.")

    # 4. Catálogo de productos para kores-mexico
    products = [
        {
            "name": "Silk Scrunchie Grande - Champagne Gold",
            "description": "Elaborada en 100% Seda Mulberry de 22 Momme. Edición Kōres México.",
            "price": Decimal("390.00"),
            "stock": 50
        },
        {
            "name": "Pack Trio Seamless Hair Ties - Obsidian Black",
            "description": "Ligas sin costuras de sujeción firme y elasticidad de alta durabilidad.",
            "price": Decimal("280.00"),
            "stock": 100
        },
        {
            "name": "Leather Ponytail Cuff - Saddle Tan",
            "description": "Broche de cuero genuino hecho a mano con cierre magnético discreto.",
            "price": Decimal("520.00"),
            "stock": 30
        }
    ]

    for p in products:
        prod, _ = Product.objects.get_or_create(
            tenant=tenant_mexico,
            name=p["name"],
            defaults={
                "description": p["description"],
                "price": p["price"],
                "stock": p["stock"]
            }
        )
        print(f"  - Producto '{prod.name}' registrado en kores-mexico (${prod.price} MXN)")

    print("=== Sincronización de Kōres México Concluida Exitosamente ===")

if __name__ == "__main__":
    seed_kores_mexico_tenant()
