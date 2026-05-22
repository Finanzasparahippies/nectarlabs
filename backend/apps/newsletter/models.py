import uuid
from django.db import models
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

class Subscriber(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='subscribers', null=True, blank=True)
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('email', 'tenant')

    def __str__(self):
        return f"{self.email} ({self.tenant.subdomain if self.tenant else 'No Tenant'})"


from apps.tenants.utils import get_tenant_email_connection

def send_newsletter_email(subject, template_name, context, recipient_list, tenant=None):
    """
    Utility to send HTML emails for newsletters dynamically routed by tenant status.
    """
    html_content = render_to_string(f"newsletter/{template_name}.html", context)
    text_content = f"Visita nuestra web para ver las novedades: {settings.FRONTEND_URL}"
    
    connection, from_email = get_tenant_email_connection(tenant)
    
    msg = EmailMultiAlternatives(
        subject,
        text_content,
        from_email,
        recipient_list,
        connection=connection
    )
    msg.attach_alternative(html_content, "text/html")
    return msg.send()

