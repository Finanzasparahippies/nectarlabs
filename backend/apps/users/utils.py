import logging
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from apps.tenants.utils import get_platform_sender

logger = logging.getLogger(__name__)

def get_frontend_base_url(request=None) -> str:
    """
    Resuelve dinámicamente la URL base del Frontend respetando el entorno y origen de la petición.
    
    Prioridad 1: Inspeccionar petición activa (HTTP_ORIGIN o HTTP_REFERER).
    Prioridad 2: Respetar cabeceras proxy (HTTP_X_FORWARDED_HOST, HTTP_X_FORWARDED_PROTO, Host).
    Prioridad 3: Fallback seguro mediante settings.FRONTEND_URL (.env).
    """
    if request is not None:
        # Prioridad 1: HTTP_ORIGIN o HTTP_REFERER
        origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER')
        if origin:
            parsed = urlparse(origin)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}".rstrip('/')

        # Prioridad 2: Proxy Headers / Host de la Petición
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST')
        forwarded_proto = request.META.get('HTTP_X_FORWARDED_PROTO')
        
        host = forwarded_host or request.get_host()
        if host and host.lower() not in ['testserver', 'backend', 'localhost:8000', '127.0.0.1:8000']:
            proto = forwarded_proto or ('https' if request.is_secure() else 'http')
            return f"{proto}://{host}".rstrip('/')

    # Prioridad 3: Fallback Seguro a settings.FRONTEND_URL
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return frontend_url.rstrip('/')


def send_verification_email(user, request=None):
    """
    Genera un token seguro y envía el correo de verificación.
    Utiliza get_frontend_base_url(request) para construir el enlace correspondiente.
    """
    try:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        frontend_base = get_frontend_base_url(request)
        
        if request is not None:
            verify_url = request.build_absolute_uri(
                f"/api/users/verify-email/?uid={uid}&token={token}"
            )
        else:
            verify_url = f"{frontend_base}/verify-email?uid={uid}&token={token}"
        
        subject = "Verifica tu cuenta - Néctar Labs"
        
        html_content = render_to_string('shop/emails/verify_email.html', {
            'subject': subject,
            'username': user.username or 'Usuario',
            'verify_url': verify_url,
            'frontend_url': frontend_base,
        })
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs"),
            to=[user.email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        logger.info(f"Verification email sent to {user.email} using base URL: {frontend_base}")
    except Exception as e:
        logger.error(f"Error sending verification email to {user.email}: {e}", exc_info=True)

