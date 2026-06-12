from rest_framework import serializers
from .models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)
    active_addons = serializers.ReadOnlyField()
    owner_email = serializers.SerializerMethodField()
    
    custom_smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    skydropx_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    
    has_custom_smtp_password = serializers.SerializerMethodField()
    has_skydropx_api_key = serializers.SerializerMethodField()
    is_ambassador = serializers.ReadOnlyField()
    free_stamps_left = serializers.ReadOnlyField()
    subscriber_count = serializers.SerializerMethodField()
    has_active_plan_contract = serializers.ReadOnlyField()
    is_addons_only = serializers.ReadOnlyField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'owner', 'owner_email', 'api_key', 
            'allowed_origins', 'custom_domain', 'welcome_message', 'require_customer_info',
            'logo', 'logo_url', 'portal_title', 'footer_text', 'is_active', 'created_at', 'updated_at',
            'active_addons', 'stamp_balance', 'newsletter_plan', 'newsletter_sent_this_month', 'newsletter_extra_credits',
            'invoicing_mode', 'has_active_plan_contract', 'is_addons_only',
            # 6-Color Palette (Dark & Light)
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color',
            'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light',
            # Pollen/Nectar Falling settings
            'pollen_active', 'pollen_icon', 'pollen_color', 'pollen_count', 'pollen_blur',
            
            # SMTP custom
            'custom_smtp_host', 'custom_smtp_port', 'custom_smtp_username', 'custom_smtp_password',
            'custom_smtp_use_tls', 'custom_smtp_from_email', 'has_custom_smtp_password',
            
            # Skydropx
            'skydropx_api_key', 'has_skydropx_api_key', 'shipping_markup_percentage',
            'shipping_origin_name', 'shipping_origin_phone', 'shipping_origin_street',
            'shipping_origin_suburb', 'shipping_origin_city', 'shipping_origin_state', 'shipping_origin_zip_code',
            
            # Ambassador & Stamps
            'is_ambassador', 'free_stamps_left', 'stamps_used_this_month', 'stamps_last_reset',
            
            # Newsletter
            'subscriber_count'
        ]
        read_only_fields = [
            'id', 'owner', 'api_key', 'created_at', 'updated_at', 
            'is_ambassador', 'free_stamps_left', 'stamps_used_this_month', 'stamps_last_reset',
            'subscriber_count', 'has_active_plan_contract', 'is_addons_only'
        ]

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def get_has_custom_smtp_password(self, obj):
        return bool(obj.custom_smtp_password)

    def get_has_skydropx_api_key(self, obj):
        return bool(obj.skydropx_api_key)

    def get_subscriber_count(self, obj):
        return obj.subscribers.filter(is_active=True).count()

    def validate_invoicing_mode(self, value):
        if value == 'AUTOMATIC':
            # Check if tenant has the automatic-invoicing addon active
            # self.instance represents the tenant being updated
            if self.instance:
                if 'automatic-invoicing' not in self.instance.active_addons:
                    raise serializers.ValidationError(
                        "Para activar la facturación automática, debes tener contratado el agregado de facturación automática (automatic-invoicing)."
                    )
        return value

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
    has_active_plan_contract = serializers.ReadOnlyField()
    is_addons_only = serializers.ReadOnlyField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'logo_url', 
            'welcome_message', 'require_customer_info', 'active_addons',
            'portal_title', 'footer_text', 'has_active_plan_contract', 'is_addons_only',
            'is_active', 'owner',
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

