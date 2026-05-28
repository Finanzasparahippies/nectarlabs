from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.tenants.permissions import HasAddOnPermission
from .models import DeliveryConfig, Vehicle, VehicleLocation, Stop
from .serializers import DeliveryConfigSerializer, VehicleSerializer, VehicleLocationSerializer, StopSerializer

class BaseDeliveryViewSet(viewsets.ModelViewSet):
    addon_slug = 'logistics-gps'

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

class DeliveryConfigViewSet(BaseDeliveryViewSet):
    serializer_class = DeliveryConfigSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return DeliveryConfig.objects.none()
        config, _ = DeliveryConfig.objects.get_or_create(tenant=tenant)
        return DeliveryConfig.objects.filter(tenant=tenant)

class VehicleViewSet(BaseDeliveryViewSet):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return Vehicle.objects.none()
        return Vehicle.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
        serializer.save(tenant=tenant)

class VehicleLocationViewSet(BaseDeliveryViewSet):
    serializer_class = VehicleLocationSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return VehicleLocation.objects.none()
        return VehicleLocation.objects.filter(vehicle__tenant=tenant)

    @action(detail=False, methods=['post'], url_path='update')
    def update_location(self, request):
        tenant = self._resolve_tenant(request)
        if not tenant:
            return Response({"detail": "Se requiere especificar un tenant válido."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not (user.is_staff or getattr(user, 'role', None) == 'ADMIN' or (getattr(user, 'role', None) == 'BUSINESS' and tenant.owner == user)):
            return Response({"detail": "No tienes permisos para actualizar ubicaciones de este tenant."}, status=status.HTTP_403_FORBIDDEN)

        vehicle_id = request.data.get('vehicle_id')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if not vehicle_id or latitude is None or longitude is None:
            return Response({"detail": "vehicle_id, latitude, and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id, tenant=tenant)
        except Vehicle.DoesNotExist:
            return Response({"detail": "Vehículo no encontrado o no pertenece a este tenant."}, status=status.HTTP_404_NOT_FOUND)

        location, created = VehicleLocation.objects.update_or_create(
            vehicle=vehicle,
            defaults={
                'latitude': latitude,
                'longitude': longitude
            }
        )

        serializer = VehicleLocationSerializer(location)
        return Response(serializer.data)

class StopViewSet(BaseDeliveryViewSet):
    serializer_class = StopSerializer

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return Stop.objects.none()
        
        queryset = Stop.objects.filter(tenant=tenant)
        vehicle_id = self.request.query_params.get('vehicle_id')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset.order_by('order', 'scheduled_time')

    def perform_create(self, serializer):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
        
        vehicle_id = self.request.data.get('vehicle')
        if vehicle_id:
            try:
                Vehicle.objects.get(id=vehicle_id, tenant=tenant)
            except Vehicle.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"vehicle": "El vehículo especificado no pertenece a este inquilino."})
                
        serializer.save(tenant=tenant)
