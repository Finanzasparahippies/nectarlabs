from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.renderers import BaseRenderer, JSONRenderer
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from rest_framework_simplejwt.tokens import RefreshToken
import uuid
import json
import logging

from django.core.cache import cache
from .models import Tenant, TenantPage, TenantNavItem, TenantWalletTransaction, TenantDeployment
from .serializers import (
    TenantSerializer, TenantPublicSerializer,
    TenantWalletTransactionSerializer, TenantDeploymentSerializer
)

logger = logging.getLogger(__name__)

ALLOWED_ACTIONS = {'start', 'stop', 'restart', 'status', 'deploy', 'reload_nginx', 'reload-nginx'}
ALLOWED_TARGETS = {'all', 'frontend', 'backend'}
ALLOWED_ENVIRONMENTS = {'staging', 'production'}


class ServerSentEventRenderer(BaseRenderer):
    """
    Renderer especializado para Server-Sent Events (SSE).
    Satisface la negociación de contenidos de DRF ante solicitudes 'Accept: text/event-stream'.
    """
    media_type = 'text/event-stream'
    format = 'event-stream'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if isinstance(data, (dict, list)):
            return json.dumps(data)
        return data or ""


User = get_user_model()

class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if getattr(self, 'action', None) in ['list', 'retrieve', 'stream_logs']:
            return [permissions.AllowAny()]
        return super().get_permissions()


    def get_serializer_class(self):
        if self.request.user.is_anonymous:
            return TenantPublicSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            return Tenant.objects.select_related('owner').prefetch_related('pages', 'nav_items').filter(is_active=True).order_by('-created_at')
        if user.is_staff or user.role == 'ADMIN':
            if self.request.query_params.get('all') == 'true':
                return Tenant.objects.select_related('owner').filter(is_active=True).order_by('-created_at')
            return Tenant.objects.select_related('owner').all().order_by('-created_at')
        return Tenant.objects.select_related('owner').filter(owner=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def regenerate_api_key(self, request, pk=None):
        tenant = self.get_object()
        tenant.api_key = uuid.uuid4()
        tenant.save()
        return Response({
            'detail': 'API Key successfully regenerated.',
            'api_key': str(tenant.api_key)
        })

    @action(detail=True, methods=['post'], url_path='deploy')
    def deploy(self, request, pk=None):
        tenant = self.get_object()
        if tenant.owner != request.user and not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'Permiso denegado para orquestar contenedores.'}, status=status.HTTP_403_FORBIDDEN)
        env = request.data.get('env', 'staging')
        if env not in ALLOWED_ENVIRONMENTS:
            return Response({'error': f"Entorno inválido '{env}'. Válidos: {sorted(list(ALLOWED_ENVIRONMENTS))}"}, status=status.HTTP_400_BAD_REQUEST)
        force_rebuild = bool(request.data.get('force_rebuild', False))
        from .provisioner import deploy_tenant_containers
        res = deploy_tenant_containers(tenant, env=env, user=request.user, force_rebuild=force_rebuild)
        status_code = getattr(res, 'status_code', (status.HTTP_200_OK if res.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR))
        return Response({'success': res.get('success'), 'message': res.get('message'), 'logs': res.get('logs', '')}, status=status_code)

    @action(detail=True, methods=['post'], url_path='container-action')
    def container_action(self, request, pk=None):
        """
        Ejecuta acciones PaaS (start, stop, restart, deploy, status) sobre los contenedores de un tenant
        con validación estricta de listas blancas y protección contra race-conditions.
        """
        tenant = self.get_object()
        if tenant.owner != request.user and not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'Permiso denegado para orquestar contenedores.'}, status=status.HTTP_403_FORBIDDEN)

        action_name = request.data.get('action')
        target = request.data.get('target', 'all')
        env = request.data.get('env', 'staging')

        if action_name not in ALLOWED_ACTIONS:
            return Response({'error': f"Acción '{action_name}' inválida. Permitidas: {sorted(list(ALLOWED_ACTIONS))}"}, status=status.HTTP_400_BAD_REQUEST)
        if target not in ALLOWED_TARGETS:
            return Response({'error': f"Target '{target}' inválido. Permitidos: {sorted(list(ALLOWED_TARGETS))}"}, status=status.HTTP_400_BAD_REQUEST)
        if env not in ALLOWED_ENVIRONMENTS:
            return Response({'error': f"Entorno '{env}' inválido. Permitidos: {sorted(list(ALLOWED_ENVIRONMENTS))}"}, status=status.HTTP_400_BAD_REQUEST)

        if action_name == 'status':
            from .provisioner import get_tenant_containers_status
            status_info = get_tenant_containers_status(tenant, env=env)
            return Response(status_info, status=status.HTTP_200_OK)

        if action_name == 'deploy':
            force_rebuild = bool(request.data.get('force_rebuild', False))
            from .provisioner import deploy_tenant_containers
            res = deploy_tenant_containers(tenant, env=env, user=request.user, force_rebuild=force_rebuild)
            return Response({
                'success': res.get('success', False),
                'message': res.get('message', ''),
                'error': res.get('error') if not res.get('success') else None,
                'logs': res.get('logs', '')
            }, status=res.status_code)

        if action_name in ('reload_nginx', 'reload-nginx'):
            from .provisioner import reload_nginx_proxy
            res = reload_nginx_proxy()
            is_success = res.get('success', False) if isinstance(res, dict) else getattr(res, 'success', bool(res))
            msg = res.get('message', '') if isinstance(res, dict) else getattr(res, 'message', str(res))
            status_code = getattr(res, 'status_code', (status.HTTP_200_OK if is_success else status.HTTP_500_INTERNAL_SERVER_ERROR))
            return Response({
                'success': is_success,
                'message': msg,
                'action': action_name,
                'target': target,
                'env': env
            }, status=status_code)

        from .provisioner import execute_container_action
        res = execute_container_action(tenant, target, action_name, environment=env)
        # Evitar código 404 para errores de contenedor que simulen endpoint no encontrado
        resp_status = status.HTTP_400_BAD_REQUEST if res.status_code == 404 else res.status_code
        return Response({
            'success': res.get('success', False),
            'message': res.get('message', ''),
            'error': res.get('error') or (res.get('message') if not res.get('success') else None),
            'action': action_name,
            'target': target,
            'env': env
        }, status=resp_status)

    @action(
        detail=True,
        methods=['get'],
        url_path='stream-logs',
        renderer_classes=[ServerSentEventRenderer, JSONRenderer]
    )
    def stream_logs(self, request, pk=None):
        """
        Transmite logs en tiempo real vía Server-Sent Events (SSE) evitando sondeos repetitivos por polling.
        Soporta autenticación estándar por cabecera Bearer y compatibilidad nativa con EventSource vía ?token=<jwt>.
        """
        user = request.user
        if not user or user.is_anonymous:
            token_param = request.query_params.get('token')
            if token_param:
                from rest_framework_simplejwt.tokens import AccessToken
                from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
                try:
                    validated_token = AccessToken(token_param)
                    user_id = validated_token.get('user_id')
                    User = get_user_model()
                    user = User.objects.filter(id=user_id).first()
                except (TokenError, InvalidToken, Exception) as token_err:
                    logger.warning(f"Error al validar token de stream_logs: {token_err}")

        if not user or not user.is_authenticated:
            return Response({'error': 'Autenticación requerida para stream de logs.'}, status=status.HTTP_401_UNAUTHORIZED)

        tenant = get_object_or_404(Tenant, pk=pk)
        if tenant.owner != user and not (user.is_staff or getattr(user, 'role', '') == 'ADMIN'):
            return Response({'error': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)


        target = request.query_params.get('target', 'backend')
        env = request.query_params.get('env', 'staging')
        tail_param = request.query_params.get('tail', '100')
        try:
            tail = min(max(int(tail_param), 10), 1000)
        except (ValueError, TypeError):
            tail = 100

        if target not in ('frontend', 'backend'):
            return Response({'error': f"Target '{target}' no es válido para streaming. Debe ser 'frontend' o 'backend'"}, status=status.HTTP_400_BAD_REQUEST)
        if env not in ALLOWED_ENVIRONMENTS:
            return Response({'error': f"Entorno '{env}' no permitido"}, status=status.HTTP_400_BAD_REQUEST)

        from .provisioner import get_tenant_container_names, stream_container_logs
        names = get_tenant_container_names(tenant, env=env)
        container_name = names.get(target, names['backend'])

        response = StreamingHttpResponse(
            stream_container_logs(container_name, tail=tail, follow=True),
            content_type="text/event-stream"
        )
        response['Cache-Control'] = 'no-cache, no-transform'
        response['X-Accel-Buffering'] = 'no'
        return response

    @action(detail=True, methods=['get'], url_path='container-status')
    def container_status(self, request, pk=None):
        tenant = self.get_object()
        env = request.query_params.get('env', 'staging')
        if env not in ALLOWED_ENVIRONMENTS:
            return Response({'error': f"Entorno inválido '{env}'"}, status=status.HTTP_400_BAD_REQUEST)
        from .provisioner import get_tenant_containers_status
        status_info = get_tenant_containers_status(tenant, env=env)
        return Response(status_info)

    @action(detail=True, methods=['get'], url_path='deploy-logs')
    def deploy_logs(self, request, pk=None):
        tenant = self.get_object()
        deployments = tenant.deployments.order_by('-created_at')[:10]
        return Response(TenantDeploymentSerializer(deployments, many=True).data)

    @action(detail=True, methods=['get'], url_path='wallet-transactions')
    def wallet_transactions(self, request, pk=None):
        tenant = self.get_object()
        if tenant.owner != request.user and not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'Permiso denegado.'}, status=status.HTTP_403_FORBIDDEN)
        txs = tenant.wallet_transactions.order_by('-created_at')[:50]
        return Response(TenantWalletTransactionSerializer(txs, many=True).data)

    @action(detail=True, methods=['post'], url_path='wallet-recharge')
    def wallet_recharge(self, request, pk=None):
        tenant = self.get_object()
        if not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'Solo administradores pueden recargar saldo directamente.'}, status=status.HTTP_403_FORBIDDEN)
        from decimal import Decimal
        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except Exception:
            return Response({'error': 'Monto inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'El monto debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)
        ok, new_bal, tx = tenant.atomic_credit_wallet(
            amount=amount,
            service_type='RECHARGE',
            description=request.data.get('description', 'Recarga administrativa'),
            reference_id=request.data.get('reference_id', '')
        )
        return Response({'success': ok, 'new_balance': new_bal})

    @action(detail=True, methods=['post'], url_path='start-trial')
    def start_trial(self, request, pk=None):
        tenant = self.get_object()
        if tenant.owner != request.user and not (request.user.is_staff or request.user.role == 'ADMIN'):
            return Response({'error': 'No tienes permisos para activar la prueba en este portal.'}, status=status.HTTP_403_FORBIDDEN)
        
        if tenant.trial_ends_at is not None:
            return Response({'error': 'La prueba gratuita ya fue solicitada o configurada anteriormente para este portal.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        from datetime import timedelta
        tenant.trial_ends_at = timezone.now() + timedelta(days=14)
        tenant.save(update_fields=['trial_ends_at'])
        
        return Response({
            'detail': 'Prueba gratuita de 14 días iniciada con éxito.',
            'trial_ends_at': tenant.trial_ends_at.isoformat()
        })

    @action(detail=True, methods=['post'], url_path='validate-domain')
    def validate_domain(self, request, pk=None):
        tenant = self.get_object()
        domain = request.data.get('custom_domain')
        if domain is not None:
            domain = domain.strip()
        if not domain:
            domain = tenant.custom_domain

        if not domain:
            return Response({
                'is_valid': False,
                'message': 'No se ha configurado ningún dominio personalizado para este portal.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Clean domain: strip protocol, www., and trailing slashes
        val = domain.strip().lower()
        if val.startswith('http://'):
            val = val[7:]
        elif val.startswith('https://'):
            val = val[8:]
        if val.startswith('www.'):
            val = val[4:]
        if val.endswith('/'):
            val = val[:-1]
        domain = val.strip()

        if not domain:
            return Response({
                'is_valid': False,
                'message': 'No se ha configurado ningún dominio personalizado para este portal.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Enforce that custom domain must not contain "nectarlabs"
        if 'nectarlabs' in domain:
            return Response({
                'is_valid': False,
                'message': 'El dominio personalizado no puede pertenecer a los subdominios de Nectar Labs.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Simple domain validation
        if '.' not in domain or ' ' in domain:
            return Response({
                'is_valid': False,
                'message': 'Por favor ingresa un dominio válido (ej. mi-dominio.com).'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        import socket
        try:
            resolved_ip = socket.gethostbyname(domain)
            return Response({
                'is_valid': True,
                'resolved_ip': resolved_ip,
                'message': f'El dominio resuelve correctamente a la IP {resolved_ip}.'
            })
        except socket.gaierror:
            return Response({
                'is_valid': False,
                'message': 'No se pudo resolver el dominio. Verifica la configuración CNAME en tu proveedor de DNS.'
            })
        except Exception as e:
            return Response({
                'is_valid': False,
                'message': f'Error durante la comprobación: {str(e)}'
            })

    @action(detail=True, methods=['post'], url_path='test-shipping-quote')
    def test_shipping_quote(self, request, pk=None):
        """
        Permite al inquilino simular y probar una cotización en tiempo real desde el dashboard
        utilizando su configuración de empaque, origen, margen y proveedor preferido.
        """
        tenant = self.get_object()
        dest_zip = str(request.data.get('dest_zip') or request.data.get('destination_zip') or request.data.get('postal_code') or '').strip()
        if not dest_zip:
            return Response({'error': 'El código postal de destino es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.shop.logistics.router import get_shipping_rates
        destination = {
            'postalCode': dest_zip,
            'zip_code': dest_zip,
            'country': 'MX'
        }
        
        parcel = request.data.get('parcel')
        try:
            rates = get_shipping_rates(destination=destination, parcel=parcel, tenant=tenant)
            return Response({
                'success': True,
                'origin_zip': tenant.shipping_origin_zip_code or "83000",
                'destination_zip': dest_zip,
                'provider': tenant.preferred_shipping_provider,
                'package_type': tenant.default_package_type,
                'markup_percentage': float(tenant.shipping_markup_percentage),
                'rates_count': len(rates),
                'rates': rates
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post', 'put', 'patch', 'delete'], url_path='proxy/(?P<sub_path>.*)')
    def backend_proxy(self, request, pk=None, sub_path=None):
        """
        Reverse Proxy Action:
        Reenvía de manera interna y transparente las peticiones hacia el custom_backend_url del Tenant
        sin que el cliente final modifique su endpoint en el navegador.
        """
        tenant = self.get_object()
        if not tenant.custom_backend_url:
            return Response(
                {"error": "Este Tenant no tiene un backend personalizado configurado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Resolver URL de destino
        target_base = tenant.custom_backend_url.rstrip('/')
        target_url = f"{target_base}/{sub_path}" if sub_path else target_base
        if request.META.get('QUERY_STRING'):
            target_url = f"{target_url}?{request.META['QUERY_STRING']}"

        # 2. Filtrar y copiar cabeceras HTTP de la petición original
        headers = {}
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].replace('_', '-').title()
                headers[header_name] = value
            elif key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                header_name = key.replace('_', '-').title()
                headers[header_name] = value

        # Asegurar host correcto del destino
        from urllib.parse import urlparse
        parsed_target = urlparse(target_url)
        headers['Host'] = parsed_target.netloc

        # 3. Preparar los datos del Body
        data = request.body if request.body else None

        # 4. Realizar la petición HTTP utilizando urllib
        import urllib.request
        import urllib.error
        from django.http import HttpResponse

        req = urllib.request.Request(
            target_url,
            data=data,
            headers=headers,
            method=request.method
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                response_content = res.read()
                django_response = HttpResponse(
                    response_content,
                    status=res.status,
                    content_type=res.headers.get('Content-Type')
                )
                for header_key, header_val in res.headers.items():
                    if header_key.lower() not in ('transfer-encoding', 'content-encoding', 'connection'):
                        django_response[header_key] = header_val
                return django_response
        except urllib.error.HTTPError as e:
            err_content = e.read()
            django_response = HttpResponse(
                err_content,
                status=e.code,
                content_type=e.headers.get('Content-Type')
            )
            for header_key, header_val in e.headers.items():
                if header_key.lower() not in ('transfer-encoding', 'content-encoding', 'connection'):
                    django_response[header_key] = header_val
            return django_response
        except urllib.error.URLError as e:
            return Response(
                {"error": f"No se pudo conectar con el backend personalizado del Tenant: {str(e.reason)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {"error": f"Error interno en el proxy de Nectar Labs: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


from .models import Tenant, TenantPage, TenantNavItem
from .serializers import TenantSerializer, TenantPublicSerializer, TenantPageSerializer, TenantNavItemSerializer
from .utils import get_tenant_from_request

User = get_user_model()

class TenantPageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listar y gestionar páginas dinámicas de un Tenant.
    Soporta consulta pública sin autenticación por subdomain/host y slug.
    """
    serializer_class = TenantPageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        tenant = get_tenant_from_request(self.request)
        if tenant:
            queryset = TenantPage.objects.filter(tenant=tenant, is_published=True)
            slug = self.request.query_params.get('slug')
            if slug:
                queryset = queryset.filter(slug=slug)
            return queryset.order_by('order', 'created_at')
        
        user = self.request.user
        if user and user.is_authenticated:
            if user.is_staff or user.role == 'ADMIN':
                return TenantPage.objects.all().order_by('order', 'created_at')
            return TenantPage.objects.filter(tenant__owner=user).order_by('order', 'created_at')
            
        return TenantPage.objects.none()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_config(request):
    """
    Public endpoint to fetch tenant styling, pages, and navigation configuration by subdomain, custom domain, host, or API key.
    Useful for iframe embedding and dynamic host routing. High-performance Redis cached.
    """
    subdomain = request.query_params.get('subdomain')
    api_key = request.query_params.get('api_key')
    tenant_id = request.query_params.get('tenant_id')
    host = request.query_params.get('host') or request.META.get('HTTP_HOST')
    
    cache_key = f"tenant_pubcfg_{subdomain}_{host}_{api_key}_{tenant_id}".lower()
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    tenant = get_tenant_from_request(request)

    if not tenant or not tenant.is_active:
        return Response({'error': 'Tenant not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
        
    serializer = TenantPublicSerializer(tenant, context={'request': request})
    data = serializer.data
    cache.set(cache_key, data, 600)
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def resolve_host(request):
    """
    Endpoint ultrarrápido (<1ms, Redis cached) para resolución de Tenants en tiempo de ejecución.
    Invocado por el middleware de Next.js (proxy.ts) para enrutamiento zero-touch.
    Parámetros:
      - host: Nombre de dominio o subdominio entrante (ej: sushilo.nectarlabs.dev, mitienda.com, staging.kores.vip)
    """
    from .utils import get_tenant_from_request
    host = request.query_params.get('host') or request.META.get('HTTP_HOST') or ''
    clean_host = host.split(':')[0].strip().lower()

    if not clean_host:
        return Response({'error': 'Host parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f"resolve_tenant_host_{clean_host}"
    cached_payload = cache.get(cache_key)
    if cached_payload is not None:
        if cached_payload is False:
            return Response({'error': 'Tenant not found', 'host': clean_host}, status=status.HTTP_404_NOT_FOUND)
        return Response(cached_payload)

    tenant = get_tenant_from_request(request)

    if not tenant or not tenant.is_active:
        cache.set(cache_key, False, 60)
        return Response({'error': 'Tenant not found', 'host': clean_host}, status=status.HTTP_404_NOT_FOUND)

    has_isolated_code = tenant.pages.filter(page_type=TenantPage.PageType.ISOLATED_CODE, is_published=True).exists()

    fav_url = request.build_absolute_uri(tenant.favicon.url) if tenant.favicon else (tenant.favicon_url or '/favicon.ico')
    lg_url = request.build_absolute_uri(tenant.logo.url) if tenant.logo else (tenant.logo_url or '')

    custom_fe = tenant.custom_frontend_url
    if not custom_fe:
        try:
            from .provisioner import get_tenant_container_names
            env_req = 'staging' if 'staging' in clean_host else 'prod'
            names = get_tenant_container_names(tenant, env=env_req)
            if names.get('is_standalone_repo') and names.get('frontend'):
                custom_fe = f"http://{names['frontend']}:3000"
        except Exception as prov_err:
            logger.warning(f"Error resolviendo custom_frontend_url para {tenant.subdomain}: {prov_err}")

    payload = {
        'id': str(tenant.id),
        'subdomain': tenant.subdomain,
        'name': tenant.name,
        'frontend_mode': tenant.frontend_mode,
        'use_custom_domain': tenant.use_custom_domain,
        'custom_domain': tenant.custom_domain,
        'custom_frontend_url': custom_fe,
        'is_standalone_repo': getattr(tenant, 'is_standalone_repo', False) or bool(custom_fe),
        'has_isolated_code': has_isolated_code,
        'theme_color': tenant.theme_color,
        'accent_color': tenant.accent_color,
        'logo_url': lg_url,
        'favicon_url': fav_url,
        'wallet_balance': float(tenant.wallet_balance),
    }

    cache.set(cache_key, payload, 600)
    return Response(payload)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def tenant_favicon(request, subdomain):
    """
    Entrega o redirige al favicon oficial del inquilino con cabeceras de caché perimetral.
    """
    from django.http import HttpResponseRedirect
    tenant = Tenant.objects.filter(subdomain=subdomain, is_active=True).first()
    if tenant and tenant.favicon:
        resp = HttpResponseRedirect(tenant.favicon.url)
        resp['Cache-Control'] = 'public, max-age=86400, must-revalidate'
        return resp
    elif tenant and tenant.favicon_url:
        resp = HttpResponseRedirect(tenant.favicon_url)
        resp['Cache-Control'] = 'public, max-age=86400, must-revalidate'
        return resp
    return HttpResponseRedirect('/favicon.ico')




@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def guest_auth(request):
    """
    Endpoint for final customers (CUSTOMER role) to authenticate or register in a Tenant context.
    Requires:
      - tenant_id (UUID)
      - email (string)
      - name (string) (optional, if require_customer_info is True)
    """
    tenant_id = request.data.get('tenant_id')
    email = request.data.get('email')
    name = request.data.get('name', '').strip()
    
    tenant = None
    if tenant_id:
        try:
            tenant = Tenant.objects.filter(id=uuid.UUID(tenant_id), is_active=True).first()
        except ValueError:
            return Response({'error': 'Formato de tenant_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not tenant:
            return Response({'error': 'Tenant no encontrado o inactivo.'}, status=status.HTTP_404_NOT_FOUND)
        
    user_exists = User.objects.filter(email=email).exists() if email else False

    require_name = True
    if tenant:
        require_name = tenant.require_customer_info

    if require_name and not user_exists and not name:
        return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not email:
        # Generate a unique guest email dynamically
        email = f"guest_{uuid.uuid4().hex[:8]}@nectarlabs.dev"
        
    # Get or create User associated with this tenant
    # Since username is unique, we slugify or use email as username
    user = User.objects.filter(email=email).first()
    
    if user:
        # Always update tenant context for CUSTOMER users to match current portal (can be None)
        if user.role == User.Role.CUSTOMER and user.tenant != tenant:
            if user.tenant is not None:
                return Response({'error': 'Unauthorized access'}, status=status.HTTP_403_FORBIDDEN)
            user.tenant = tenant
            user.save()
    else:
        # Create a new CUSTOMER user
        username = email.split('@')[0]
        # Ensure username uniqueness
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        first_name = name.split(' ')[0] if name else ''
        last_name = ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else ''
        
        user = User.objects.create_user(
            email=email,
            username=username,
            password=User.objects.make_random_password(),
            role=User.Role.CUSTOMER,
            first_name=first_name,
            last_name=last_name,
            tenant=tenant
        )

    # Verify user is CUSTOMER of this tenant or belongs to it (or is staff/owner of tenant, or is direct customer if tenant is None)
    is_staff = user.is_staff or user.role == 'ADMIN'
    is_owner = tenant and (tenant.owner == user)
    is_customer = user.role == User.Role.CUSTOMER and user.tenant == tenant
    
    if not (is_staff or is_owner or is_customer):
        return Response({'error': 'Unauthorized access'}, status=status.HTTP_403_FORBIDDEN)
        
    # Generate simple JWT tokens
    refresh = RefreshToken.for_user(user)
    
    # Customize token payload if needed (normally done in claims, but return in dict)
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'email': user.email,
        'username': user.username,
        'user_role': user.role,
        'is_staff': user.is_staff or user.role in ['ADMIN', 'BUSINESS']
    })
