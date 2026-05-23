"""
AI Service — NectarLabs Support Chat
Genera respuestas automáticas usando Groq Cloud (llama3-8b-8192) cuando el chat está
en estado OPEN (ningún agente humano ha tomado el chat).

Se desactiva automáticamente en cuanto un agente hace join (status → IN_PROGRESS).
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _build_nectarlabs_support_context(client) -> str:
    """Construye un bloque de contexto seguro y preciso consultando la base de datos para NectarLabs."""
    try:
        from apps.tenants.models import Tenant
        from apps.shop.models import Contract, AddOn
        from apps.tickets.models import Ticket

        tenants = Tenant.objects.filter(owner=client)
        contracts = Contract.objects.filter(user=client)
        tickets = Ticket.objects.filter(client=client)

        context = []
        context.append("--- CONTEXTO EN TIEMPO REAL DE LA BASE DE DATOS ---")
        context.append(f"Usuario: {client.get_full_name() or client.username} ({client.email})")

        if tenants.exists():
            context.append("\n[Portales / Tenants del Cliente:]")
            for t in tenants:
                slugs = t.active_addons
                addons_objs = AddOn.objects.filter(slug__in=slugs, is_active=True)
                addons_str = ", ".join([f"{a.name} ({a.slug})" for a in addons_objs]) if addons_objs.exists() else "Ninguno"
                # Usar subdominio con host local/staging/producción
                staging_url = f"https://{t.subdomain}.staging.nectarlabs.dev"
                context.append(
                    f"- Nombre del portal: {t.name}\n"
                    f"  Subdominio/Slug: {t.subdomain}\n"
                    f"  Enlace Staging: {staging_url}\n"
                    f"  Dominio Personalizado: {t.custom_domain or 'No configurado'}\n"
                    f"  Add-ons Activos: {addons_str}\n"
                    f"  Estado del portal: {'Activo' if t.is_active else 'Inactivo'}"
                )
        else:
            context.append("\n[Portales / Tenants:] El cliente aún no tiene ningún portal/tenant creado.")

        if contracts.exists():
            context.append("\n[Contratos de Desarrollo:]")
            for c in contracts:
                plan_name = c.plan.name if c.plan else "Sin Plan (Solo Adquisición de Add-ons)"
                context.append(
                    f"- Contrato #{c.id} | Plan: {plan_name}\n"
                    f"  Titular: {c.full_name}\n"
                    f"  Identificación Fiscal (RFC): {c.tax_id}\n"
                    f"  Firmado por Cliente: {'Sí' if c.signature_base64 else 'No'}\n"
                    f"  Firmado por Néctar: {'Sí' if c.developer_signature else 'No'}\n"
                    f"  Completamente Firmado: {'Sí' if c.is_fully_signed else 'No'}\n"
                    f"  Próximo Pago: {c.next_payment_date or 'No programado'}\n"
                    f"  Estado del Contrato: {'Activo' if c.is_active else 'Inactivo'}"
                )
                
                # Mensualidades pendientes
                installments = c.installments.filter(status='PENDING')
                if installments.exists():
                    context.append("  Mensualidades Pendientes:")
                    for inst in installments:
                        context.append(f"    * Mes {inst.installment_number}/6 - Vence: {inst.due_date} - Monto: ${inst.amount} MXN")
        else:
            context.append("\n[Contratos:] No hay contratos de desarrollo registrados.")

        if tickets.exists():
            context.append("\n[Tickets de Soporte en NectarLabs:]")
            for tick in tickets:
                context.append(
                    f"- Ticket #{tick.id} [{tick.category}]: '{tick.title}'\n"
                    f"  Prioridad: {tick.priority} | Estado: {tick.status}\n"
                    f"  Última Actualización: {tick.updated_at.strftime('%Y-%m-%d %H:%M')}"
                )
        else:
            context.append("\n[Tickets:] El cliente no tiene tickets de soporte creados actualmente.")

        # Inyectar información detallada de los servicios y secciones de la landing
        context.append(_build_nectarlabs_services_info())

        return "\n".join(context)
    except Exception as e:
        logger.error(f"[AI] Error building NectarLabs support context: {e}")
        return "Error cargando contexto de la base de datos."


def _build_nectarlabs_services_info() -> str:
    """Retorna información detallada y exacta sobre las secciones de NectarLabs.dev para guiar a los clientes."""
    return (
        "\n=======================================================\n"
        "--- INFORMACIÓN DETALLADA DE NECTARLABS.DEV (LANDING PAGE) ---\n"
        "Néctar Labs es un taller digital premium que desarrolla 'Software Artesanal': ingeniería de software de alta fidelidad y diseño de marca estratégico.\n\n"
        "1. SECCIONES CLAVE DE NECTARLABS.DEV:\n"
        "   - [BENTO GRID - Nuestras Fortalezas / Diferenciadores:]\n"
        "     * Ingeniería de Software de Alto Rendimiento: Desarrollo de plataformas SaaS, Marketplaces complejos, motores de reserva masivos, dashboards de datos en tiempo real e integraciones con Stripe o SAP.\n"
        "     * Diseño de Marca e Identidad: Creación de manuales de identidad visual, logotipo, diseño UX/UI exclusivo, transmitiendo autoridad y exclusividad.\n"
        "     * Automatización & IA: Optimizamos operaciones internas mediante agentes de IA y flujos de trabajo personalizados.\n"
        "     * Infraestructura y Aislamiento Total: Entorno Docker dedicado por socio, entrega total del código fuente, llaves de servidor y propiedad intelectual.\n"
        "   - [NUESTRA FÓRMULA (PROCESO DE TRABAJO - PROCESS FLOW):]\n"
        "     * Fase 01 (Consultoría): 'El Caos Creativo'. Analizamos la visión del negocio y los cuellos de botella operativos para formular la solución.\n"
        "     * Fase 02 (Blueprint): 'Arquitectura de Orden'. Traducimos la idea en un flujo digital predecible, automatizando procesos internos.\n"
        "     * Fase 03 (Desarrollo): 'Ingeniería de Alta Fidelidad'. Codificación nativa a mano con Django (Python) y Next.js (React/TypeScript). Sin plantillas.\n"
        "     * Fase 04 (Evolución): 'Activo Digital Vivo'. Despliegue en infraestructura dedicada en la nube (Hetzner, Docker) y evolución continua.\n"
        "   - [CATÁLOGO DE ADD-ONS (MÓDULOS A LA CARTA):]\n"
        "     * Néctar Live Chat (live-chat): Widget de chat en tiempo real incrustable en cualquier web + consola de administración. $79 MXN/mes o $790 MXN/año (ahorro de 2 meses). Requiere Django Channels + Redis.\n"
        "     * Néctar Booking & Signature (booking-signature): Motor de reserva de citas y firma de propuestas táctil/mouse con marcas de tiempo criptográficas y generación automática de PDFs en ReportLab. $149 MXN/mes o $1490 MXN/año. Almacenamiento en Cloudflare R2 / AWS S3.\n"
        "     * Néctar Logistics & GPS (logistics-gps): Seguimiento en vivo de repartidores, estimación de ETA y rutas optimizadas mediante Mapbox / Google Maps. $249 MXN/mes o $2490 MXN/año.\n"
        "     * Néctar Patreon/Sponsorship (patreon-sponsorship): Membresías y feeds de contenido exclusivo con cobros recurrentes vía Stripe Billing API. $129 MXN/mes o $1290 MXN/año.\n"
        "     * Néctar Analytics APM (analytics-apm): Middleware de telemetría para base de datos y Core Web Vitals (LCP, FID, CLS) en navegador del cliente. Detecta consultas redundantes (N+1). $59 MXN/mes o $590 MXN/año.\n"
        "     * Néctar Newsletter (newsletter-campaigner): Campañas de correo masivo optimizadas con Amazon SES o SMTP privado y tokens UUID de desuscripción de cumplimiento legal. $39 MXN/mes o $390 MXN/año.\n"
        "   - [PLANES DE INVERSIÓN TECNOLÓGICA (SUSCRIPCIONES CON COMPROMISO DE 6 MESES):]\n"
        "     * Néctar Labs ofrece planes de suscripción para desarrollo activo (semanal, quincenal o mensual) basados en las horas de desarrollo contratadas.\n"
        "     * Cada plan ofrece un canal dedicado de soporte y alianza estratégica a 6 meses para forjar plataformas completas a medida.\n\n"
        "2. ENLACES Y NAVEGACIÓN ÚTILES DE NECTARLABS.DEV:\n"
        "   - Registro de cuenta: /register\n"
        "   - Inicio de sesión: /login\n"
        "   - Catálogo de Add-ons (para usuarios registrados): /dashboard/addons\n"
        "   - Visor de Contrato Oficial: /contract (donde publicamos de forma transparente nuestros términos legales)\n"
        "   - FAQ Técnico: /faq (especificaciones sobre propiedad del código, hosting y metodologías)\n"
        "=======================================================\n"
    )


def _build_tenant_support_context(chat) -> str:
    """Construye un bloque de contexto seguro de base de datos para soporte de portales específicos (e.g. Sushilo)."""
    try:
        from apps.tickets.models import Ticket

        tenant = chat.tenant
        client = chat.client
        tickets = Ticket.objects.filter(client=client, tenant=tenant)

        context = []
        context.append(f"--- CONTEXTO DEL PORTAL DE SOPORTE DE {tenant.name.upper()} ---")
        context.append(f"Usuario Cliente: {client.get_full_name() or client.username} ({client.email})")
        context.append(f"Nombre del Negocio: {tenant.name} | Subdominio: {tenant.subdomain}")

        if tickets.exists():
            context.append(f"\n[Tus Tickets de Soporte en {tenant.name}:]")
            for tick in tickets:
                context.append(
                    f"- Ticket #{tick.id} [{tick.category}]: '{tick.title}'\n"
                    f"  Prioridad: {tick.priority} | Estado: {tick.status}\n"
                    f"  Última Actualización: {tick.updated_at.strftime('%Y-%m-%d %H:%M')}"
                )
        else:
            context.append(f"\nNo tienes tickets de soporte registrados en el portal de {tenant.name}.")

        return "\n".join(context)
    except Exception as e:
        logger.error(f"[AI] Error building tenant support context: {e}")
        return "Error cargando contexto del portal."


def _build_system_prompt(chat) -> str:
    """Construye el system prompt dinámico con el contexto detallado de la base de datos."""
    tenant = chat.tenant
    client = chat.client

    if tenant:
        # Chat en el portal de un Tenant (ej: Sushilo)
        db_context = _build_tenant_support_context(chat)
        welcome_msg = tenant.welcome_message or "¡Hola! ¿En qué podemos ayudarte hoy?"
        
        return (
            f"Eres el Asistente Virtual de Soporte Técnico de '{tenant.name}'.\n"
            f"Mensaje de bienvenida oficial: '{welcome_msg}'.\n"
            "Ayudas a los clientes a resolver dudas sobre la plataforma y el estado de sus tickets de soporte.\n"
            "Responde siempre de forma breve, útil, cortés y profesional.\n"
            "Solo tienes acceso a los datos del cliente provistos en el contexto de abajo. No inventes información.\n"
            "Nunca menciones a NectarLabs a menos que te pregunten qué es (es el proveedor de software subyacente).\n"
            "Si el usuario pregunta algo complejo, requiere un cambio de configuración técnica o la ayuda de un humano, "
            "dile educadamente que un agente de soporte de la empresa se comunicará con él muy pronto.\n\n"
            f"{db_context}"
        )
    else:
        # Chat en el dashboard principal de NectarLabs (chat de un BUSINESS/dueño con NectarLabs)
        db_context = _build_nectarlabs_support_context(client)
        
        return (
            "Eres el Ingeniero de Soporte IA de NectarLabs, una plataforma premium de desarrollo y add-ons.\n"
            "Tu misión es asistir a los socios/dueños de negocio (clientes de NectarLabs) a gestionar sus portales, revisar sus contratos de desarrollo, mensualidades pendientes y add-ons.\n"
            "Tono: Altamente técnico, profesional, premium, conciso y directo al grano.\n"
            "Normas de Seguridad y Comportamiento:\n"
            "1. Solo tienes acceso al contexto de base de datos provisto abajo. Si te preguntan algo que no está en el contexto, indica que no tienes esa información a la mano y que un agente técnico lo revisará.\n"
            "2. Nunca des información de precios globales, contraseñas, secretos, api_keys, o datos sensibles de otros clientes.\n"
            "3. Si preguntan por la URL o enlace de sus portales, dáselos de manera precisa (ej: 'El enlace de tu portal de Sushilo en staging es https://sushilo.staging.nectarlabs.dev').\n"
            "4. Si preguntan qué add-ons tienen activos en un portal, lee la sección 'Add-ons Activos' del respectivo tenant y diles exactamente los nombres de los add-ons activos.\n"
            "5. Si preguntan por mensualidades o pagos pendientes, menciona los montos y fechas de vencimiento de las mensualidades listadas bajo su contrato.\n"
            "6. Si la solicitud es de alta complejidad o requiere intervención en la base de datos/servidores, infórmales de manera atenta que un Ingeniero de NectarLabs humano se unirá al chat a la brevedad.\n\n"
            f"{db_context}"
        )


def _build_history(chat_messages, client_email: str) -> list:
    """
    Convierte el historial de mensajes del chat al formato de Groq:
    [{"role": "user"|"assistant", "content": "..."}]
    """
    history = []
    for msg in chat_messages:
        # Mensajes del bot IA → rol assistant
        if msg.is_ai_message:
            history.append({"role": "assistant", "content": msg.message})
        # Mensajes del cliente → rol user
        elif msg.sender.email.lower() == client_email.lower():
            history.append({"role": "user", "content": msg.message})
        # Mensajes de agente humano (ADMIN/BUSINESS) → assistant
        else:
            history.append({"role": "assistant", "content": msg.message})
    return history


def generate_ai_reply(chat, new_message_text: str) -> str | None:
    """
    Genera una respuesta de IA usando Groq Cloud para el chat dado.

    Returns:
        str: El texto de la respuesta generada.
        None: Si la IA está deshabilitada (sin API key) o falla.
    """
    api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
    if not api_key:
        logger.debug("GROQ_API_KEY no configurada — IA desactivada.")
        return None

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        # 1. Traemos únicamente los últimos 15 mensajes en base de datos de forma descendente
        # para evitar lecturas pesadas y controlar el consumo de tokens (TPM/RPM).
        existing_messages = chat.messages.order_by('-created_at')[:15]
        client_email = chat.client.email

        messages = [{"role": "system", "content": _build_system_prompt(chat)}]
        
        # 2. Invertimos la lista para que quede en orden cronológico (más antiguo al más nuevo)
        messages.extend(_build_history(list(reversed(existing_messages)), client_email))
        
        # 3. Validamos si el último mensaje del historial ya tiene rol "user" (ya guardado en DB).
        # Si no lo tiene, lo insertamos al final del prompt.
        if not messages or messages[-1]["role"] != "user":
            messages.append({"role": "user", "content": new_message_text})

        completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.4, # Temperatura idónea para respuestas precisas de soporte
            max_tokens=400,  # Límite óptimo para respuestas concisas y directas
        )

        reply = completion.choices[0].message.content
        logger.info(f"[AI] Respuesta generada para chat #{chat.id}: {len(reply)} chars")
        return reply

    except Exception as e:
        logger.error(f"[AI] Error al generar respuesta para chat #{chat.id}: {e}")
        return None
