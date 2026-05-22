from rest_framework import serializers
from .models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'owner', 'api_key', 
            'allowed_origins', 'custom_domain', 'theme_color', 
            'logo_url', 'welcome_message', 'require_customer_info',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'api_key', 'created_at', 'updated_at']


class TenantPublicSerializer(serializers.ModelSerializer):
    active_addons = serializers.ReadOnlyField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'theme_color', 'logo_url', 
            'welcome_message', 'require_customer_info', 'active_addons'
        ]

