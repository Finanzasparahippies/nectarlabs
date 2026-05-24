import logging
from django.conf import settings
from apps.tenants.utils import get_platform_sender
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

logger = logging.getLogger(__name__)

def send_ticket_creation_emails(ticket):
    """
    Sends email notifications when a new support ticket is created:
    1. A confirmation to the client (from settings.EMAIL_SUPPORT).
    2. A notification to the support team (from settings.EMAIL_SUPPORT).
    """
    try:
        # 1. Email to the Client
        client_subject = f"Contraseña/Ticket recibido: #{ticket.id} - {ticket.title}"
        client_html = render_to_string('shop/emails/ticket_created_client.html', {
            'subject': client_subject,
            'name': ticket.client.get_full_name() or ticket.client.username or "Cliente",
            'ticket': ticket,
        })
        client_text = strip_tags(client_html)
        
        email_client = EmailMultiAlternatives(
            subject=client_subject,
            body=client_text,
            from_email=get_platform_sender("Néctar Labs Soporte"),
            to=[ticket.client.email],
            reply_to=[settings.EMAIL_SUPPORT]
        )
        email_client.attach_alternative(client_html, "text/html")
        email_client.send()
        
        # 2. Email to the Support Team
        staff_subject = f"⚠️ NUEVO TICKET #{ticket.id}: [{ticket.get_category_display()}] - {ticket.title}"
        staff_html = render_to_string('shop/emails/ticket_created_staff.html', {
            'subject': staff_subject,
            'ticket': ticket,
        })
        staff_text = strip_tags(staff_html)
        
        email_staff = EmailMultiAlternatives(
            subject=staff_subject,
            body=staff_text,
            from_email=get_platform_sender("Néctar Labs Soporte"),
            to=[settings.EMAIL_HOST_USER],
            reply_to=[settings.EMAIL_SUPPORT]
        )
        email_staff.attach_alternative(staff_html, "text/html")
        email_staff.send()
        
    except Exception as e:
        logger.error(f"Error sending ticket creation emails for ticket {ticket.id}: {e}", exc_info=True)

def send_ticket_message_emails(ticket, message):
    """
    Sends email notifications when a new response is added to a support ticket:
    - If sent by client, notify support team (from settings.EMAIL_SUPPORT).
    - If sent by agent/staff, notify client (from settings.EMAIL_SUPPORT).
    """
    try:
        sender = message.sender
        is_agent = sender.is_staff or sender.role in ['ADMIN', 'BUSINESS']
        
        date_str = timezone.localtime(message.created_at).strftime('%d/%m/%Y %H:%M')
        sender_name = sender.get_full_name() or sender.email
        
        if is_agent:
            # Notify Client
            recipient_email = ticket.client.email
            recipient_name = ticket.client.get_full_name() or ticket.client.username or "Cliente"
            subject = f"Respuesta a tu ticket #{ticket.id}: {ticket.title}"
        else:
            # Notify Support Team
            recipient_email = settings.EMAIL_HOST_USER
            recipient_name = "Equipo de Soporte"
            subject = f"Nueva respuesta de cliente en ticket #{ticket.id}: {ticket.title}"
 
        html_content = render_to_string('shop/emails/ticket_reply_notification.html', {
            'subject': subject,
            'ticket': ticket,
            'name': recipient_name,
            'sender_name': sender_name,
            'content': message.content,
            'date': date_str,
        })
        text_content = strip_tags(html_content)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs Soporte"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_SUPPORT]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

    except Exception as e:
        logger.error(f"Error sending ticket message notification for ticket {ticket.id}: {e}", exc_info=True)
