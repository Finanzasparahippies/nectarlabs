from rest_framework import serializers
from .models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'owner', 'api_key', 
            'allowed_origins', 'custom_domain', 'welcome_message', 'require_customer_info',
            'logo', 'logo_url', 'portal_title', 'footer_text', 'is_active', 'created_at', 'updated_at',
            # 6-Color Palette
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color'
        ]
        read_only_fields = ['id', 'owner', 'api_key', 'created_at', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.logo:
            request = self.context.get('request')
            if request:
                ret['logo_url'] = request.build_absolute_uri(instance.logo.url)
            else:
                ret['logo_url'] = instance.logo.url
        return ret


class TenantPublicSerializer(serializers.ModelSerializer):
    active_addons = serializers.ReadOnlyField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'logo_url', 
            'welcome_message', 'require_customer_info', 'active_addons',
            'portal_title', 'footer_text',
            # 6-Color Palette
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color'
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return obj.logo_url

