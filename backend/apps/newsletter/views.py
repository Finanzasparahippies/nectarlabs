from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from .models import Subscriber, send_newsletter_email

class SubscribeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"error": "El correo electrónico es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        
        subscriber, created = Subscriber.objects.get_or_create(email=email)
        if not created:
            if subscriber.is_active:
                return Response({"message": "Este correo ya se encuentra suscrito de forma activa."}, status=status.HTTP_200_OK)
            else:
                subscriber.is_active = True
                subscriber.save()
                self.send_welcome_email(subscriber)
                return Response({"message": "¡Tu suscripción ha sido reactivada con éxito!"}, status=status.HTTP_200_OK)
        
        self.send_welcome_email(subscriber)
        return Response({"message": "¡Te has suscrito con éxito al newsletter de Néctar Labs!"}, status=status.HTTP_201_CREATED)

    def send_welcome_email(self, subscriber):
        try:
            subject = "¡Te damos la bienvenida a Néctar Labs!"
            context = {
                "subject": subject,
                "title": "¡Gracias por suscribirte!",
                "content": (
                    "<p>Te has registrado exitosamente en nuestro boletín oficial. A partir de ahora, "
                    "recibirás las últimas novedades sobre desarrollo web, diseño de productos digitales "
                    "y tecnología de punta directamente en tu bandeja de entrada.</p>"
                    "<p>Estamos muy entusiasmados de tenerte en nuestra comunidad.</p>"
                ),
                "cta_url": settings.FRONTEND_URL,
                "cta_text": "Visitar Sitio Web",
                "unsubscribe_url": f"{settings.FRONTEND_URL}/unsubscribe?email={subscriber.email}&token={subscriber.token}"
            }
            send_newsletter_email(
                subject=subject,
                template_name="generic",
                context=context,
                recipient_list=[subscriber.email]
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error al enviar correo de bienvenida a {subscriber.email}: {e}", exc_info=True)

