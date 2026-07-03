from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.tenants.permissions import HasAddOnPermission
from .models import (
    DeliveryConfig, Vehicle, VehicleLocation, Stop,
    DriverProfile, DeliveryOrder, StoreConfig
)
from .serializers import (
    DeliveryConfigSerializer, VehicleSerializer, VehicleLocationSerializer, StopSerializer,
    DriverProfileSerializer, DriverLocationUpdateSerializer,
    DeliveryOrderSerializer, AssignDriverRequestSerializer,
    StoreConfigSerializer
)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def _resolve_tenant(request):
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


def _is_tenant_admin(request, tenant):
    user = request.user
    return (
        user.is_authenticated and (
            user.is_staff
            or getattr(user, 'role', None) == 'ADMIN'
            or (getattr(user, 'role', None) == 'BUSINESS' and tenant.owner == user)
        )
    )


def _broadcast_driver_location(tenant_subdomain: str, driver_data: dict):
    """Broadcast driver location update via Django Channels if available."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"delivery_{tenant_subdomain}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "driver.location",
                    "data": driver_data,
                }
            )
    except Exception:
        # Channels not installed or not configured – silently skip real-time broadcast
        pass


# ──────────────────────────────────────────────
# Base ViewSet
# ──────────────────────────────────────────────
class BaseDeliveryViewSet(viewsets.ModelViewSet):
    addon_slug = 'delivery-tracking'

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def _resolve_tenant(self, request):
        return _resolve_tenant(request)


# ──────────────────────────────────────────────
# Existing ViewSets
# ──────────────────────────────────────────────
class DeliveryConfigViewSet(BaseDeliveryViewSet):
    serializer_class = DeliveryConfigSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def get_queryset(self):
        tenant = self._resolve_tenant(self.request)
        if not tenant:
            return DeliveryConfig.objects.none()
        DeliveryConfig.objects.get_or_create(tenant=tenant)
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

        if not _is_tenant_admin(request, tenant):
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

        location, _ = VehicleLocation.objects.update_or_create(
            vehicle=vehicle,
            defaults={'latitude': latitude, 'longitude': longitude}
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


# ──────────────────────────────────────────────
# Driver Profile ViewSet (global, not tenant-scoped)
# ──────────────────────────────────────────────
class DriverProfileViewSet(viewsets.ModelViewSet):
    serializer_class = DriverProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Staff / ADMIN sees all drivers
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return DriverProfile.objects.all()
        # Business owners see drivers assigned to their orders
        if getattr(user, 'role', None) == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if tenant:
                assigned_driver_ids = DeliveryOrder.objects.filter(
                    tenant=tenant
                ).values_list('driver_id', flat=True)
                return DriverProfile.objects.filter(id__in=assigned_driver_ids)
        # Drivers see their own profile
        try:
            return DriverProfile.objects.filter(user=user)
        except Exception:
            return DriverProfile.objects.none()

    @action(detail=True, methods=['post'], url_path='update-location')
    def update_location(self, request, pk=None):
        """Driver updates their own GPS location; broadcasts via WebSocket."""
        try:
            driver = DriverProfile.objects.get(pk=pk)
        except DriverProfile.DoesNotExist:
            return Response({"detail": "Repartidor no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Only the driver themselves or admins can update location
        if not (
            request.user.is_staff
            or getattr(request.user, 'role', None) == 'ADMIN'
            or (hasattr(request.user, 'driver_profile') and request.user.driver_profile.pk == driver.pk)
        ):
            return Response({"detail": "Permiso denegado."}, status=status.HTTP_403_FORBIDDEN)

        ser = DriverLocationUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        driver.current_latitude = ser.validated_data['latitude']
        driver.current_longitude = ser.validated_data['longitude']
        driver.location_updated_at = timezone.now()
        driver.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])

        # Broadcast to all tenants that have active orders with this driver
        active_order_tenants = DeliveryOrder.objects.filter(
            driver=driver,
            status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']
        ).values_list('tenant__subdomain', flat=True).distinct()

        broadcast_payload = {
            "driver_id": driver.pk,
            "driver_name": driver.name,
            "latitude": float(ser.validated_data['latitude']),
            "longitude": float(ser.validated_data['longitude']),
            "updated_at": driver.location_updated_at.isoformat(),
        }
        for subdomain in active_order_tenants:
            _broadcast_driver_location(subdomain, broadcast_payload)

        return Response(DriverProfileSerializer(driver).data)


# ──────────────────────────────────────────────
# Delivery Order + Driver Assignment
# ──────────────────────────────────────────────
class DeliveryOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DeliveryOrderSerializer

    def get_permissions(self):
        if self.action in ['retrieve', 'track']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        tenant = _resolve_tenant(self.request)
        if not tenant:
            return DeliveryOrder.objects.none()
        qs = DeliveryOrder.objects.filter(tenant=tenant)
        # Filter by ecommerce_order_id if provided
        oc_id = self.request.query_params.get('ecommerce_order_id')
        if oc_id:
            qs = qs.filter(ecommerce_order_id=oc_id)
        return qs.select_related('driver')

    def perform_create(self, serializer):
        tenant = _resolve_tenant(self.request)
        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido."})
        serializer.save(tenant=tenant)

    @action(detail=False, methods=['post'], url_path='assign-driver')
    def assign_driver(self, request):
        """
        Idempotent driver assignment endpoint.
        1. Checks if order already has a driver → returns existing.
        2. Finds nearest available driver within radius.
        3. Marks driver busy (if max_concurrent_orders reached) and links to order.
        """
        ser = AssignDriverRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        tenant = _resolve_tenant(request)
        if not tenant:
            return Response({"detail": "Tenant no encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Idempotency check ──
        idempotency_key = d.get('idempotency_key')
        if idempotency_key:
            existing = DeliveryOrder.objects.filter(
                tenant=tenant, idempotency_key=idempotency_key
            ).select_related('driver').first()
            if existing:
                return Response(DeliveryOrderSerializer(existing).data, status=status.HTTP_200_OK)

        # ── Resolve the DeliveryOrder ──
        order = None
        delivery_order_id = d.get('delivery_order_id')
        ecommerce_order_id = d.get('ecommerce_order_id')

        if delivery_order_id:
            try:
                order = DeliveryOrder.objects.select_related('driver').get(
                    pk=delivery_order_id, tenant=tenant
                )
            except DeliveryOrder.DoesNotExist:
                return Response({"detail": "Orden de entrega no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        elif ecommerce_order_id:
            order = DeliveryOrder.objects.select_related('driver').filter(
                tenant=tenant, ecommerce_order_id=ecommerce_order_id
            ).first()

        if order is None:
            return Response({"detail": "Se requiere delivery_order_id o ecommerce_order_id."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Already has a driver? Return current state ──
        if order.driver is not None and order.status not in [
            DeliveryOrder.Status.CANCELLED, DeliveryOrder.Status.FAILED
        ]:
            return Response(DeliveryOrderSerializer(order).data, status=status.HTTP_200_OK)

        origin_lat = float(d['origin_latitude'])
        origin_lon = float(d['origin_longitude'])
        radius_km = d.get('radius_km', 30)

        # ── Try preferred driver first ──
        preferred_id = d.get('preferred_driver_id')
        assigned_driver = None

        if preferred_id:
            try:
                preferred = DriverProfile.objects.get(pk=preferred_id)
                if preferred.can_accept_order:
                    assigned_driver = preferred
            except DriverProfile.DoesNotExist:
                pass

        # ── Nearest available driver fallback ──
        if not assigned_driver:
            candidates = DriverProfile.objects.nearest_available(origin_lat, origin_lon, radius_km)
            for _dist, dp in candidates:
                if dp.can_accept_order:
                    assigned_driver = dp
                    break

        if not assigned_driver:
            return Response(
                {"detail": "No hay repartidores disponibles en el área en este momento. Intenta de nuevo pronto."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # ── Assign ──
        order.driver = assigned_driver
        order.status = DeliveryOrder.Status.ASSIGNED
        if idempotency_key:
            order.idempotency_key = idempotency_key
        order.save(update_fields=['driver', 'status', 'idempotency_key'])

        # Mark driver busy if fully loaded
        if not assigned_driver.can_accept_order:
            assigned_driver.is_available = False
            assigned_driver.save(update_fields=['is_available'])

        return Response(DeliveryOrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='track', permission_classes=[permissions.AllowAny])
    def track(self, request, pk=None):
        """Public tracking endpoint; returns order status + driver location."""
        try:
            order = DeliveryOrder.objects.select_related('driver').get(pk=pk)
        except DeliveryOrder.DoesNotExist:
            return Response({"detail": "Orden no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DeliveryOrderSerializer(order).data)


# ──────────────────────────────────────────────
# Store Config ViewSet (admin only)
# ──────────────────────────────────────────────
class StoreConfigViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _get_tenant_or_403(self, request):
        tenant = _resolve_tenant(request)
        if not tenant:
            return None, Response({"detail": "Tenant no encontrado."}, status=status.HTTP_400_BAD_REQUEST)
        if not _is_tenant_admin(request, tenant):
            return None, Response({"detail": "Acceso denegado."}, status=status.HTTP_403_FORBIDDEN)
        return tenant, None

    def list(self, request):
        tenant, err = self._get_tenant_or_403(request)
        if err:
            return err
        config, _ = StoreConfig.objects.get_or_create(tenant=tenant)
        return Response(StoreConfigSerializer(config).data)

    def create(self, request):
        return self.update(request)

    def update(self, request, pk=None):
        tenant, err = self._get_tenant_or_403(request)
        if err:
            return err
        config, _ = StoreConfig.objects.get_or_create(tenant=tenant)
        ser = StoreConfigSerializer(config, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(StoreConfigSerializer(config).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)
