from django.db import models

class DeliveryConfig(models.Model):
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='delivery_config')
    map_center_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=33.4484)
    map_center_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=-112.0740)
    zoom_level = models.IntegerField(default=12)
    enable_public_tracking = models.BooleanField(default=True)

    def __str__(self):
        return f"Configuración Logística para {self.tenant.subdomain}"

class Vehicle(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='vehicles')
    name = models.CharField(max_length=200)
    plate_number = models.CharField(max_length=50, null=True, blank=True)
    driver_name = models.CharField(max_length=200, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.plate_number or 'Sin Placas'}) - {self.tenant.subdomain}"

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
