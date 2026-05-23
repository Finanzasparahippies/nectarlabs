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

        return "\n".join(context)
    except Exception as e:
        logger.error(f"[AI] Error building NectarLabs support context: {e}")
        return "Error cargando contexto de la base de datos."


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
        # Mensajes de agente humano (ADMIN/BUSINESS) → assistant también,
        # pero si llegamos aquí ya estaríamos IN_PROGRESS y no se llamaría esta función
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

        # Construir el historial completo del chat como contexto
        existing_messages = list(chat.messages.all())
        client_email = chat.client.email

        messages = [{"role": "system", "content": _build_system_prompt(chat)}]
        messages.extend(_build_history(existing_messages, client_email))
        # El nuevo mensaje ya está guardado en DB, pero por si acaso lo incluimos en contexto
        # (puede que ya esté en existing_messages según el orden de ejecución)
        if not existing_messages or existing_messages[-1].message != new_message_text:
            messages.append({"role": "user", "content": new_message_text})

        completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.5,
            max_tokens=600,
        )

        reply = completion.choices[0].message.content
        logger.info(f"[AI] Respuesta generada para chat #{chat.id}: {len(reply)} chars")
        return reply

    except Exception as e:
        logger.error(f"[AI] Error al generar respuesta para chat #{chat.id}: {e}")
        return None
