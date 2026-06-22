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
    addon_slug = 'campaigner'

    def post(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"SubscribeView POST request: User={request.user}, Auth={request.user.is_authenticated if request.user else False}, Headers={dict(request.headers)}")
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

        # Si se proveyeron parámetros pero no se encontró un tenant válido, lanzar error
        if (tenant_id or subdomain) and not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido en la petición."}, status=status.HTTP_400_BAD_REQUEST)

        tenant_name = tenant.name if tenant else "Néctar Labs"
        
        # Enforce contact limit for TRIAL plan if tenant is active and not using BYO SMTP
        if tenant:
            has_byo_smtp = bool(tenant.custom_smtp_host and tenant.custom_smtp_username and tenant.custom_smtp_password)
            from apps.shop.models import Contract
            has_active_contract = Contract.objects.filter(user=tenant.owner, is_active=True).exists()
            has_paid_addon = tenant.newsletter_plan == 'PREMIUM'
            
            if not has_byo_smtp and not (has_active_contract or has_paid_addon):
                exists = Subscriber.objects.filter(email=email, tenant=tenant).exists()
                if not exists:
                    current_contacts = Subscriber.objects.filter(tenant=tenant, is_active=True).count()
                    if current_contacts >= 1000:
                        return Response(
                            {"error": "El límite de suscriptores para el plan de prueba ha sido alcanzado. Por favor, actualiza tu plan para recibir más registros."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

        subscriber, created = Subscriber.objects.get_or_create(email=email, tenant=tenant)
        if not created:
            if subscriber.is_active:
                return Response({"message": f"Este correo ya se encuentra suscrito de forma activa en {tenant_name}."}, status=status.HTTP_200_OK)
            else:
                subscriber.is_active = True
                subscriber.save()
                self.send_welcome_email(subscriber)
                return Response({"message": "¡Tu suscripción ha sido reactivada con éxito!"}, status=status.HTTP_200_OK)
        
        self.send_welcome_email(subscriber)
        return Response({"message": f"¡Te has suscrito con éxito al newsletter de {tenant_name}!"}, status=status.HTTP_201_CREATED)

    def get_tenant_url(self, tenant):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        if not tenant:
            return frontend_url
        if tenant.use_custom_domain and tenant.custom_domain:
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
            tenant_name = subscriber.tenant.name if subscriber.tenant else "Néctar Labs"
            subject = f"¡Te damos la bienvenida a {tenant_name}!"
            context = {
                "subject": subject,
                "title": f"¡Gracias por suscribirte!",
                "content": (
                    f"<p>Te has registrado exitosamente en el boletín oficial de <strong>{tenant_name}</strong>. "
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
                recipient_list=[subscriber.email],
                tenant=subscriber.tenant
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            tenant_desc = subscriber.tenant.id if subscriber.tenant else "main platform"
            logger.error(f"Error al enviar correo de bienvenida a {subscriber.email} en {tenant_desc}: {e}", exc_info=True)


class UnsubscribeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        token = request.data.get('token')

        if not email or not token:
            return Response({"error": "El correo electrónico y el token son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscriber = Subscriber.objects.get(email=email.strip().lower(), token=uuid.UUID(str(token)))
            subscriber.is_active = False
            subscriber.save()
            return Response({"message": "Te has desuscrito con éxito del boletín."})
        except (Subscriber.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Enlace de desuscripción inválido o vencido."}, status=status.HTTP_400_BAD_REQUEST)


class SendCampaignView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        tenant = request.user.owned_tenants.first()
        is_staff_admin = request.user.is_staff or getattr(request.user, 'role', '') == 'ADMIN'
        
        if not tenant and not is_staff_admin:
            return Response({"error": "No tienes un portal (tenant) asociado a tu cuenta."}, status=status.HTTP_400_BAD_REQUEST)

        subject = request.data.get('subject')
        title = request.data.get('title')
        content = request.data.get('content')
        if not subject or not content:
            return Response({"error": "El asunto (subject) y el contenido (content) son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)

        # Advanced ms-ambar options:
        template_type = request.data.get('template_type', 'minimalist')
        bg_image_url = request.data.get('bg_image_url')
        bg_opacity = request.data.get('bg_opacity', 1.0)
        bg_saturation = request.data.get('bg_saturation', 100)
        bg_position = request.data.get('bg_position', 'center')
        
        cta_text = request.data.get('cta_text')
        cta_link = request.data.get('cta_link')
        ctas = request.data.get('ctas', [])
        
        font_family = request.data.get('font_family', 'serif')
        title_font_family = request.data.get('title_font_family', 'serif')
        footer_font_family = request.data.get('footer_font_family', 'serif')
        
        email_title = request.data.get('email_title')
        footer_text_opt = request.data.get('footer_text')
        image_url = request.data.get('image_url')
        image_style = request.data.get('image_style', {})
        custom_styles = request.data.get('custom_styles', {})

        if not tenant:
            # Main platform / Nectar Labs campaign
            subscribers = Subscriber.objects.filter(tenant__isnull=True, is_active=True)
        else:
            subscribers = Subscriber.objects.filter(tenant=tenant, is_active=True)

        if not subscribers.exists():
            return Response({"message": "No tienes suscriptores activos para enviar esta campaña."}, status=status.HTTP_200_OK)

        sent_count = 0
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        tenant_url = frontend_url
        if tenant:
            if tenant.use_custom_domain and tenant.custom_domain:
                tenant_url = tenant.custom_domain if tenant.custom_domain.startswith(('http://', 'https://')) else f"https://{tenant.custom_domain}"
            else:
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(frontend_url)
                if parsed.netloc:
                    netloc = f"{tenant.subdomain}.{parsed.netloc}"
                    tenant_url = urlunparse(parsed._replace(netloc=netloc))
                else:
                    tenant_url = f"https://{tenant.subdomain}.nectarlabs.dev"

        brand_name = tenant.name if tenant else "Néctar Labs"
        theme_color = tenant.theme_color if tenant else "#C68A1E"
        
        # Get absolute logo url for tenant if available
        logo_absolute_url = None
        if tenant and tenant.logo:
            logo_absolute_url = request.build_absolute_uri(tenant.logo.url)
        elif not tenant:
            logo_absolute_url = f"{frontend_url}/logos/nectar_logo.png"

        from apps.newsletter.templates import compile_campaign_html

        try:
            for sub in subscribers:
                unsubscribe_url = f"{tenant_url}/unsubscribe?email={sub.email}&token={sub.token}"
                
                # Render campaign HTML dynamically
                html_content = compile_campaign_html(
                    subject=subject,
                    title=title,
                    content=content,
                    brand_name=brand_name,
                    theme_color=theme_color,
                    unsubscribe_url=unsubscribe_url,
                    logo_url=logo_absolute_url,
                    template_type=template_type,
                    bg_image_url=bg_image_url,
                    bg_opacity=bg_opacity,
                    bg_saturation=bg_saturation,
                    bg_position=bg_position,
                    cta_text=cta_text,
                    cta_link=cta_link,
                    ctas=ctas,
                    font_family=font_family,
                    title_font_family=title_font_family,
                    footer_font_family=footer_font_family,
                    email_title=email_title,
                    footer_text=footer_text_opt,
                    image_url=image_url,
                    image_style=image_style,
                    custom_styles=custom_styles
                )
                
                send_newsletter_email(
                    subject=subject,
                    template_name="generic",
                    context={},
                    recipient_list=[sub.email],
                    tenant=tenant,
                    html_content=html_content
                )
                sent_count += 1
        except ValueError as val_err:
            return Response({
                "error": str(val_err),
                "sent_count": sent_count
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error sending campaign: {e}", exc_info=True)
            return Response({
                "error": f"Error al enviar la campaña tras mandar {sent_count} correos: {str(e)}",
                "sent_count": sent_count
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Campaña enviada con éxito a {sent_count} suscriptores.",
            "sent_count": sent_count
        }, status=status.HTTP_200_OK)


from rest_framework import viewsets
from rest_framework.decorators import action
from django.utils import timezone
import threading
from .models import MarketingList, EmailCampaign, CampaignTemplateImage
from .serializers import (
    SubscriberSerializer, MarketingListSerializer,
    EmailCampaignSerializer, CampaignTemplateImageSerializer
)

def send_campaign_emails(campaign, base_url=None):
    import logging
    logger = logging.getLogger(__name__)

    if campaign.marketing_list:
        subscribers = campaign.marketing_list.subscribers.filter(is_active=True)
    else:
        subscribers = Subscriber.objects.filter(tenant=campaign.tenant, is_active=True)

    if not subscribers.exists():
        campaign.is_sent = True
        campaign.sent_at = timezone.now()
        campaign.save()
        return

    campaign.sent_at = timezone.now()
    campaign.is_sent = True
    campaign.save()

    tenant = campaign.tenant
    brand_name = tenant.name if tenant else "Néctar Labs"
    theme_color = tenant.theme_color if tenant else "#C68A1E"
    
    logo_absolute_url = None
    if tenant and tenant.logo:
        api_url = base_url or getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
        logo_absolute_url = f"{api_url.rstrip('/')}{tenant.logo.url}"
    elif not tenant:
        api_url = base_url or getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        logo_absolute_url = f"{api_url.rstrip('/')}/logos/nectar_logo.png"

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    tenant_url = frontend_url
    if tenant:
        if tenant.use_custom_domain and tenant.custom_domain:
            tenant_url = tenant.custom_domain if tenant.custom_domain.startswith(('http://', 'https://')) else f"https://{tenant.custom_domain}"
        else:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(frontend_url)
            if parsed.netloc:
                netloc = f"{tenant.subdomain}.{parsed.netloc}"
                tenant_url = urlunparse(parsed._replace(netloc=netloc))
            else:
                tenant_url = f"https://{tenant.subdomain}.nectarlabs.dev"

    from apps.newsletter.templates import compile_campaign_html

    for sub in subscribers:
        unsubscribe_url = f"{tenant_url}/unsubscribe?email={sub.email}&token={sub.token}"
        
        bg_image_url = None
        if campaign.bg_image:
            try:
                bg_image_url = campaign.bg_image.url
            except ValueError:
                pass

        image_url = None
        if campaign.image:
            try:
                image_url = campaign.image.url
            except ValueError:
                pass

        html_content = compile_campaign_html(
            subject=campaign.subject,
            title=campaign.email_title or campaign.subject,
            content=campaign.content,
            brand_name=brand_name,
            theme_color=theme_color,
            unsubscribe_url=unsubscribe_url,
            logo_url=logo_absolute_url,
            template_type=campaign.template_type,
            bg_image_url=bg_image_url,
            bg_opacity=campaign.bg_opacity,
            bg_saturation=campaign.bg_saturation,
            bg_position=campaign.bg_position,
            cta_text=campaign.cta_text,
            cta_link=campaign.cta_link,
            ctas=campaign.ctas,
            font_family=campaign.font_family,
            title_font_family=campaign.title_font_family,
            footer_font_family=campaign.footer_font_family,
            email_title=campaign.email_title,
            footer_text=campaign.footer_text,
            image_url=image_url,
            image_style=campaign.image_style,
            custom_styles=campaign.custom_styles
        )
        
        try:
            send_newsletter_email(
                subject=campaign.subject,
                template_name="generic",
                context={},
                recipient_list=[sub.email],
                tenant=tenant,
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Error sending campaign email to {sub.email} on tenant {tenant}: {e}", exc_info=True)


class SubscriberViewSet(viewsets.ModelViewSet):
    queryset = Subscriber.objects.all().order_by('-created_at')
    serializer_class = SubscriberSerializer
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'campaigner'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.query_params.get('tenant_id')
            if tenant_id:
                if tenant_id in ['null', 'none']:
                    return self.queryset.filter(tenant__isnull=True)
                return self.queryset.filter(tenant_id=tenant_id)
            return self.queryset.all()
            
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if tenant:
                return self.queryset.filter(tenant=tenant)
            return self.queryset.none()
            
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
        elif user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.data.get('tenant') or self.request.data.get('tenant_id')
            if tenant_id:
                tenant = Tenant.objects.filter(id=tenant_id).first()
        serializer.save(tenant=tenant)

    @action(detail=False, methods=['post'], url_path='import_csv')
    def import_csv(self, request):
        import csv
        import io
        import datetime
        from django.utils.dateparse import parse_datetime
        from django.db import transaction
        import logging
        logger = logging.getLogger(__name__)
        
        file = request.FILES.get('file')
        marketing_list_id = request.data.get('marketing_list_id')
        marketing_list = None
        
        user = request.user
        tenant = None
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
        elif user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id_param = request.data.get('tenant') or request.data.get('tenant_id')
            if tenant_id_param:
                tenant = Tenant.objects.filter(id=tenant_id_param).first()
                
        if marketing_list_id:
            try:
                marketing_list = MarketingList.objects.get(id=marketing_list_id, tenant=tenant)
            except MarketingList.DoesNotExist:
                return Response({"error": "La lista de marketing especificada no existe o no pertenece a tu portal."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file:
            logger.warning("[import_csv] No se proporcionó ningún archivo CSV.")
            return Response({"error": "No se proporcionó ningún archivo CSV."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            csv_data = file.read().decode('utf-8-sig')
            csv_file = io.StringIO(csv_data)
            sample = csv_data[:1024]
            delimiter = ','
            if '\t' in sample:
                delimiter = '\t'
            elif ';' in sample and ',' not in sample:
                delimiter = ';'
            
            csv_file.seek(0)
            reader = csv.DictReader(csv_file, delimiter=delimiter)
        except Exception as e:
            logger.error(f"[import_csv] Error al leer el archivo CSV: {str(e)}")
            return Response({"error": f"Error al leer el archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        email_to_row = {}
        row_count = 0
        for row in reader:
            row_count += 1
            row = { k.strip(): (v.strip() if isinstance(v, str) else '') for k, v in row.items() if k }
            
            email = row.get('email')
            if not email:
                email_key = next((k for k in row.keys() if k and 'email' in k.lower()), None)
                if email_key:
                    email = row[email_key]
            
            if not email:
                continue
                
            email = email.strip().lower()
            if not email:
                continue
            email_to_row[email] = row

        total_unique_emails = len(email_to_row)
        logger.info(f"[import_csv] Procesando archivo con {row_count} filas. Encontrados {total_unique_emails} correos únicos.")

        if total_unique_emails == 0:
            return Response({
                "message": "Se procesaron 0 suscriptores con éxito.",
                "errors": []
            }, status=status.HTTP_200_OK)

        emails_list = list(email_to_row.keys())
        try:
            existing_subscribers = {
                s.email.lower(): s for s in Subscriber.objects.filter(email__in=emails_list, tenant=tenant)
            }
            logger.info(f"[import_csv] Encontrados {len(existing_subscribers)} suscriptores existentes en base de datos.")
        except Exception as e:
            logger.error(f"[import_csv] Error al consultar suscriptores existentes: {str(e)}")
            return Response({"error": f"Error de base de datos al consultar suscriptores: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        subscribers_to_create = []
        subscribers_to_update = []
        errors = []
        imported_count = 0

        for email, row in email_to_row.items():
            status_val = row.get('status', '').lower().strip()
            is_active = True
            if status_val in ['inactive', 'unsubscribed', 'unactive', 'false', '0']:
                is_active = False
            
            name_val = row.get('name', '').strip()
            tags_val = row.get('tags', '').strip()
            
            premium_raw = row.get('premium?') or row.get('premium', '')
            is_premium_val = premium_raw.lower().strip() in ['true', '1', 'yes', 'si', 'y']
            
            created_at_raw = row.get('created_at', '').strip()
            created_at_val = None
            if created_at_raw:
                created_at_val = parse_datetime(created_at_raw)
                if not created_at_val:
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
                        try:
                            naive_dt = datetime.datetime.strptime(created_at_raw, fmt)
                            created_at_val = timezone.make_aware(naive_dt)
                            break
                        except Exception:
                            continue

            try:
                if email in existing_subscribers:
                    subscriber = existing_subscribers[email]
                    subscriber.is_active = is_active
                    if name_val:
                        subscriber.name = name_val
                    if tags_val:
                        subscriber.tags = tags_val
                    subscriber.is_premium = is_premium_val
                    if created_at_val:
                        subscriber.created_at = created_at_val
                    subscribers_to_update.append(subscriber)
                else:
                    kwargs = {
                        'email': email,
                        'tenant': tenant,
                        'is_active': is_active,
                        'name': name_val,
                        'tags': tags_val,
                        'is_premium': is_premium_val,
                    }
                    if created_at_val:
                        kwargs['created_at'] = created_at_val
                    
                    subscriber = Subscriber(**kwargs)
                    subscribers_to_create.append(subscriber)
                
                imported_count += 1
            except Exception as e:
                err_msg = f"Error al parsear datos de {email}: {str(e)}"
                errors.append(err_msg)
                logger.error(f"[import_csv] {err_msg}")

        try:
            with transaction.atomic():
                if subscribers_to_create:
                    logger.info(f"[import_csv] Guardando en lote (bulk_create) {len(subscribers_to_create)} nuevos suscriptores...")
                    Subscriber.objects.bulk_create(subscribers_to_create)
                if subscribers_to_update:
                    logger.info(f"[import_csv] Actualizando en lote (bulk_update) {len(subscribers_to_update)} suscriptores existentes...")
                    fields_to_update = ['is_active', 'name', 'tags', 'is_premium']
                    Subscriber.objects.bulk_update(subscribers_to_update, fields_to_update)
                
                if marketing_list:
                    all_imported_subs = Subscriber.objects.filter(email__in=emails_list, tenant=tenant)
                    marketing_list.subscribers.add(*all_imported_subs)
                    logger.info(f"[import_csv] Vinculados {all_imported_subs.count()} suscriptores a la lista: {marketing_list.name}")
            
            logger.info(f"[import_csv] Importación completada con éxito. Creados: {len(subscribers_to_create)}, Actualizados: {len(subscribers_to_update)}, Errores: {len(errors)}")
        except Exception as e:
            err_msg = f"Error al ejecutar operaciones bulk en base de datos: {str(e)}"
            logger.error(f"[import_csv] {err_msg}")
            return Response({"error": err_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Se procesaron {imported_count} suscriptores con éxito.",
            "errors": errors
        }, status=status.HTTP_200_OK)


class MarketingListViewSet(viewsets.ModelViewSet):
    queryset = MarketingList.objects.all().order_by('-created_at')
    serializer_class = MarketingListSerializer
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'campaigner'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.query_params.get('tenant_id')
            if tenant_id:
                if tenant_id in ['null', 'none']:
                    return self.queryset.filter(tenant__isnull=True)
                return self.queryset.filter(tenant_id=tenant_id)
            return self.queryset.all()
            
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if tenant:
                return self.queryset.filter(tenant=tenant)
            return self.queryset.none()
            
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
        elif user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.data.get('tenant') or self.request.data.get('tenant_id')
            if tenant_id:
                tenant = Tenant.objects.filter(id=tenant_id).first()
        serializer.save(tenant=tenant)


class EmailCampaignViewSet(viewsets.ModelViewSet):
    queryset = EmailCampaign.objects.all().order_by('-created_at')
    serializer_class = EmailCampaignSerializer
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'campaigner'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.query_params.get('tenant_id')
            if tenant_id:
                if tenant_id in ['null', 'none']:
                    return self.queryset.filter(tenant__isnull=True)
                return self.queryset.filter(tenant_id=tenant_id)
            return self.queryset.all()
            
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if tenant:
                return self.queryset.filter(tenant=tenant)
            return self.queryset.none()
            
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
        elif user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.data.get('tenant') or self.request.data.get('tenant_id')
            if tenant_id:
                tenant = Tenant.objects.filter(id=tenant_id).first()
        serializer.save(tenant=tenant)

    @action(detail=True, methods=['post'])
    def send_campaign(self, request, pk=None):
        campaign = self.get_object()
        if campaign.is_sent:
            return Response({"error": "Esta campaña ya ha sido enviada anteriormente."}, status=status.HTTP_400_BAD_REQUEST)
        
        base_url = request.build_absolute_uri('/')
        if getattr(settings, 'TESTING', False):
            send_campaign_emails(campaign, base_url)
        else:
            threading.Thread(target=send_campaign_emails, args=(campaign, base_url), daemon=True).start()
        return Response({"message": "La campaña de correos ha comenzado a enviarse en segundo plano."}, status=status.HTTP_200_OK)


class CampaignTemplateImageViewSet(viewsets.ModelViewSet):
    queryset = CampaignTemplateImage.objects.all().order_by('-created_at')
    serializer_class = CampaignTemplateImageSerializer
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'campaigner'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.query_params.get('tenant_id')
            if tenant_id:
                if tenant_id in ['null', 'none']:
                    return self.queryset.filter(tenant__isnull=True)
                return self.queryset.filter(tenant_id=tenant_id)
            return self.queryset.all()
            
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if tenant:
                return self.queryset.filter(tenant=tenant)
            return self.queryset.none()
            
        return self.queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if getattr(user, 'role', '') == 'BUSINESS':
            tenant = user.owned_tenants.first()
        elif user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.data.get('tenant') or self.request.data.get('tenant_id')
            if tenant_id:
                tenant = Tenant.objects.filter(id=tenant_id).first()
        serializer.save(tenant=tenant)



