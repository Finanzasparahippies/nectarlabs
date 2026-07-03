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
            "slug": "pack-ecommerce-lite",
            "name": "Paquete E-commerce Lite",
            "category_badge": "PAQUETE PRINCIPAL",
            "description": "Todo para tu tienda en línea: Envíos con Skydropx, Facturación SAT, Tienda Online y Campaigner Lite.",
            "detailed_description": "El paquete integral ideal para comenzar a vender en línea. Habilita de golpe las funciones de cotización y emisión de guías de envío nacionales de Skydropx, facturación fiscal automatizada CFDI 4.0 con 100 timbres base gratis al mes, y campañas de marketing por correo con campaigner lite sin costo.",
            "monthly_price": 799.00,
            "yearly_price": 7990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/tenants/models.py (pack-ecommerce-lite)",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Configuración completa de llaves de Stripe, Skydropx API Key y Facturapi API Key.",
            "technical_details": [
                "Acceso completo a módulo Tienda + Envíos Skydropx",
                "Acceso completo a módulo Facturación SAT (100 timbres base)",
                "Acceso completo a módulo Newsletter Masivo (Campaigner Lite)",
                "Ahorro de $148.00 MXN mensuales sobre la compra individual",
                "Configuración unificada y automatización de negocio cruzada"
            ]
        },
        {
            "slug": "pack-pos-ecommerce",
            "name": "Paquete POS & E-commerce Pro",
            "category_badge": "PAQUETE PRINCIPAL",
            "description": "Punto de venta físico, Tienda en línea, Envíos con Skydropx, Facturación SAT y Campaigner Lite.",
            "detailed_description": "La solución comercial definitiva para negocios omnicanal. Integra tu tienda en línea y tu mostrador físico (POS) con inventario unificado. Incluye 100 timbres fiscales al mes, Campaigner Lite y es compatible con hardware POS comercial (pago único de hardware de $1,799.00 MXN).",
            "monthly_price": 799.00,
            "yearly_price": 7990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/tenants/models.py (pack-pos-ecommerce)",
            "complexity": AddOn.Complexity.VERY_HIGH,
            "server_requirements": "Lector de código de barras USB + Impresora térmica + Cajón de dinero RJ11 (Hardware adicional).",
            "technical_details": [
                "Consola POS rápida con lector de barras",
                "Sincronización de inventario en tiempo real",
                "Acceso completo a Tienda + Envíos Skydropx",
                "Facturación SAT con 100 timbres incluidos",
                "Campaigner Lite sin costo"
            ]
        },
        {
            "slug": "pack-blog-sponsors",
            "name": "Paquete Blog & Sponsors",
            "category_badge": "PAQUETE PRINCIPAL",
            "description": "Monetiza tu contenido: Blog, Sponsorship (Patreon), Tienda Online, Facturación SAT y Campaigner Lite.",
            "detailed_description": "El paquete ideal para creadores de contenido y marcas personales. Permite monetizar mediante suscripciones recurrentes de Stripe (Sponsors), vender productos físicos o digitales en tu tienda y emitir facturas del SAT de forma integrada, con boletines de Campaigner Lite.",
            "monthly_price": 499.00,
            "yearly_price": 4990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/tenants/models.py (pack-blog-sponsors)",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Cuenta de Stripe para suscripciones + Configuración de Tienda.",
            "technical_details": [
                "Suscripciones recurrentes de Stripe con tiers",
                "Gestión de roles y feeds exclusivos para sponsors",
                "Acceso completo a Tienda Online",
                "Facturación SAT integrada",
                "Campaigner Lite sin costo"
            ]
        },
        {
            "slug": "driver-unlimited",
            "name": "Módulo de Repartidor Ilimitado",
            "category_badge": "LOGÍSTICA",
            "description": "Herramienta especializada para operar como repartidor con entregas y rutas ilimitadas en tiempo real.",
            "detailed_description": "Habilita la interfaz exclusiva para repartidores. Permite ponerse disponible, recibir pedidos asignados de comercios, seguir rutas dinámicas y actualizar estados de entrega.",
            "monthly_price": 399.00,
            "yearly_price": 3990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/delivery (DriverProfile, driver-unlimited)",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Cuenta activa del repartidor para entregas locales y geolocalización.",
            "technical_details": [
                "Acceso al Portal de Repartidor dedicado",
                "Switch de disponibilidad en tiempo real",
                "Visualización de rutas y mapas de entregas",
                "Historial de entregas y control de estado",
                "Soporte de cobros en Stripe, Efectivo o CoDi"
            ]
        },
        {
            "slug": "campaigner",
            "name": "Campaigner Masivo",
            "category_badge": "EMAIL MARKETING",
            "description": "Envío de boletines y campañas de email masivo sin renta fija. Cobro dinámico a $0.01 MXN por correo enviado.",
            "detailed_description": "Envía boletines interactivos a tu base de contactos usando nuestro servicio integrado. Sin renta fija mensual ni anual; solo pagas 1 centavo ($0.01 MXN) por cada correo enviado, descontado de tu Cartera Digital prepago.",
            "monthly_price": 0.00,
            "yearly_price": 0.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/newsletter (Subscriber, send_newsletter_email)",
            "complexity": AddOn.Complexity.LOW,
            "server_requirements": "Cartera Digital con saldo positivo ($0.01 MXN por correo).",
            "technical_details": [
                "Tokens únicos de desuscripción seguros (UUID)",
                "Render de templates de correo HTML interactivos",
                "Cobro automático por destinatario a $0.01 MXN",
                "Sin renta fija mensual o anual"
            ]
        },
        {
            "slug": "booking-signature",
            "name": "Néctar Contratos Digitales",
            "category_badge": "CONTRATOS DIGITALES",
            "description": "Motor de contratos digitales con firma incrustada en lienzo y generación automática de PDFs. Sin límites de documentos ni de firmantes.",
            "detailed_description": "Ideal para digitalizar acuerdos contractuales. Permite configurar contratos, generar propuestas en PDF automáticas y capturar firmas táctiles seguras con marcas de tiempo, sin límites en la cantidad de documentos o firmantes.",
            "monthly_price": 99.00,
            "yearly_price": 990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/contracts/models/contract.py",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Almacenamiento seguro en la nube para PDFs.",
            "technical_details": [
                "Lienzo de firma en React (HTML5 Canvas)",
                "Generación de documentos PDF vía backend",
                "Notificaciones de propuesta por correo electrónico",
                "Sin límite de documentos o firmantes"
            ]
        },
        {
            "slug": "booking",
            "name": "Agendador de Citas & Kanban",
            "category_badge": "GESTIÓN Y CITAS",
            "description": "Gestor de reservas y agendador de citas interactivo integrado con un tablero Kanban para seguimiento de estados.",
            "detailed_description": "Permite a tus clientes agendar citas directamente desde tu portal. Gestiona la disponibilidad, envía recordatorios y organiza las reservas en un tablero Kanban interactivo para optimizar el flujo de trabajo.",
            "monthly_price": 49.00,
            "yearly_price": 490.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/bookings",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Base de datos relacional para control de solapamiento de horarios.",
            "technical_details": [
                "Calendario de reservas interactivo para clientes",
                "Tablero Kanban integrado para gestión interna",
                "Configuración de horarios de atención",
                "Notificaciones y recordatorios automáticos"
            ]
        },
        {
            "slug": "bot-chat",
            "name": "Néctar AI Chat Bot",
            "category_badge": "COMUNICACIÓN EN VIVO",
            "description": "Widget de chat flotante en tiempo real y consola multi-agente con historial persistente.",
            "detailed_description": "Un canal de comunicación instantáneo integrado para retención y soporte de usuarios. Los clientes ven un widget interactivo de chat, mientras que los agentes de soporte de IA responden y el staff técnico gestiona las conversaciones desde una consola interna dedicada.",
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
            "slug": "delivery-tracking",
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
            "slug": "sponsorship",
            "name": "Néctar Sponsors & NSCAP",
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
            "slug": "business-analytics",
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
            "slug": "facturacion-cfdi",
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
            "slug": "pos-manager",
            "name": "Néctar Punto de Venta (POS Pro)",
            "category_badge": "OPERACIÓN Y CAJA",
            "description": "Consola de cobro rápido en mostrador compatible con lectores de código de barras e impresoras térmicas USB.",
            "detailed_description": "Digitaliza tu mostrador de cobro. Next.js captura los escaneos del lector USB instantáneamente en caliente, emite tickets de compra mediante comandos de impresión optimizados y envía un pulso eléctrico para la apertura automática de cajones de dinero RJ11.",
            "monthly_price": 299.00,
            "yearly_price": 2990.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "frontend/src/app/tenants/[subdomain]/pos",
            "complexity": AddOn.Complexity.MEDIUM,
            "server_requirements": "Base de datos PostgreSQL con soporte para transacciones ACID de alta concurrencia en inventarios.",
            "technical_details": [
                "Captura ultra-rápida de lector de códigos (Emulación de teclado)",
                "Diseño de ticket térmico responsivo (58mm / 80mm)",
                "Apertura automática de cajón de dinero vía pulso RJ11 de la ticketera",
                "Operación total mediante atajos de teclado para agilidad en mostrador",
                "Usuarios y cajas registradoras ilimitadas por Colmena"
            ]
        },
        {
            "slug": "ecommerce",
            "name": "Tienda Online (Módulo Base)",
            "category_badge": "E-COMMERCE",
            "description": "Módulo base para venta en línea, catálogo de productos y checkout de Stripe.",
            "detailed_description": "El motor de e-commerce base de tu colmena. Permite crear catálogos, configurar productos físicos o virtuales, gestionar inventario básico y procesar cobros de tus clientes con la pasarela de Stripe de manera fluida.",
            "monthly_price": 0.00,
            "yearly_price": 0.00,
            "origin_project": "nectarlabs-main",
            "source_reference": "backend/apps/tenants/models.py (ecommerce)",
            "complexity": AddOn.Complexity.HIGH,
            "server_requirements": "Configuración completa de Stripe API Keys.",
            "technical_details": [
                "Creación y edición del catálogo de productos y categorías",
                "Integración con checkout e intenciones de pago en Stripe",
                "Gestión e historial de pedidos y clientes",
                "Modo de pruebas y producción integrado"
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
