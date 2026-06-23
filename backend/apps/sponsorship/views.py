from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from apps.tenants.permissions import HasAddOnPermission
from .models import SponsorshipConfig, SponsorTarget, SponsorshipTier, Sponsorship, SponsorshipUpdateTag, SponsorshipUpdate
from .serializers import (
    SponsorshipConfigSerializer, SponsorTargetSerializer, SponsorshipTierSerializer, SponsorshipSerializer,
    SponsorshipUpdateTagSerializer, SponsorshipUpdateSerializer
)
from .utils import get_checkout_session

class BaseSponsorshipViewSet(viewsets.ModelViewSet):
    addon_slug = 'sponsorship'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def _resolve_tenant(self, request):
        tenant = None
        user = request.user
        if user and user.is_authenticated:
            if getattr(user, 'tenant', None):
                tenant = user.tenant
            elif getattr(user, 'role', None) == 'BUSINESS':
                tenant = user.owned_tenants.first()
        
        if not tenant:
            tenant_id = request.data.get('tenant_id') or request.query_params.get('tenant_id')
            subdomain = request.data.get('subdomain') or request.query_params.get('subdomain')
            from apps.tenants.models import Tenant
            if tenant_id:
                try:
                    tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
                except Exception:
                    pass
            elif subdomain:
                tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()
        return tenant

class SponsorshipConfigViewSet(BaseSponsorshipViewSet):
    serializer_class = SponsorshipConfigSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return SponsorshipConfig.objects.none()
        config, _ = SponsorshipConfig.objects.get_or_create(tenant=tenant)
        return SponsorshipConfig.objects.filter(tenant=tenant)

class SponsorTargetViewSet(BaseSponsorshipViewSet):
    serializer_class = SponsorTargetSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return SponsorTarget.objects.none()
        return SponsorTarget.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
            
        if tenant.is_in_trial:
            existing_targets = SponsorTarget.objects.filter(tenant=tenant).count()
            if existing_targets >= 2:
                from rest_framework import serializers as api_serializers
                raise api_serializers.ValidationError({
                    "detail": "El período de prueba está limitado a un máximo de 2 metas de patrocinio. Por favor, actualiza tu plan para agregar más."
                })
        serializer.save(tenant=tenant)

class SponsorshipTierViewSet(BaseSponsorshipViewSet):
    serializer_class = SponsorshipTierSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return SponsorshipTier.objects.none()
        return SponsorshipTier.objects.filter(tenant=tenant, is_active=True).order_by('level')

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
            
        if tenant.is_in_trial:
            existing_tiers = SponsorshipTier.objects.filter(tenant=tenant).count()
            if existing_tiers >= 3:
                from rest_framework import serializers as api_serializers
                raise api_serializers.ValidationError({
                    "detail": "El período de prueba está limitado a un máximo de 3 niveles (tiers) de patrocinio. Por favor, actualiza tu plan para agregar más."
                })
        serializer.save(tenant=tenant)

class SponsorshipUpdateTagViewSet(BaseSponsorshipViewSet):
    serializer_class = SponsorshipUpdateTagSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return SponsorshipUpdateTag.objects.none()
        return SponsorshipUpdateTag.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
        serializer.save(tenant=tenant)

class SponsorshipUpdateViewSet(BaseSponsorshipViewSet):
    serializer_class = SponsorshipUpdateSerializer

    def get_queryset(self):
        request = self.request
        tenant = self._resolve_tenant(request)
        if not tenant:
            return SponsorshipUpdate.objects.none()

        max_level = 0
        if request.user and request.user.is_authenticated:
            # Check active sponsorships for the specific tenant
            active_sponsorships = Sponsorship.objects.filter(user=request.user, tenant=tenant, active=True)
            for s in active_sponsorships:
                if s.tier and s.tier.level > max_level:
                    max_level = s.tier.level

        # Staff, Admin, or the Tenant owner can view all updates for the tenant
        is_privileged = False
        if request.user and request.user.is_authenticated:
            if request.user.is_staff or getattr(request.user, 'role', None) == 'ADMIN' or (getattr(request.user, 'role', None) == 'BUSINESS' and tenant.owner == request.user):
                is_privileged = True

        if is_privileged:
            queryset = SponsorshipUpdate.objects.filter(tenant=tenant)
        else:
            queryset = SponsorshipUpdate.objects.filter(tenant=tenant, min_tier_level__lte=max_level)

        # Search filter
        search_query = request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(content__icontains=search_query)
            )

        # Tag filter
        tag_slug = request.query_params.get('tag')
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        return queryset.distinct().order_by('-created_at')

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
            
        if tenant.is_in_trial:
            existing_updates = SponsorshipUpdate.objects.filter(tenant=tenant).count()
            if existing_updates >= 5:
                from rest_framework import serializers as api_serializers
                raise api_serializers.ValidationError({
                    "detail": "El período de prueba está limitado a un máximo de 5 publicaciones de actualización. Por favor, actualiza tu plan para agregar más."
                })
        serializer.save(tenant=tenant, author=self.request.user)

class SponsorshipViewSet(viewsets.ModelViewSet):
    serializer_class = SponsorshipSerializer
    addon_slug = 'sponsorship'

    def get_permissions(self):
        if self.action in ['create_checkout_session']:
            return [permissions.IsAuthenticated(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def get_queryset(self):
        user = self.request.user
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return Sponsorship.objects.none()

        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return Sponsorship.objects.filter(tenant=tenant).order_by('-start_date')
        elif getattr(user, 'role', None) == 'BUSINESS' and tenant.owner == user:
            return Sponsorship.objects.filter(tenant=tenant).order_by('-start_date')
        return Sponsorship.objects.filter(tenant=tenant, user=user).order_by('-start_date')

    @action(detail=False, methods=['post'], url_path='checkout')
    def create_checkout_session(self, request):
        tier_id = request.data.get('tier_id')
        target_id = request.data.get('target_id')
        is_annual = request.data.get('is_annual', False)
        
        tenant = self._resolve_tenant(request)
        if not tenant:
            return Response({'error': 'Se requiere especificar un tenant válido.'}, status=400)

        success_url = request.data.get('success_url', f"http://{(tenant.custom_domain if tenant.use_custom_domain else None) or f'{tenant.subdomain}.nectarlabs.localhost'}/success")
        cancel_url = request.data.get('cancel_url', f"http://{(tenant.custom_domain if tenant.use_custom_domain else None) or f'{tenant.subdomain}.nectarlabs.localhost'}/cancel")

        try:
            tier = SponsorshipTier.objects.get(id=tier_id, tenant=tenant)
            session = get_checkout_session(request.user, tier, success_url, cancel_url, target_id, is_annual)
            return Response({'checkout_url': session.url})
        except SponsorshipTier.DoesNotExist:
            return Response({'error': 'Tier no encontrado para este tenant.'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    def _resolve_tenant(self, request):
        tenant = None
        user = request.user
        if user and user.is_authenticated:
            if getattr(user, 'tenant', None):
                tenant = user.tenant
            elif getattr(user, 'role', None) == 'BUSINESS':
                tenant = user.owned_tenants.first()
        
        if not tenant:
            tenant_id = request.data.get('tenant_id') or request.query_params.get('tenant_id')
            subdomain = request.data.get('subdomain') or request.query_params.get('subdomain')
            from apps.tenants.models import Tenant
            if tenant_id:
                try:
                    tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
                except Exception:
                    pass
            elif subdomain:
                tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()
        return tenant
