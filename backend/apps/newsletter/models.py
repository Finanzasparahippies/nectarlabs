import uuid
from django.db import models
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email

def send_newsletter_email(subject, template_name, context, recipient_list):
    """
    Utility to send HTML emails for newsletters.
    """
    html_content = render_to_string(f"newsletter/{template_name}.html", context)
    text_content = f"Visita nuestra web para ver las novedades: {settings.FRONTEND_URL}"
    
    msg = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list
    )
    msg.attach_alternative(html_content, "text/html")
    return msg.send()
