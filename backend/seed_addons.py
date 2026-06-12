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
            "name": "Néctar Live Chat Bot",
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
            "name": "Néctar Contratos Digitales",
            "category_badge": "CONTRATOS DIGITALES",
            "description": "Motor de contratos digitales con firma incrustada y generación de PDFs automatico.",
            "detailed_description": "Ideal para digitalizar acuerdos contractuales. Permite configurar contratos, generar propuestas en PDF automaticos y capturar firmas táctiles o con mouse seguras con marcas de tiempo criptográficas.",
            "monthly_price": 149.00,
            "yearly_price": 1490.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/contracts/models/contract.py, backend/apps/contracts/models/proposal.py",
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
            "name": "Tienda + Envíos con Skydropx",
            "category_badge": "LOGÍSTICA Y CONTROL",
            "description": "Configura tus almacenes de origen, cotiza envíos en tiempo real con margen de ganancia y emite guías automáticamente.",
            "detailed_description": "Módulo de logística inteligente integrado. Registra las tarifas reales desde la API de Skydropx y les aplica tu margen (markup) del 15% o personalizado directamente en el checkout, automatizando la generación de etiquetas en pedidos pagados.",
            "monthly_price": 249.00,
            "yearly_price": 2490.00,
            "origin_project": "losplacosones",
            "source_reference": "losplacosones/backend/apps/delivery",
            "complexity": AddOn.Complexity.VERY_HIGH,
            "server_requirements": "Cuenta en Skydropx (API Key de desarrollo o producción) + Configuración de dirección de almacén.",
            "technical_details": [
                "Cotización dinámica multitarifa (FedEx, DHL, Estafeta)",
                "Margen (markup) de ganancia sobre tarifas base",
                "Emisión automatizada de guías tras confirmación de pago",
                "Seguimiento y URL de rastreo guardados en la orden"
            ]
        },
        {
            "slug": "patreon-sponsorship",
            "name": "Néctar Sponsors & Content Access Program (NSCAP)",
            "category_badge": "MONETIZACIÓN",
            "description": "Pasarela de suscripciones recurrentes de Stripe con control de acceso a feeds exclusivos y niveles de membresía.",
            "detailed_description": "Permite monetizar tu contenido, comunidad o SaaS de manera flexible. Automatiza cobros recurrentes de Stripe, gestiona roles y bloquea o desbloquea secciones de contenido multimedia basándose en el nivel del suscriptor.",
            "monthly_price": 169.00,
            "yearly_price": 1690.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/sponsorship/models/sponsorship.py",
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
            "name": "Néctar Administrador de Ventas y Analytics",
            "category_badge": "MONETIZACIÓN",
            "description": "Administrador de ventas y analytics para Nectar, con dashboard de métricas en tiempo real, gráficos interactivos y exportación de datos.",
            "detailed_description": "Administra las ventas y analytics de tu plataforma. Con un dashboard intuitivo, podrás ver métricas en tiempo real, gráficos interactivos y exportar datos en diferentes formatos. Ideal para negocios que buscan optimizar sus ventas y analytics.",
            "monthly_price": 99.00,
            "yearly_price": 990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/sales (SalesMiddleware, models.py)",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Módulo de Middleware Django instalado + Agregación de logs asíncrona para no afectar el flujo principal.",
            "technical_details": [
                "Dashboard interactivo con métricas en tiempo real",
                "Exportación de datos en diferentes formatos",
                "Gráficos interactivos",
                "Registro detallado de transacciones"
            ]
        },
        {
            "slug": "newsletter-campaigner",
            "name": "Néctar Newsletter y Campañas de Email",
            "category_badge": "EMAIL MARKETING",
            "description": "Gestor de suscripciones, programador de campañas con plantillas HTML y envío masivo optimizado para SMTP/SES. Incluye 1,000 envíos/mes.",
            "detailed_description": "Envía boletines interactivos a tu base de contactos. Cuenta con un sistema automático de tokens únicos de cancelación de suscripción para cumplir con las normativas internacionales de correo, además de plantillas HTML prediseñadas. Incluye 1,000 correos mensuales base.",
            "monthly_price": 199.00,
            "yearly_price": 1990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/newsletter (Subscriber, send_newsletter_email)",
            "complexity": AddOn.Complexity.LOW,
            "server_requirements": "Servicio de entrega de correos electrónicos configurado (AWS SES, Resend, Sendgrid o un SMTP privado).",
            "technical_details": [
                "Tokens únicos de desuscripción seguros (UUID)",
                "Render de templates de correo HTML con Django Template Loader",
                "Envío de 1,000 correos mensuales base incluidos",
                "Emails extra con costo variable a $0.10 MXN"
            ]
        },
        {
            "slug": "mexico-invoicing",
            "name": "Facturación SAT México",
            "category_badge": "CONTABILIDAD Y FISCAL",
            "description": "Emite facturas CFDI 4.0 oficiales del SAT a tus clientes de manera automatizada y marca blanca. Incluye 20 timbres base.",
            "detailed_description": "Módulo de facturación fiscal electrónica para México. Permite crear organizaciones subordinadas en Facturapi, subir sellos CSD y timbrar facturas CFDI 4.0 directamente desde tu portal. Incluye 20 timbres mensuales base.",
            "monthly_price": 499.00,
            "yearly_price": 4990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/billing (models.py, services.py, views.py)",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Configuración de credenciales de PAC (Facturapi API Key) en variables de entorno + HTTPS para subida segura de sellos.",
            "technical_details": [
                "Creación dinámica de organizaciones subordinadas en el PAC",
                "Carga directa y segura de sellos CSD (.cer, .key)",
                "Soporte para 20 timbres mensuales incluidos",
                "Timbres extra a $1.50 MXN c/u en prepago",
                "Generación y timbrado automatizado de CFDI 4.0",
                "Descarga de archivos XML y PDF de facturas",
                "Manejo inteligente de sincronización LCO del SAT"
            ]
        },
        {
            "slug": "automatic-invoicing",
            "name": "Facturación Automática SAT",
            "category_badge": "CONTABILIDAD Y FISCAL",
            "description": "Timbrado automático e inmediato de facturas CFDI 4.0 al recibir pagos de tus clientes finales.",
            "detailed_description": "Módulo de facturación automática como agregado del módulo de facturación SAT México. Permite automatizar al 100% el timbrado de facturas al recibir pagos de abonos o mensualidades.",
            "monthly_price": 199.00,
            "yearly_price": 1990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/shop/views.py",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Módulo Facturación SAT México activo + Configuración fiscal completa y sellos CSD vigentes.",
            "technical_details": [
                "Timbrado desatendido inmediato post-pago",
                "Envío automático de XML y PDF a clientes finales",
                "Notificaciones de estado de timbrado al tenant",
                "Reintentos automáticos ante caídas del PAC/SAT"
            ]
        },
        {
            "slug": "ecommerce-combo",
            "name": "Combo E-commerce Automatizado",
            "category_badge": "E-COMMERCE COMBO",
            "description": "El paquete integral definitivo: Tienda + Envíos con Skydropx, Facturación SAT y Newsletter Masivo en uno.",
            "detailed_description": "La solución completa ideal para cualquier comercio digital. Habilita de golpe las funciones de cotización y emisión de guías de envío nacionales de Skydropx, facturación fiscal automatizada CFDI 4.0 con 20 timbres base, y campañas de marketing por correo con 1,000 envíos incluidos.",
            "monthly_price": 799.00,
            "yearly_price": 7990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/config/urls.py (E-commerce Integration Suite)",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Configuración completa de llaves de Stripe, Skydropx API Key y Facturapi API Key.",
            "technical_details": [
                "Acceso completo a módulo Tienda + Envíos Skydropx",
                "Acceso completo a módulo Facturación SAT (20 timbres base)",
                "Acceso completo a módulo Newsletter Masivo (1,000 correos base)",
                "Ahorro de $148.00 MXN mensuales sobre la compra individual",
                "Configuración unificada y automatización de negocio cruzada"
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
            "name": "Plan Mid",
            "price": 2800.00,
            "hours": 10,
            "description": "Ideal para proyectos en producción que requieren mantenimiento continuo y mejoras constantes.",
            "is_recommended": True,
            "is_active": True
        },
        {
            "id": 3,
            "name": "Plan Premium",
            "price": 2500.00,
            "hours": 12,
            "description": "Ideal para empresas que buscan escalabilidad y desarrollo continuo con soporte prioritario.",
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
