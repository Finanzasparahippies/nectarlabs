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

def send_verification_email(user, request):
    """
    Generates a secure verification token and sends a confirmation email to the user.
    Uses request.build_absolute_uri to dynamically construct the backend callback URL.
    """
    try:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Build absolute URL pointing to the backend's verification endpoint
        verify_url = request.build_absolute_uri(
            f"/api/users/verify-email/?uid={uid}&token={token}"
        )
        
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
