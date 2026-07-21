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
            "name": "Plan Basico",
            "price": 3000.00,
            "hours": 8,
            "description": "Ideales para prototipos y MVPs. Incluye desarrollo, diseño, hosting, base de datos y dominio .com.",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=2,
        defaults={
            "name": "Plan Staging",
            "price": 29999.00,
            "hours": 90,
            "description": "Nuestro plan insignia. Desarrollo continuo de producto, arquitectura serverless escalable y optimizaciones Premium.",
            "is_recommended": True,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=3,
        defaults={
            "name": "Plan Producción",
            "price": 49999.00,
            "hours": 160,
            "description": "Ingeniería de software dedicada, soporte 24/7 y control total de infraestructura de alta disponibilidad.",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    print("¡Base de datos de Nectar Labs poblada con éxito de forma segura!")

if __name__ == '__main__':
    seed_database()
