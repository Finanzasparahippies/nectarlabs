from django.db import models
from django.conf import settings
from django.db.models import Q
import math


# ──────────────────────────────────────────────
# Haversine helper (no PostGIS required)
# ──────────────────────────────────────────────
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ──────────────────────────────────────────────
# Existing Models
# ──────────────────────────────────────────────
class DeliveryConfig(models.Model):
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='delivery_config')
    map_center_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=33.4484)
    map_center_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=-112.0740)
    zoom_level = models.IntegerField(default=12)
    enable_public_tracking = models.BooleanField(default=True)
    # Real-time via WebSocket
    enable_realtime = models.BooleanField(default=True)
    # Driver search radius (km)
    driver_search_radius_km = models.PositiveIntegerField(default=30)

    def __str__(self):
        return f"Configuración Logística para {self.tenant.subdomain}"


class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        BICYCLE = 'BICYCLE', 'Bicicleta'
        MOTORCYCLE = 'MOTORCYCLE', 'Motocicleta'
        CAR = 'CAR', 'Automóvil'
        VAN = 'VAN', 'Camioneta'

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='vehicles')
    name = models.CharField(max_length=200)
    plate_number = models.CharField(max_length=50, null=True, blank=True)
    driver_name = models.CharField(max_length=200, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.MOTORCYCLE
    )

    def __str__(self):
        return f"{self.name} ({self.get_vehicle_type_display()}) - {self.tenant.subdomain}"


class VehicleLocation(models.Model):
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='location')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ubicación de {self.vehicle.name} en {self.updated_at}"


class Stop(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ARRIVED = 'ARRIVED', 'Arrived'
        DEPARTED = 'DEPARTED', 'Departed'

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='stops')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='stops')
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=500)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    scheduled_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'scheduled_time']

    def __str__(self):
        return f"{self.name} (Tenant: {self.tenant.subdomain})"


# ──────────────────────────────────────────────
# NEW: Independent Driver Profile
# ──────────────────────────────────────────────
class DriverProfileManager(models.Manager):
    def nearest_available(self, origin_lat: float, origin_lon: float, radius_km: int = 30):
        """
        Returns QuerySet of DriverProfile sorted by haversine distance from origin,
        filtered to available drivers within radius_km.
        """
        candidates = self.filter(is_available=True, current_latitude__isnull=False)
        results = []
        for dp in candidates:
            dist = haversine_km(origin_lat, origin_lon,
                                float(dp.current_latitude), float(dp.current_longitude))
            if dist <= radius_km:
                results.append((dist, dp))
        results.sort(key=lambda x: x[0])
        # Return list of (distance_km, DriverProfile) tuples
        return results


class DriverProfile(models.Model):
    """
    Independent driver user, not scoped to a single tenant.
    Drivers register globally and can receive orders from any tenant.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='driver_profile',
        null=True, blank=True
    )
    # Flat contact for drivers not yet in the auth system
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    vehicle_type = models.CharField(
        max_length=20,
        choices=Vehicle.VehicleType.choices,
        default=Vehicle.VehicleType.MOTORCYCLE
    )
    plate_number = models.CharField(max_length=50, null=True, blank=True)

    # Availability & location
    is_available = models.BooleanField(default=True)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)

    max_concurrent_orders = models.PositiveSmallIntegerField(default=1)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = DriverProfileManager()

    class Meta:
        verbose_name = 'Perfil de Repartidor'
        verbose_name_plural = 'Perfiles de Repartidores'

    def __str__(self):
        return f"{self.name} ({'Disponible' if self.is_available else 'Ocupado'})"

    @property
    def active_order_count(self):
        return self.delivery_orders.filter(
            status__in=['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']
        ).count()

    @property
    def can_accept_order(self):
        return self.is_available and self.active_order_count < self.max_concurrent_orders


# ──────────────────────────────────────────────
# NEW: Delivery Order (links shop order → driver)
# ──────────────────────────────────────────────
class DeliveryOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente de asignación'
        ASSIGNED = 'ASSIGNED', 'Repartidor asignado'
        PICKED_UP = 'PICKED_UP', 'Recogido'
        IN_TRANSIT = 'IN_TRANSIT', 'En camino'
        DELIVERED = 'DELIVERED', 'Entregado'
        FAILED = 'FAILED', 'Fallido / No entregado'
        CANCELLED = 'CANCELLED', 'Cancelado'

    class ShipmentType(models.TextChoices):
        LOCAL = 'LOCAL', 'Entrega local (repartidor)'
        NATIONAL = 'NATIONAL', 'Envío nacional (paquetería)'

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='delivery_orders')
    # Reference to e-commerce order (loose FK to avoid circular imports)
    ecommerce_order_id = models.PositiveIntegerField(null=True, blank=True)
    # Idempotency key supplied by client
    idempotency_key = models.CharField(max_length=128, unique=True, null=True, blank=True)

    driver = models.ForeignKey(
        DriverProfile, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='delivery_orders'
    )
    shipment_type = models.CharField(
        max_length=20, choices=ShipmentType.choices, default=ShipmentType.LOCAL
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Recipient
    recipient_name = models.CharField(max_length=200)
    recipient_phone = models.CharField(max_length=30, null=True, blank=True)
    delivery_address = models.TextField()
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Skydropx national shipment
    skydropx_shipment_id = models.CharField(max_length=200, null=True, blank=True)
    tracking_number = models.CharField(max_length=200, null=True, blank=True)
    tracking_url = models.URLField(null=True, blank=True)
    courier = models.CharField(max_length=100, null=True, blank=True)

    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Orden de Entrega'
        verbose_name_plural = 'Órdenes de Entrega'

    def __str__(self):
        return f"Orden #{self.pk} — {self.get_status_display()} ({self.tenant.subdomain})"


# ──────────────────────────────────────────────
# NEW: Store Config (box sizes, origin photo, etc.)
# ──────────────────────────────────────────────
BOX_SIZE_CHOICES = [
    ('XS', 'XS — 15×10×5 cm'),
    ('S', 'S — 25×20×15 cm'),
    ('M', 'M — 35×30×25 cm'),
    ('L', 'L — 50×40×30 cm'),
    ('XL', 'XL — 70×50×40 cm'),
    ('CUSTOM', 'Personalizada'),
]

SHIPMENT_CATEGORY_CHOICES = [
    ('FOOD_LOCAL', 'Comida / entrega local'),
    ('DOCUMENT', 'Documentos'),
    ('FRAGILE', 'Artículos frágiles'),
    ('ELECTRONICS', 'Electrónicos'),
    ('CLOTHING', 'Ropa / accesorios'),
    ('GENERAL', 'Mercancía general'),
]


class StoreConfig(models.Model):
    """
    Admin-only configuration: origin details, box sizes, product category,
    and Skydropx API key for national courier integration.
    """
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='store_config')

    # Origin location photo
    origin_photo_url = models.URLField(null=True, blank=True)

    # Box sizes available for this store (comma-separated codes, e.g. "XS,S,M")
    available_box_sizes = models.CharField(max_length=200, default='S,M,L')

    # Default box dimensions for custom size
    custom_box_length_cm = models.PositiveIntegerField(null=True, blank=True)
    custom_box_width_cm = models.PositiveIntegerField(null=True, blank=True)
    custom_box_height_cm = models.PositiveIntegerField(null=True, blank=True)
    custom_box_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Shipment category
    shipment_category = models.CharField(
        max_length=30, choices=SHIPMENT_CATEGORY_CHOICES, default='GENERAL'
    )

    # Delivery modality
    offers_local_delivery = models.BooleanField(default=True)
    offers_national_shipping = models.BooleanField(default=False)

    # Skydropx (national courier gateway)
    skydropx_api_key = models.CharField(max_length=300, null=True, blank=True)
    # Markup over courier rates (%)
    shipping_markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)

    # Origin address for Skydropx shipments
    origin_name = models.CharField(max_length=200, null=True, blank=True)
    origin_phone = models.CharField(max_length=30, null=True, blank=True)
    origin_street = models.CharField(max_length=500, null=True, blank=True)
    origin_suburb = models.CharField(max_length=200, null=True, blank=True)
    origin_city = models.CharField(max_length=200, null=True, blank=True)
    origin_state = models.CharField(max_length=200, null=True, blank=True)
    origin_zip_code = models.CharField(max_length=20, null=True, blank=True)
    origin_country = models.CharField(max_length=5, default='MX')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Tienda'
        verbose_name_plural = 'Configuraciones de Tienda'

    def __str__(self):
        return f"StoreConfig — {self.tenant.subdomain}"

    def get_available_box_sizes_list(self):
        return [s.strip() for s in self.available_box_sizes.split(',') if s.strip()]
