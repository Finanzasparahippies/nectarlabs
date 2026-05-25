from django.conf import settings
from django.core.mail import get_connection
from apps.shop.models import Contract

def get_tenant_email_connection(tenant=None):
    """
    Determina si el tenant tiene plan activo (SES) o gratuito (Brevo),
    o si tiene su propio SMTP configurado (BYO SMTP), y retorna la conexión correspondiente.
    """
    if not tenant:
        return None, settings.DEFAULT_FROM_EMAIL

    # 1. Si el tenant tiene configurado su propio SMTP personalizado (BYO SMTP)
    if tenant.custom_smtp_host and tenant.custom_smtp_username and tenant.custom_smtp_password:
        from_email = tenant.custom_smtp_from_email or tenant.custom_smtp_username
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=tenant.custom_smtp_host,
            port=tenant.custom_smtp_port or 587,
            username=tenant.custom_smtp_username,
            password=tenant.custom_smtp_password,
            use_tls=tenant.custom_smtp_use_tls
        )
        return connection, from_email

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


def get_platform_sender(display_name):
    """
    Helper to cleanly parse settings.DEFAULT_FROM_EMAIL to get the email address,
    and format it with a custom display name. This avoids nested angle brackets
    which raise ValueError when DEFAULT_FROM_EMAIL contains a display name itself.
    """
    from email.utils import parseaddr
    _, email_addr = parseaddr(settings.DEFAULT_FROM_EMAIL)
    email_addr = email_addr or settings.EMAIL_HOST_USER or "soporte@nectarlabs.dev"
    return f"{display_name} <{email_addr}>"
