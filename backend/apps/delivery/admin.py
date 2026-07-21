from django.contrib import admin
from .models import DeliveryConfig, Vehicle, VehicleLocation, Stop, DriverProfile, DeliveryOrder, StoreConfig


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


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'vehicle_type', 'is_available', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'is_available', 'vehicle_type')
    search_fields = ('name', 'email', 'phone', 'plate_number')
    actions = ['verify_drivers', 'unverify_drivers']

    def verify_drivers(self, request, queryset):
        queryset.update(is_verified=True)
        self.message_user(request, "Los conductores seleccionados han sido autorizados.")
    verify_drivers.short_description = "Autorizar conductores seleccionados"

    def unverify_drivers(self, request, queryset):
        queryset.update(is_verified=False)
        self.message_user(request, "Los conductores seleccionados han sido desautorizados.")
    unverify_drivers.short_description = "Desautorizar conductores seleccionados"


@admin.register(DeliveryOrder)
class DeliveryOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'tenant', 'driver', 'recipient_name', 'status', 'created_at')
    list_filter = ('status', 'tenant')
    search_fields = ('recipient_name', 'delivery_address', 'recipient_phone')


@admin.register(StoreConfig)
class StoreConfigAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'origin_name', 'offers_local_delivery', 'offers_national_shipping')
    search_fields = ('tenant__name', 'origin_name')

