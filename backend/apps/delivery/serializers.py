from rest_framework import serializers
from .models import (
    DeliveryConfig, Vehicle, VehicleLocation, Stop,
    DriverProfile, DeliveryOrder, StoreConfig
)


class DeliveryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryConfig
        fields = [
            'id', 'tenant', 'map_center_latitude', 'map_center_longitude',
            'zoom_level', 'enable_public_tracking', 'enable_realtime',
            'driver_search_radius_km'
        ]
        read_only_fields = ['id', 'tenant']


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'tenant', 'name', 'plate_number', 'driver_name', 'is_active', 'vehicle_type']
        read_only_fields = ['id', 'tenant']


class VehicleLocationSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.ReadOnlyField(source='vehicle.name')

    class Meta:
        model = VehicleLocation
        fields = ['id', 'vehicle', 'vehicle_name', 'latitude', 'longitude', 'updated_at']
        read_only_fields = ['id', 'updated_at']


class StopSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.ReadOnlyField(source='vehicle.name')

    class Meta:
        model = Stop
        fields = [
            'id', 'tenant', 'vehicle', 'vehicle_name', 'name',
            'address', 'latitude', 'longitude', 'scheduled_time', 'status', 'order'
        ]
        read_only_fields = ['id', 'tenant']


# ──────────────────────────────────────────────
# Driver Profile
# ──────────────────────────────────────────────
class DriverProfileSerializer(serializers.ModelSerializer):
    active_order_count = serializers.ReadOnlyField()
    can_accept_order = serializers.ReadOnlyField()

    class Meta:
        model = DriverProfile
        fields = [
            'id', 'name', 'phone', 'email', 'vehicle_type', 'plate_number',
            'is_available', 'current_latitude', 'current_longitude', 'location_updated_at',
            'max_concurrent_orders', 'is_verified',
            'active_order_count', 'can_accept_order',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'location_updated_at', 'is_verified']


class DriverLocationUpdateSerializer(serializers.Serializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)


# ──────────────────────────────────────────────
# Delivery Order
# ──────────────────────────────────────────────
class DeliveryOrderSerializer(serializers.ModelSerializer):
    driver_name = serializers.ReadOnlyField(source='driver.name')
    driver_phone = serializers.ReadOnlyField(source='driver.phone')
    driver_latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        source='driver.current_latitude', read_only=True
    )
    driver_longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        source='driver.current_longitude', read_only=True
    )

    class Meta:
        model = DeliveryOrder
        fields = [
            'id', 'tenant', 'ecommerce_order_id', 'idempotency_key',
            'driver', 'driver_name', 'driver_phone',
            'driver_latitude', 'driver_longitude',
            'shipment_type', 'status',
            'recipient_name', 'recipient_phone',
            'delivery_address', 'delivery_latitude', 'delivery_longitude',
            'skydropx_shipment_id', 'tracking_number', 'tracking_url', 'courier',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tenant', 'driver', 'driver_name', 'driver_phone',
            'driver_latitude', 'driver_longitude',
            'skydropx_shipment_id', 'tracking_number', 'tracking_url', 'courier',
            'created_at', 'updated_at'
        ]


class AssignDriverRequestSerializer(serializers.Serializer):
    delivery_order_id = serializers.IntegerField(required=False)
    ecommerce_order_id = serializers.IntegerField(required=False)
    idempotency_key = serializers.CharField(max_length=128, required=False)
    preferred_driver_id = serializers.IntegerField(required=False, allow_null=True)
    # Pickup origin coords (tenant store)
    origin_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    origin_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=True)
    radius_km = serializers.IntegerField(required=False, default=30, min_value=1, max_value=200)


# ──────────────────────────────────────────────
# Store Config
# ──────────────────────────────────────────────
class StoreConfigSerializer(serializers.ModelSerializer):
    available_box_sizes_list = serializers.ReadOnlyField(source='get_available_box_sizes_list')

    class Meta:
        model = StoreConfig
        fields = [
            'id', 'tenant',
            'origin_photo_url',
            'available_box_sizes', 'available_box_sizes_list',
            'custom_box_length_cm', 'custom_box_width_cm',
            'custom_box_height_cm', 'custom_box_weight_kg',
            'shipment_category',
            'offers_local_delivery', 'offers_national_shipping',
            'skydropx_api_key',
            'shipping_markup_percentage',
            'origin_name', 'origin_phone', 'origin_street',
            'origin_suburb', 'origin_city', 'origin_state',
            'origin_zip_code', 'origin_country',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']
        extra_kwargs = {
            # Never send the API key value back to client — mask it
            'skydropx_api_key': {'write_only': True}
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Indicate whether a key is stored without exposing it
        data['has_skydropx_api_key'] = bool(instance.skydropx_api_key)
        return data
