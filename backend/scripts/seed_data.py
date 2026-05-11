from apps.shop.models import Plan
from apps.dashboard.models import FAQ

# Create Plans
Plan.objects.get_or_create(name="Semanal", price=750, hours=2, description="Ideal para tareas puntuales y soporte técnico.")
Plan.objects.get_or_create(name="Quincenal", price=1400, hours=5, description="Mantenimiento constante y pequeñas mejoras.")
Plan.objects.get_or_create(name="Mensual", price=2500, hours=12, description="Desarrollo activo de nuevas funcionalidades.")

# Create Initial FAQs
FAQ.objects.get_or_create(
    question="¿Qué pasa si no uso mis horas?", 
    answer="Las horas no son acumulables. Se reinician al final del periodo contratado para garantizar la disponibilidad del equipo.",
    category="BILLING"
)
FAQ.objects.get_or_create(
    question="¿Cómo funciona el servidor independiente?", 
    answer="Desplegamos una instancia limpia en Hetzner Cloud. Tú eres el dueño de la IP y las credenciales root.",
    category="TECHNICAL"
)

print("Mock data created successfully!")
