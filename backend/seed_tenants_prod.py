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

def seed_production_tenants():
    print("=== Iniciando Siembra y Reactivación de Tenants en Producción ===")

    # 1. Asegurar Usuario Administrador Propietario Fallback
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
        print("[+] Usuario Administrador Maestro Creado: admin@nectarlabs.dev")

    # 2. Siembra y Reactivación del Tenant: curso-python
    tenant_curso, created_curso = Tenant.objects.get_or_create(
        subdomain="curso-python",
        defaults={
            "name": "Curso de Python Interactivo",
            "owner": owner,
            "is_active": True,
            "theme_color": "#3776AB",           # Python Blue
            "accent_color": "#FFD43B",          # Python Yellow
            "bg_color": "#0B0F19",              # Dark Canvas
            "card_bg_color": "#111827",         # Deep Card
            "text_color": "#F9FAFB",            # Bright White
            "border_color": "#1F2937",          # Dark Border
            "theme_color_light": "#3776AB",
            "accent_color_light": "#FFD43B",
            "bg_color_light": "#F9FAFB",
            "card_bg_color_light": "#FFFFFF",
            "text_color_light": "#111827",
            "border_color_light": "#E5E7EB",
            "portal_title": "Curso de Python Interactivo | Nectar Labs",
            "welcome_message": "¡Aprende Python desde cero! Domina sintaxis, estructuras de datos y desarrollo backend.",
            "store_category": "Educación / Tecnología",
        }
    )

    if not created_curso:
        tenant_curso.name = "Curso de Python Interactivo"
        tenant_curso.is_active = True
        tenant_curso.theme_color = "#3776AB"
        tenant_curso.accent_color = "#FFD43B"
        tenant_curso.portal_title = "Curso de Python Interactivo | Nectar Labs"
        tenant_curso.save()
        print(f"[✓] Tenant 'curso-python' reactivado e hiper-configurado. Subdomain: {tenant_curso.subdomain}")
    else:
        print(f"[+] Tenant 'curso-python' creado exitosamente. API Key: {tenant_curso.api_key}")

    # 3. Siembra y Reactivación del Tenant: kores (Kōres Luxury Hair Ties)
    tenant_kores, created_kores = Tenant.objects.get_or_create(
        subdomain="kores",
        defaults={
            "name": "Kōres Premium Hair Ties",
            "owner": owner,
            "custom_domain": "kores.vip",
            "use_custom_domain": True,
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
            "portal_title": "Kōres | Minimalist Luxury Hair Ties",
            "welcome_message": "Descubre la elegancia sin esfuerzo con nuestras ligas de seda Mulberry y acabados prémium.",
            "store_category": "Moda & Accesorios",
        }
    )

    if not created_kores:
        tenant_kores.name = "Kōres Premium Hair Ties"
        tenant_kores.custom_domain = "kores.vip"
        tenant_kores.use_custom_domain = True
        tenant_kores.is_active = True
        tenant_kores.theme_color = "#C5A880"
        tenant_kores.accent_color = "#EADCD6"
        tenant_kores.save()
        print(f"[✓] Tenant 'kores' reactivado e hiper-configurado. Subdomain: {tenant_kores.subdomain}, Custom Domain: {tenant_kores.custom_domain}")
    else:
        print(f"[+] Tenant 'kores' creado exitosamente. API Key: {tenant_kores.api_key}")

    # 4. Catálogo Semilla de Productos para Kōres (Ejemplo)
    products_kores = [
        {"name": "Silk Scrunchie Grande - Champagne", "description": "100% Seda Mulberry de 22 Momme.", "price": Decimal("390.00"), "stock": 45},
        {"name": "Pack Trio Seamless Hair Ties - Obsidian Black", "description": "Ligas sin costuras de alta durabilidad.", "price": Decimal("280.00"), "stock": 100},
    ]
    for p_info in products_kores:
        prod, _ = Product.objects.get_or_create(
            tenant=tenant_kores,
            name=p_info["name"],
            defaults={"description": p_info["description"], "price": p_info["price"], "stock": p_info["stock"]}
        )

    print("=== Proceso de Siembra Multi-Tenant Finalizado Exitosamente ===")

if __name__ == "__main__":
    seed_production_tenants()
