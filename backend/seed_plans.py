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
            "price": 2499.00,
            "hours": 6,
            "description": "Solución ágil para startups y pequeños negocios. Incluye mantenimiento, hosting y 6 horas de desarrollo mensual.",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=2,
        defaults={
            "name": "Plan Mid",
            "price": 2999.00,
            "hours": 8,
            "description": "Desarrollo continuo y escalabilidad de producto. Incluye soporte prioritario y 8 horas de desarrollo mensual.",
            "is_recommended": False,
            "is_active": True
        }
    )
    
    Plan.objects.update_or_create(
        id=3,
        defaults={
            "name": "Plan Premium",
            "price": 3499.00,
            "hours": 12,
            "description": "Ingeniería dedicada de alto impacto. Máxima velocidad de ejecución, soporte 24/7 y 12 horas de desarrollo mensual.",
            "is_recommended": True,
            "is_active": True
        }
    )
    
    print("¡Base de datos de Nectar Labs poblada con éxito de forma segura!")

if __name__ == '__main__':
    seed_database()
