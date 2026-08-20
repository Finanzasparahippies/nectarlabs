import logging
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.template.loader import render_to_string
from apps.tenants.utils import get_platform_sender

logger = logging.getLogger(__name__)

from urllib.parse import urlparse

ALLOWED_ORIGIN_PATTERNS = [
    "localhost",
    "127.0.0.1",
    "nectarlabs.dev",
    "staging.nectarlabs.dev",
    "nectarlabs.localhost",
]

def get_request_frontend_origin(request=None):
    """
    Safely extracts the frontend origin from HTTP_ORIGIN or HTTP_REFERER if present,
    validating against a strict domain whitelist to prevent Host Header Injection.
    Falls back to settings.FRONTEND_URL cleanly.
    """
    default_frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    if not request:
        return default_frontend

    raw_origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER')
    if raw_origin:
        try:
            parsed = urlparse(raw_origin)
            hostname = parsed.hostname or ""
            if any(pattern in hostname.lower() for pattern in ALLOWED_ORIGIN_PATTERNS):
                scheme = parsed.scheme or "http"
                netloc = parsed.netloc
                return f"{scheme}://{netloc}".rstrip('/')
        except Exception:
            pass

    return default_frontend

def send_verification_email(user, request=None):
    """
    Generates a secure verification token and sends a confirmation email to the user.
    Constructs the verification URL pointing directly to the Frontend verification route,
    dynamically matching the client origin (host + port) when safe.
    """
    try:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        frontend_url = get_request_frontend_origin(request)
        verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"
        
        subject = "Verifica tu cuenta - Néctar Labs"
        
        # Render the premium HTML template
        html_content = render_to_string('shop/emails/verify_email.html', {
            'subject': subject,
            'username': user.username or 'Usuario',
            'verify_url': verify_url,
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
        logger.info(f"Verification email sent to {user.email}")
    except Exception as e:
        logger.error(f"Error sending verification email to {user.email}: {e}", exc_info=True)
