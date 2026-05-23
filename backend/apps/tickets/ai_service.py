"""
AI Service — NectarLabs Support Chat
Genera respuestas automáticas usando Groq Cloud (llama3-8b-8192) cuando el chat está
en estado OPEN (ningún agente humano ha tomado el chat).

Se desactiva automáticamente en cuanto un agente hace join (status → IN_PROGRESS).
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _build_system_prompt(chat) -> str:
    """Construye el system prompt con el contexto del tenant."""
    tenant_name = "NectarLabs"
    welcome_msg = "¡Hola! ¿En qué podemos ayudarte hoy?"

    if chat.tenant:
        tenant_name = chat.tenant.name
        if chat.tenant.welcome_message:
            welcome_msg = chat.tenant.welcome_message

    return (
        f"Eres el asistente de soporte técnico de {tenant_name}. "
        f"Mensaje de bienvenida del portal: '{welcome_msg}'. "
        "Ayuda al usuario a resolver sus dudas sobre la plataforma, tickets de soporte y servicios. "
        "Nunca des información sobre precios, suscripciones o datos sensibles de otros clientes. "
        "Responde siempre de forma breve, útil y en español latinoamericano o el idioma que hable el usuario. "
        "Si el usuario pregunta sobre temas que no conoces o que requieren intervención humana, "
        "dile que un agente se comunicará con él pronto. "
        "Mantén el tono profesional pero amigable, acorde al estilo de NectarLabs."
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
            model="llama3-8b-8192",
            temperature=0.5,
            max_tokens=512,
        )

        reply = completion.choices[0].message.content
        logger.info(f"[AI] Respuesta generada para chat #{chat.id}: {len(reply)} chars")
        return reply

    except Exception as e:
        logger.error(f"[AI] Error al generar respuesta para chat #{chat.id}: {e}")
        return None
