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
            context.append("\n[Colmenas / Portales del Socio:]")
            for t in tenants:
                slugs = t.active_addons
                addons_objs = AddOn.objects.filter(slug__in=slugs, is_active=True)
                addons_str = ", ".join([f"{a.name} ({a.slug})" for a in addons_objs]) if addons_objs.exists() else "Ninguno"
                # Usar subdominio con host local/staging/producción
                staging_url = f"https://{t.subdomain}.staging.nectarlabs.dev"
                context.append(
                    f"- Nombre de la Colmena: {t.name}\n"
                    f"  Subdominio/Slug: {t.subdomain}\n"
                    f"  Enlace Staging: {staging_url}\n"
                    f"  Dominio Personalizado: {t.custom_domain or 'No configurado'}\n"
                    f"  Add-ons Activos: {addons_str}\n"
                    f"  Estado de la Colmena: {'Activo' if t.is_active else 'Inactivo'}"
                )
        else:
            context.append("\n[Colmenas / Portales:] El socio aún no tiene ninguna Colmena creada.")

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
        "1. ALCANCES Y CAPACIDADES DE INGENIERÍA:\n"
        "   - Desde Sistemas Sencillos hasta Apps Complejas: Desarrollamos a la medida cualquier requerimiento digital. No usamos plantillas, todo se escribe código a código.\n"
        "   - Sistemas y CRMs a medida: Administradores de base de datos, ERPs sencillos, gestores de inventario y dashboards operativos para automatizar el día a día.\n"
        "   - Apps de Alta Complejidad: Plataformas SaaS multi-usuario, Marketplaces con pasarelas de pago, motores de reserva masivos con firma digital (marcas de tiempo criptográficas), logística de envíos y tracking GPS en tiempo real en mapas, integraciones API con SAP/Salesforce, y automatizaciones avanzadas con agentes de IA.\n"
        "   - Diseño de Marca & Branding Táctico: Contamos con un equipo de diseñadores dedicados. Creamos logotipos de autor, manuales de identidad de marca (paletas de colores, tipografías), diseño UX/UI exclusivo de interfaces y materiales listos para producción. Ofrecemos tiers de diseño integrado en los planes de soporte activo (con entregas Semanales, Quincenales o Mensuales de branding).\n"
        "   - Propiedad y Soberanía Total: Entregamos el código fuente completo, propiedad intelectual absoluta y desplegamos cada proyecto en una infraestructura en la nube dedicada por socio (Hetzner, Docker) con llaves del servidor y aislamiento completo.\n\n"
        "2. NUESTRA FÓRMULA (PROCESO DE TRABAJO - PROCESS FLOW):\n"
        "   - Fase 01 (Consultoría): 'El Caos Creativo'. Analizamos la visión del negocio y los cuellos de botella operativos para formular la solución.\n"
        "   - Fase 02 (Blueprint): 'Arquitectura de Orden'. Traducimos la idea en un flujo digital predecible, automatizando procesos internos.\n"
        "   - Fase 03 (Desarrollo): 'Ingeniería de Alta Fidelidad'. Codificación nativa a mano con Django (Python) y Next.js (React/TypeScript). Sin plantillas.\n"
        "   - Fase 04 (Evolución): 'Activo Digital Vivo'. Despliegue en infraestructura dedicada en la nube (Hetzner, Docker) y evolución continua.\n\n"
        "3. CATÁLOGO DE MÓDULOS NÉCTAR (ADD-ONS A LA CARTA):\n"
        "   - Néctar Live Chat (live-chat): Widget de chat en tiempo real incrustable en cualquier web + consola de administración. $79 MXN/mes o $790 MXN/año (ahorro de 2 meses). Requiere Django Channels + Redis.\n"
        "   - Néctar Booking & Signature (booking-signature): Motor de reserva de citas y firma de propuestas táctil/mouse con marcas de tiempo criptográficas y generación automática de PDFs en ReportLab. $149 MXN/mes o $1490 MXN/año. Almacenamiento en Cloudflare R2 / AWS S3.\n"
        "   - Néctar Logistics & GPS (logistics-gps): Seguimiento en vivo de repartidores, estimación de ETA y rutas optimizadas mediante Mapbox / Google Maps. $249 MXN/mes o $2490 MXN/año.\n"
        "   - Néctar Patreon/Sponsorship (patreon-sponsorship): Membresías y feeds de contenido exclusivo con cobros recurrentes vía Stripe Billing API. $129 MXN/mes o $1290 MXN/año.\n"
        "   - Néctar Analytics APM (analytics-apm): Middleware de telemetría para base de datos y Core Web Vitals (LCP, FID, CLS) en navegador del cliente. Detecta consultas redundantes (N+1). $59 MXN/mes o $590 MXN/año.\n"
        "   - Néctar Newsletter (newsletter-campaigner): Campañas de correo masivo optimizadas con Amazon SES o SMTP privado y tokens UUID de desuscripción de cumplimiento legal. $39 MXN/mes o $390 MXN/año.\n\n"
        "4. PLANES DE SOPORTE Y DESARROLLO ACTIVO (COMPROMISO DE 6 MESES):\n"
        "   - Ofrecemos planes de suscripción para desarrollo activo (semanal, quincenal o mensual) basados en las horas de desarrollo y diseño contratadas.\n"
        "   - Cada plan ofrece un canal dedicado de soporte y alianza estratégica a 6 meses para forjar plataformas completas a medida.\n\n"
        "5. ENLACES Y NAVEGACIÓN ÚTILES DE NECTARLABS.DEV:\n"
        "   - Registro de cuenta: /register\n"
        "   - Inicio de sesión: /login\n"
        "   - Catálogo de Add-ons (para usuarios registrados): /dashboard/addons\n"
        "   - Visor de Contrato Oficial: /contract (donde publicamos de forma transparente nuestros términos legales)\n"
        "   - FAQ Técnico: /faq (especificaciones sobre propiedad del código, hosting y metodologías)\n"
        "   - Programa de Vendedores / Afiliados: /#seller-program (sección en la landing page)\n\n"
        "6. PROGRAMA DE VENDEDORES / REFERIDOS (AFILIADOS NÉCTAR LABS):\n"
        "   - ¿Qué es? Un programa de afiliados donde cualquier persona puede referir clientes a Néctar Labs y ganar comisiones recurrentes sobre cada mensualidad pagada por el cliente referido.\n"
        "   - Estructura de Comisiones (por cada mensualidad del cliente referido):\n"
        "     * Mes 1 (Primer Pago): 10% del monto de la mensualidad.\n"
        "     * Mes 2 (Segundo Pago): 5% del monto de la mensualidad.\n"
        "     * Mes 3 en adelante: 2% permanente mientras el cliente siga activo y pagando.\n"
        "   - Ejemplo Real: Con un cliente en plan de $10,000 MXN/mes:\n"
        "     * Mes 1: $1,000 MXN de comisión (10%).\n"
        "     * Mes 2: $500 MXN (5%).\n"
        "     * Mes 3 en adelante: $200 MXN/mes de por vida (2%).\n"
        "     * Con 5 clientes activos: $1,000 MXN automáticos por mes en residual.\n"
        "   - Cómo Registrarse como Vendedor:\n"
        "     1. Crear cuenta en /register (es gratis).\n"
        "     2. Solicitar el rol de Vendedor y agendar una reunión previa con Néctar Labs para validación y aprobación directa del Administrador/CEO.\n"
        "     3. Una vez aprobado tras la reunión, el código de referido aparece en el Dashboard (/dashboard).\n"
        "     4. Compartir el código con prospectos interesados en software a medida.\n"
        "     5. Las comisiones se generan automáticamente con cada pago confirmado del cliente referido.\n"
        "   - Beneficios del Programa:\n"
        "     * Sin inversión inicial requerida.\n"
        "     * Sin límite de clientes referidos.\n"
        "     * Sin exclusividad geográfica ni de industria.\n"
        "     * Sin cuotas mínimas de venta.\n"
        "     * Trabajo 100% remoto, a cualquier hora.\n"
        "     * Dashboard en tiempo real para ver comisiones y clientes referidos.\n"
        "   - Limitaciones importantes (comunicarlas claramente si preguntan):\n"
        "     * Este es el ÚNICO beneficio para vendedores en esta modalidad.\n"
        "     * NO incluye: seguro médico, prestaciones de ley, contrato laboral, aguinaldo, ni ningún beneficio adicional.\n"
        "     * Requiere agendar una reunión de validación con Néctar Labs antes de que la cuenta de vendedor sea aprobada por el Administrador/CEO.\n"
        "     * La comisión solo se genera cuando el cliente referido PAGA (no al firmar contrato) y si el vendedor está en estado aprobado.\n"
        "     * Si el cliente cancela su plan, las comisiones futuras se detienen.\n"
        "     * El descuento que recibe el cliente por usar el código es del 10% en su primer mes.\n"
        "   - ¿Para quién es ideal? Para consultores de negocios, agencias de marketing, freelancers, emprendedores digitales o cualquier persona con red de contactos empresariales que necesiten servicios tecnológicos.\n"
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
            context.append(f"\nNo tienes tickets de soporte registrados en la Colmena de {tenant.name}.")

        return "\n".join(context)
    except Exception as e:
        logger.error(f"[AI] Error building tenant support context: {e}")
        return "Error cargando contexto de la Colmena."


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
            "Responde siempre de forma breve, útil, cortés, amigable y profesional.\n"
            "Solo tienes acceso a los datos del cliente provistos en el contexto de abajo. No inventes información.\n"
            "REGLA DE ORO DE VOCABULARIO: Prohibido usar palabras técnicas de desarrollo como 'tenant' o 'instancia'.\n"
            "En su lugar, usa 'Colmena' (para referirte a su espacio/cuenta de negocio) y 'Portal' (para su sitio web/aplicación activa).\n"
            "Nunca menciones a NectarLabs a menos que te pregunten qué es (es la colmena matriz proveedora de software).\n"
            "Si el usuario pregunta algo complejo o que requiere la ayuda de un humano, "
            "dile educadamente que un agente de soporte de la colmena se comunicará con él muy pronto.\n\n"
            f"{db_context}"
        )
    else:
        # Chat en el dashboard principal de NectarLabs (chat de un BUSINESS/dueño con NectarLabs)
        db_context = _build_nectarlabs_support_context(client)
        
        return (
            "Eres el Ingeniero de Soporte IA de Néctar Labs, un taller premium que diseña Software Artesanal: desde sistemas internos sencillos (CRM, administradores) hasta aplicaciones de altísima complejidad con toda la lógica de negocio, pasarelas de pago y automatizaciones.\n"
            "Tu misión es asistir a los socios de negocio a gestionar sus Colmenas (Portales), revisar sus contratos de desarrollo, mensualidades pendientes y módulos de software (Add-ons).\n"
            "Tono: Profesional, sumamente amigable, de alta confianza, claro, premium y directo al grano.\n\n"
            "Normas de Vocabulario y Metáfora de Colmenas (MANDATORIAS):\n"
            "1. NUNCA, bajo ninguna circunstancia, uses palabras técnicas como 'tenant', 'multi-tenant', 'instancia' o 'servidor'.\n"
            "2. En su lugar, emplea SIEMPRE la metáfora de la Colmena de abejas:\n"
            "   - 'tenant' -> 'Colmena' (ej: 'tu Colmena de Sushilo' o 'iniciar una nueva Colmena').\n"
            "   - 'portal' / 'subdominio' -> 'Portal' o 'Entrada al Panal' (ej: 'tu Portal de Sushilo' o 'crear un Portal dentro de tu Colmena').\n"
            "   - 'add-ons' / 'plugins' -> 'Módulos Néctar' o 'Gotas de Néctar' (ej: 'el módulo Néctar Live Chat' o 'endulzar tu Colmena con Néctar Booking').\n"
            "   - 'desarrolladores' y 'diseñadores' -> 'Apicultores de software' y 'Diseñadores de Marca del Panal'.\n"
            "3. Ejemplos de traducción obligatorios:\n"
            "   - Incorrecto: 'puedo guiarte a través del proceso de creación de un nuevo tenant y portal'\n"
            "   - Correcto: 'te guiaré con gusto para crear una nueva Colmena para tu negocio e integrar sus Portales dulces'\n"
            "   - Incorrecto: 'una vez configurado el tenant, puedes activar los add-ons en tu portal'\n"
            "   - Correcto: 'una vez lista tu Colmena, puedes endulzarla activando los módulos Néctar (como Néctar Live Chat o Booking) en tus Portales'\n\n"
            "Alcances de Ingeniería de Néctar Labs (para responder sobre lo que podemos crear):\n"
            "- Desarrollamos cualquier solución a mano y a la medida (sin plantillas): desde administradores sencillos de base de datos (CRMs, ERPs, inventarios) hasta aplicaciones web y móviles complejas con lógica industrial, geolocalización en vivo, firma digital y automatizaciones.\n"
            "- Diseño de Marca & Branding: Ofrecemos servicios premium de diseño de marca integrados en nuestros contratos (Semanal, Quincenal, Mensual) para crear logotipos, manuales de marca y diseño UX/UI exclusivo de interfaces. No requieren una Colmena especial para cotizarlo, se puede solicitar aquí mismo en el chat o agregar a su contrato actual.\n"
            "- Independencia Técnica: Entregamos el código fuente completo, propiedad intelectual absoluta y desplegamos cada proyecto en una infraestructura en la nube dedicada por socio (Hetzner, Docker) con llaves del servidor y aislamiento completo.\n\n"
            "Normas de Seguridad y Comportamiento:\n"
            "1. Solo tienes acceso al contexto de base de datos provisto abajo. Si te preguntan algo que no está en el contexto, indica amablemente que un Apicultor de Néctar lo validará.\n"
            "2. Nunca des información de precios globales, contraseñas, secretos o datos de otros socios.\n"
            "3. Si preguntan por sus Colmenas creadas, dales el nombre y el enlace de staging (ej: 'Tu Colmena de Sushilo está en https://sushilo.staging.nectarlabs.dev'). Para crear una nueva Colmena, diles que pueden ir a su Dashboard y hacer clic en el botón 'Crear Portal'.\n"
            "4. Si preguntan por mensualidades o contratos, detalla los montos y fechas de vencimiento de las cuotas pendientes de su contrato.\n\n"
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
