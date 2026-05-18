import os
import django

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Plan

def seed_database():
    print("Limpiando planes anteriores...")
    Plan.objects.all().delete()
    
    print("Creando planes tecnológicos de Nectar Labs...")
    
    Plan.objects.create(
        name="Plan MVP",
        price=14999.00,
        hours=40,
        description="Diseño e implementación rápida de tu idea de negocio. Lanzamiento ágil con infraestructura autoadministrable.",
        is_recommended=False,
        is_active=True
    )
    
    Plan.objects.create(
        name="Plan Staging",
        price=29999.00,
        hours=90,
        description="Nuestro plan insignia. Desarrollo continuo de producto, arquitectura serverless escalable y optimizaciones Premium.",
        is_recommended=True,
        is_active=True
    )
    
    Plan.objects.create(
        name="Plan Producción",
        price=49999.00,
        hours=160,
        description="Ingeniería de software dedicada, soporte 24/7 y control total de infraestructura de alta disponibilidad.",
        is_recommended=False,
        is_active=True
    )
    
    print("¡Base de datos de Nectar Labs poblada con éxito!")

if __name__ == '__main__':
    seed_database()
