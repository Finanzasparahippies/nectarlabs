import os
import django

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import AddOn

def seed_addons():
    print("Creando o actualizando Add-ons del ecosistema Nectar Labs de forma segura...")
    
    addons_data = [
        {
            "slug": "live-chat",
            "name": "Néctar Live Chat",
            "category_badge": "COMUNICACIÓN EN VIVO",
            "description": "Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.",
            "detailed_description": "Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte gestionan las conversaciones desde una consola interna dedicada.",
            "monthly_price": 99.00,
            "yearly_price": 990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/tickets (SupportChat, SupportChatMessage)",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Django Channels (ASGI) con servidor de caché Redis + Base de Datos relacional.",
            "technical_details": [
                "Widget JS reactivo y ligero incrustable",
                "Polling persistente o WebSocket fallback",
                "Asignación dinámica de chats a staff técnico",
                "Marcado de estado abierto/resuelto/cerrado"
            ]
        },
        {
            "slug": "booking-signature",
            "name": "Néctar Booking & Signature",
            "category_badge": "CONTRATOS Y CITAS",
            "description": "Motor de reserva de citas integrado con firma digital de propuestas y generación de PDFs con firma incrustada.",
            "detailed_description": "Ideal para digitalizar acuerdos contractuales. Permite configurar calendarios interactivos, generar propuestas en PDF al vuelo a partir de plantillas y capturar firmas táctiles o con mouse seguras con marcas de tiempo criptográficas.",
            "monthly_price": 149.00,
            "yearly_price": 1490.00,
            "origin_project": "ms-ambar",
            "source_reference": "ms-ambar/backend/apps/bookings & templates/emails",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Almacenamiento seguro en la nube (AWS S3, Azure Blob o similar) para resguardar PDFs + Biblioteca ReportLab.",
            "technical_details": [
                "Lienzo de firma en React (Canvas HTML5)",
                "Generación de documentos PDF vía backend",
                "Notificaciones de propuesta por correo electrónico con templates HTML",
                "Control de flujos y estados de aprobación"
            ]
        },
        {
            "slug": "logistics-gps",
            "name": "Néctar Logistics & GPS",
            "category_badge": "LOGÍSTICA Y CONTROL",
            "description": "Seguimiento en tiempo real de repartidores, trazado de rutas óptimas de paradas y cálculo de ETA en mapa interactivo.",
            "detailed_description": "Módulo de geolocalización industrial. Registra rutas y telemetría GPS, ofreciendo una experiencia interactiva tanto al administrador (consola de flotas) como al usuario final (seguimiento del pedido en tiempo real).",
            "monthly_price": 449.00,
            "yearly_price": 4490.00,
            "origin_project": "losplacosones",
            "source_reference": "losplacosones/backend/apps/delivery",
            "complexity": AddOn.Complexity.VERY_HIGH,
            "server_requirements": "Acceso a Mapbox API o Google Maps API para cálculo de rutas + Telemetría persistente de alta frecuencia.",
            "technical_details": [
                "WebSockets / Polling optimizado para actualización GPS",
                "Consola administrativa con mapas interactivos de flotas",
                "Cálculo inteligente de rutas y paradas ordenadas",
                "Estimaciones de tiempo de entrega basadas en tráfico"
            ]
        },
        {
            "slug": "patreon-sponsorship",
            "name": "Néctar Patreon/Sponsorship",
            "category_badge": "MONETIZACIÓN",
            "description": "Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.",
            "detailed_description": "Permite monetizar tu contenido, comunidad o SaaS de manera flexible. Automatiza cobros recurrentes de Stripe, gestiona roles y bloquea o desbloquea secciones de contenido multimedia basándose en el nivel del suscriptor.",
            "monthly_price": 169.00,
            "yearly_price": 1690.00,
            "origin_project": "tierraviva",
            "source_reference": "tierraviva/tierraViva-backend-main/sponsorship",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Cuenta comercial de Stripe + Configuración de endpoint para Webhooks HTTPS del backend.",
            "technical_details": [
                "Integración con Stripe Billing API y Webhooks",
                "Definición de tiers o niveles dinámicos desde Django Admin",
                "Validación automatizada de estatus de membresías en backend",
                "Portal de auto-gestión del suscriptor"
            ]
        },
        {
            "slug": "analytics-apm",
            "name": "Néctar Analytics APM",
            "category_badge": "MONITOREO DE DESEMPEÑO",
            "description": "Monitor de Core Web Vitals en navegador y telemetría de base de datos con conteo de queries e hilos en tiempo real.",
            "detailed_description": "Optimiza la infraestructura midiendo el impacto real. Este middleware inyecta telemetría que calcula Web Vitals (LCP, FID, CLS) desde el lado del cliente y registra el tiempo de respuesta y la eficiencia de las consultas SQL en Django.",
            "monthly_price": 99.00,
            "yearly_price": 990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/performance (PerformanceMiddleware, models.py)",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Módulo de Middleware Django instalado + Agregación de logs asíncrona para no afectar el flujo principal.",
            "technical_details": [
                "Detección automática de consultas duplicadas (N+1)",
                "Monitoreo del hardware del servidor (CPU/RAM/SSD)",
                "Alertas configurables por lentitud de base de datos",
                "Registro detallado de Web Vitals del navegador del cliente"
            ]
        },
        {
            "slug": "newsletter-campaigner",
            "name": "Néctar Newsletter",
            "category_badge": "EMAIL MARKETING",
            "description": "Gestor de suscripciones, programador de campañas con plantillas HTML y envío masivo optimizado para SMTP/SES.",
            "detailed_description": "Envía boletines interactivos a tu base de contactos. Cuenta con un sistema automático de tokens únicos de cancelación de suscripción para cumplir con las normativas internacionales de correo, además de plantillas HTML prediseñadas.",
            "monthly_price": 79.00,
            "yearly_price": 790.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/newsletter (Subscriber, send_newsletter_email)",
            "complexity": AddOn.Complexity.LOW,
            "server_requirements": "Servicio de entrega de correos electrónicos configurado (AWS SES, Resend, Sendgrid o un SMTP privado).",
            "technical_details": [
                "Tokens únicos de desuscripción seguros (UUID)",
                "Render de templates de correo HTML con Django Template Loader",
                "Manejo de estados activos / inactivos de la base de datos",
                "Soporte multi-idioma de plantillas"
            ]
        },
        {
            "slug": "mexico-invoicing",
            "name": "Facturación SAT México",
            "category_badge": "CONTABILIDAD Y FISCAL",
            "description": "Emite facturas CFDI 4.0 oficiales del SAT a tus clientes de manera automatizada y marca blanca.",
            "detailed_description": "Módulo de facturación fiscal electrónica para México. Permite crear organizaciones subordinadas en Facturapi, subir sellos CSD y timbrar facturas CFDI 4.0 directamente desde tu portal, de forma automatizada (en compras) o manual a clientes.",
            "monthly_price": 299.00,
            "yearly_price": 2990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/billing (models.py, services.py, views.py)",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Configuración de credenciales de PAC (Facturapi API Key) en variables de entorno + HTTPS para subida segura de sellos.",
            "technical_details": [
                "Creación dinámica de organizaciones subordinadas en el PAC",
                "Carga directa y segura de sellos CSD (.cer, .key)",
                "Generación y timbrado automatizado de CFDI 4.0 (con IVA 16% auto-calculado)",
                "Descarga local e independiente de archivos XML y PDF de facturas",
                "Manejo inteligente de sincronización LCO del SAT (24-72 hrs)"
            ]
        }
    ]

    for item in addons_data:
        addon, created = AddOn.objects.update_or_create(
            slug=item["slug"],
            defaults=item
        )
        action_str = "creado" if created else "actualizado"
        print(f"Add-on '{addon.name}' ({addon.slug}) {action_str} con éxito.")

    print("¡Población de Add-ons completada con éxito!")

if __name__ == '__main__':
    seed_addons()
