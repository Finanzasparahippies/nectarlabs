from django.conf import settings
from django.core.mail import get_connection
from apps.shop.models import Contract

def get_tenant_email_connection(tenant=None):
    """
    Determina si el tenant tiene plan activo (SES) o gratuito (Brevo)
    y retorna la conexión SMTP de Django correspondiente y el remitente.
    """
    if not tenant:
        return None, settings.DEFAULT_FROM_EMAIL

    # Verificar si el owner tiene contrato firmado y activo con algún plan
    is_paid = Contract.objects.filter(
        user=tenant.owner,
        is_active=True,
        is_fully_signed=True,
        plan__isnull=False
    ).exists()

    if is_paid:
        host = settings.SES_EMAIL_HOST
        port = settings.SES_EMAIL_PORT
        username = settings.SES_EMAIL_HOST_USER
        password = settings.SES_EMAIL_HOST_PASSWORD
        use_tls = settings.SES_EMAIL_USE_TLS
        from_email = settings.SES_DEFAULT_FROM_EMAIL
    else:
        host = settings.BREVO_EMAIL_HOST
        port = settings.BREVO_EMAIL_PORT
        username = settings.BREVO_EMAIL_HOST_USER
        password = settings.BREVO_EMAIL_HOST_PASSWORD
        use_tls = settings.BREVO_EMAIL_USE_TLS
        from_email = settings.BREVO_DEFAULT_FROM_EMAIL

    # Fallback si no hay credenciales configuradas para el proveedor seleccionado
    if not username or not password:
        # Retorna la conexión por defecto de django y el remitente de la plataforma
        return None, settings.DEFAULT_FROM_EMAIL

    connection = get_connection(
        backend='django.core.mail.backends.smtp.EmailBackend',
        host=host,
        port=port,
        username=username,
        password=password,
        use_tls=use_tls
    )
    
    return connection, from_email
