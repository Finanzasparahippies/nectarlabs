from rest_framework import serializers
from .models import DeliveryConfig, Vehicle, VehicleLocation, Stop

class DeliveryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryConfig
        fields = ['id', 'tenant', 'map_center_latitude', 'map_center_longitude', 'zoom_level', 'enable_public_tracking']
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
        fields = ['id', 'tenant', 'vehicle', 'vehicle_name', 'name', 'address', 'latitude', 'longitude', 'scheduled_time', 'status', 'order']
        read_only_fields = ['id', 'tenant']
