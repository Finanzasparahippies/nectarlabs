from rest_framework import serializers
from .models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)
    active_addons = serializers.ReadOnlyField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'owner', 'owner_email', 'api_key', 
            'allowed_origins', 'custom_domain', 'welcome_message', 'require_customer_info',
            'logo', 'logo_url', 'portal_title', 'footer_text', 'is_active', 'created_at', 'updated_at',
            'active_addons',
            # 6-Color Palette (Dark & Light)
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color',
            'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light',
            # Pollen/Nectar Falling settings
            'pollen_active', 'pollen_icon', 'pollen_color', 'pollen_count', 'pollen_blur'
        ]
        read_only_fields = ['id', 'owner', 'api_key', 'created_at', 'updated_at']

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

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
            # 6-Color Palette (Dark & Light)
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color',
            'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light',
            # Pollen/Nectar Falling settings
            'pollen_active', 'pollen_icon', 'pollen_color', 'pollen_count', 'pollen_blur'
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return obj.logo_url

