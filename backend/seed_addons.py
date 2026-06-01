import os
import django

# Inicializar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import AddOn, Plan

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
            "description": "Emite facturas CFDI 4.0 oficiales del SAT a tus clientes de manera automatizada y marca blanca. Incluye 100 timbres mensuales.",
            "detailed_description": "Módulo de facturación fiscal electrónica para México. Permite crear organizaciones subordinadas en Facturapi, subir sellos CSD y timbrar facturas CFDI 4.0 directamente desde tu portal, de forma automatizada (en compras) o manual a clientes.",
            "monthly_price": 499.00,
            "yearly_price": 4990.00,
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
        existing = AddOn.objects.filter(slug=item["slug"]).first()
        if existing and (float(existing.monthly_price) != float(item["monthly_price"]) or float(existing.yearly_price) != float(item["yearly_price"])):
            # Clear stripe ids so that they are regenerated for the new price!
            existing.stripe_price_id = None
            existing.stripe_yearly_price_id = None
            existing.save(update_fields=['stripe_price_id', 'stripe_yearly_price_id'])

        addon, created = AddOn.objects.update_or_create(
            slug=item["slug"],
            defaults=item
        )
        action_str = "creado" if created else "actualizado"
        print(f"Add-on '{addon.name}' ({addon.slug}) {action_str} con éxito.")

    print("¡Población de Add-ons completada con éxito!")


def seed_plans():
    print("Creando o actualizando planes tecnológicos de Nectar Labs de forma segura...")
    plans_data = [
        {
            "id": 1,
            "name": "Plan Basico",
            "price": 3000.00,
            "hours": 8,
            "description": "Ideales para prototipos y MVPs. Incluye desarrollo, diseño, hosting, base de datos y dominio .com.",
            "is_recommended": False,
            "is_active": True
        },
        {
            "id": 2,
            "name": "Plan Staging",
            "price": 29999.00,
            "hours": 90,
            "description": "Nuestro plan insignia. Desarrollo continuo de producto, arquitectura serverless escalable y optimizaciones Premium.",
            "is_recommended": True,
            "is_active": True
        },
        {
            "id": 3,
            "name": "Plan Producción",
            "price": 49999.00,
            "hours": 160,
            "description": "Ingeniería de software dedicada, soporte 24/7 y control total de infraestructura de alta disponibilidad.",
            "is_recommended": False,
            "is_active": True
        }
    ]
    
    for item in plans_data:
        existing = Plan.objects.filter(id=item["id"]).first()
        if existing and float(existing.price) != float(item["price"]):
            # Clear stripe price so that it is regenerated for the new price!
            existing.stripe_price_id = None
            existing.stripe_product_id = None
            existing.save(update_fields=['stripe_price_id', 'stripe_product_id'])
            
        plan, created = Plan.objects.update_or_create(
            id=item["id"],
            defaults=item
        )
        action_str = "creado" if created else "actualizado"
        print(f"Plan '{plan.name}' (ID: {plan.id}) {action_str} con éxito.")
    
    print("¡Base de datos de Nectar Labs poblada con éxito con planes!")


def seed_stamp_packages_to_stripe():
    from django.conf import settings
    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    if not stripe_key or getattr(settings, "TESTING", False):
        print("Saltando sincronización de paquetes de timbres con Stripe (sin api key o en modo de pruebas).")
        return

    import stripe
    stripe.api_key = stripe_key
    print("Sincronizando paquetes de timbres con Stripe...")
    
    packages = [
        {"size": 50, "price": 100.00, "desc": "Paquete de 50 timbres fiscales"},
        {"size": 100, "price": 180.00, "desc": "Paquete de 100 timbres fiscales"},
        {"size": 500, "price": 650.00, "desc": "Paquete de 500 timbres fiscales"},
    ]
    for pkg in packages:
        try:
            # Buscar producto existente
            product = None
            for p in stripe.Product.list(limit=100).auto_paging_iter():
                if p.active and p.metadata.get("stamp_package_size") == str(pkg["size"]):
                    product = p
                    break
            if product:
                print(f"Producto de Stripe para paquete de {pkg['size']} timbres ya existe: {product.id}")
            else:
                product = stripe.Product.create(
                    name=f"[Néctar Labs] Paquete de {pkg['size']} timbres",
                    description=pkg["desc"],
                    metadata={"stamp_package_size": str(pkg["size"])}
                )
                print(f"Creado producto de Stripe para paquete de {pkg['size']} timbres: {product.id}")
            
            # Buscar precio existente
            prices = stripe.Price.list(product=product.id, active=True)
            price_id = None
            amount_cents = int(pkg["price"] * 100)
            for p in prices.data:
                if not p.recurring and p.unit_amount == amount_cents and p.currency == "mxn":
                    price_id = p.id
                    break
            
            if not price_id:
                price_obj = stripe.Price.create(
                    unit_amount=amount_cents,
                    currency="mxn",
                    product=product.id
                )
                price_id = price_obj.id
                print(f"Creado precio de Stripe para paquete de {pkg['size']} timbres: {price_id}")
            else:
                print(f"Precio de Stripe para paquete de {pkg['size']} timbres ya existe: {price_id}")
        except Exception as e:
            print(f"Error al sincronizar paquete de timbres {pkg['size']}: {e}")


if __name__ == '__main__':
    seed_addons()
    seed_plans()
    seed_stamp_packages_to_stripe()
