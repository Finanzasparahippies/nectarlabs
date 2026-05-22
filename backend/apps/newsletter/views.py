from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from apps.tenants.permissions import HasAddOnPermission
from apps.tenants.models import Tenant
from .models import Subscriber, send_newsletter_email
import uuid
from urllib.parse import urlparse, urlunparse

class SubscribeView(APIView):
    permission_classes = [HasAddOnPermission]
    addon_slug = 'newsletter-campaigner'

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"error": "El correo electrónico es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Resolve tenant from request
        tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')
        subdomain = request.query_params.get('subdomain') or request.data.get('subdomain')
        tenant = None
        
        if tenant_id:
            try:
                tenant = Tenant.objects.filter(id=uuid.UUID(str(tenant_id)), is_active=True).first()
            except (ValueError, TypeError):
                pass
        elif subdomain:
            tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido en la petición."}, status=status.HTTP_400_BAD_REQUEST)

        subscriber, created = Subscriber.objects.get_or_create(email=email, tenant=tenant)
        if not created:
            if subscriber.is_active:
                return Response({"message": f"Este correo ya se encuentra suscrito de forma activa en {tenant.name}."}, status=status.HTTP_200_OK)
            else:
                subscriber.is_active = True
                subscriber.save()
                self.send_welcome_email(subscriber)
                return Response({"message": "¡Tu suscripción ha sido reactivada con éxito!"}, status=status.HTTP_200_OK)
        
        self.send_welcome_email(subscriber)
        return Response({"message": f"¡Te has suscrito con éxito al newsletter de {tenant.name}!"}, status=status.HTTP_201_CREATED)

    def get_tenant_url(self, tenant):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        if tenant.custom_domain:
            if tenant.custom_domain.startswith(('http://', 'https://')):
                return tenant.custom_domain
            return f"https://{tenant.custom_domain}"
        
        parsed = urlparse(frontend_url)
        if parsed.netloc:
            # Check if domain already has subdomains or handles staging/etc.
            # Normal: localhost:3000 -> subdomain.localhost:3000
            netloc = f"{tenant.subdomain}.{parsed.netloc}"
            new_url = parsed._replace(netloc=netloc)
            return urlunparse(new_url)
        return f"https://{tenant.subdomain}.nectarlabs.dev"

    def send_welcome_email(self, subscriber):
        try:
            tenant_url = self.get_tenant_url(subscriber.tenant)
            subject = f"¡Te damos la bienvenida a {subscriber.tenant.name}!"
            context = {
                "subject": subject,
                "title": f"¡Gracias por suscribirte!",
                "content": (
                    f"<p>Te has registrado exitosamente en el boletín oficial de <strong>{subscriber.tenant.name}</strong>. "
                    "A partir de ahora, recibirás las últimas novedades, promociones y actualizaciones de nuestro portal "
                    "directamente en tu bandeja de entrada.</p>"
                    "<p>Estamos muy entusiasmados de tenerte con nosotros.</p>"
                ),
                "cta_url": tenant_url,
                "cta_text": "Visitar Sitio Web",
                "unsubscribe_url": f"{tenant_url}/unsubscribe?email={subscriber.email}&token={subscriber.token}"
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
            logger.error(f"Error al enviar correo de bienvenida a {subscriber.email} en tenant {subscriber.tenant.id}: {e}", exc_info=True)


