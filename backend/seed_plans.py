import os
import django

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Plan

def seed_database():
    print("Creando o actualizando planes tecnológicos de Nectar Labs de forma segura...")
    
    Plan.objects.update_or_create(
        id=1,
        defaults={
            "name": "Plan Básico",
            "price": 2999.00,
            "hours": 0,
            "description": "Contrato a 6 meses. Acceso a todos los add-ons utilizables dentro de las plantillas oficiales de Nectar Labs. Personalización autónoma mediante herramientas nativas de la plataforma.",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=2,
        defaults={
            "name": "Plan Mid",
            "price": 3499.00,
            "hours": 0,
            "description": "Contrato a 6 meses. Soporte para todos los add-ons de Nectar Labs personalizados a la marca del cliente. Restringido exclusivamente al uso y customización visual de plantillas oficiales (no incluye desarrollo a medida ni diseño desde cero).",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=3,
        defaults={
            "name": "Plan Premium",
            "price": 3999.00,
            "hours": 12,
            "description": "Contrato a 6 meses. 12 horas de desarrollo mensual dedicadas. Soporte completo para todos los add-ons personalizados a la marca. Desarrollo a medida desde cero o adaptando plantillas oficiales.",
            "is_recommended": True,
            "is_active": True
        }
    )
    
    print("¡Base de datos de Nectar Labs poblada con éxito de forma segura!")

if __name__ == '__main__':
    seed_database()
