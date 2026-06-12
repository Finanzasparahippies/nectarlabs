from django.contrib import admin
from .models import DeliveryConfig, Vehicle, VehicleLocation, Stop


@admin.register(DeliveryConfig)
class DeliveryConfigAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'map_center_latitude', 'map_center_longitude', 'zoom_level', 'enable_public_tracking')
    search_fields = ('tenant__name', 'tenant__subdomain')


class VehicleLocationInline(admin.StackedInline):
    model = VehicleLocation
    extra = 0
    readonly_fields = ('updated_at',)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'plate_number', 'driver_name', 'is_active')
    list_filter = ('is_active', 'tenant')
    search_fields = ('name', 'plate_number', 'driver_name', 'tenant__name')
    inlines = [VehicleLocationInline]


@admin.register(VehicleLocation)
class VehicleLocationAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'latitude', 'longitude', 'updated_at')
    readonly_fields = ('updated_at',)
    search_fields = ('vehicle__name',)


@admin.register(Stop)
class StopAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'vehicle', 'status', 'scheduled_time', 'order')
    list_filter = ('status', 'tenant', 'scheduled_time')
    search_fields = ('name', 'address', 'tenant__name', 'vehicle__name')
    ordering = ('order', 'scheduled_time')
