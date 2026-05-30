import logging
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
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
        
        # Simple plain text and HTML content
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h2 style="color: #C68A1E; text-align: center; margin-bottom: 24px;">¡Bienvenido a Néctar Labs!</h2>
                    <p>Hola <strong>{user.username or 'Usuario'}</strong>,</p>
                    <p>Gracias por registrarte en nuestra plataforma. Para poder acceder a tu dashboard y a todas las funciones premium, necesitamos que confirmes tu dirección de correo electrónico.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{verify_url}" style="background-color: #C68A1E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar Correo Electrónico</a>
                    </div>
                    <p style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px;">
                        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
                        <a href="{verify_url}" style="color: #10B981;">{verify_url}</a>
                    </p>
                </div>
            </body>
        </html>
        """
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
