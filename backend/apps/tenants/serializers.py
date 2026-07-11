from rest_framework import serializers
from .models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)
    active_addons = serializers.ReadOnlyField()
    owner_email = serializers.SerializerMethodField()
    
    custom_smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    skydropx_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    stripe_secret_key = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    
    has_custom_smtp_password = serializers.SerializerMethodField()
    has_skydropx_api_key = serializers.SerializerMethodField()
    has_stripe_secret_key = serializers.SerializerMethodField()
    is_ambassador = serializers.ReadOnlyField()
    free_stamps_left = serializers.ReadOnlyField()
    subscriber_count = serializers.SerializerMethodField()
    has_active_plan_contract = serializers.ReadOnlyField()
    is_addons_only = serializers.ReadOnlyField()
    server_time = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'store_category', 'subdomain', 'owner', 'owner_email', 'api_key', 
            'allowed_origins', 'custom_domain', 'use_custom_domain', 'welcome_message', 'require_customer_info',
            'logo', 'logo_url', 'portal_title', 'footer_text', 'is_active', 'created_at', 'updated_at',
            'active_addons', 'stamp_balance', 'newsletter_plan', 'newsletter_sent_this_month', 'newsletter_extra_credits',
            'invoicing_mode', 'has_active_plan_contract', 'is_addons_only', 'trial_ends_at', 'tenant_context',
            'server_time', 'shipping_wallet_balance',
            # 6-Color Palette (Dark & Light)
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color',
            'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light',
            # Pollen/Nectar Falling settings
            'pollen_active', 'pollen_icon', 'pollen_color', 'pollen_count', 'pollen_blur',
            # Stripe keys config per tenant
            'stripe_publishable_key', 'stripe_secret_key', 'has_stripe_secret_key',
            
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
            'subscriber_count',

            # Custom CSS/JS
            'custom_css', 'custom_js', 'custom_backend_url', 'custom_frontend_url'
        ]
        read_only_fields = [
            'id', 'owner', 'api_key', 'created_at', 'updated_at', 
            'is_ambassador', 'free_stamps_left', 'stamps_used_this_month', 'stamps_last_reset',
            'subscriber_count', 'has_active_plan_contract', 'is_addons_only', 'trial_ends_at', 'server_time',
            'shipping_wallet_balance'
        ]

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def get_has_custom_smtp_password(self, obj):
        return bool(obj.custom_smtp_password)

    def get_has_skydropx_api_key(self, obj):
        return bool(obj.skydropx_api_key)

    def get_has_stripe_secret_key(self, obj):
        return bool(obj.stripe_secret_key)

    def get_subscriber_count(self, obj):
        return obj.subscribers.filter(is_active=True).count()

    def get_server_time(self, obj):
        from django.utils import timezone
        return timezone.now().isoformat()

    def validate_custom_domain(self, value):
        if value:
            # Clean domain: strip protocol, www., and trailing slashes
            val = value.strip().lower()
            if val.startswith('http://'):
                val = val[7:]
            elif val.startswith('https://'):
                val = val[8:]
            if val.startswith('www.'):
                val = val[4:]
            if val.endswith('/'):
                val = val[:-1]
            val = val.strip()

            if not val:
                return None

            # Enforce that custom domain must not contain "nectarlabs"
            if 'nectarlabs' in val:
                raise serializers.ValidationError(
                    "El dominio personalizado no puede pertenecer a los subdominios de Nectar Labs."
                )
            
            # Simple domain validation
            if '.' not in val or ' ' in val:
                raise serializers.ValidationError(
                    "Por favor ingresa un dominio válido (ej. mi-dominio.com)."
                )
            
            return val
        return value

    def validate_invoicing_mode(self, value):
        if value == 'AUTOMATIC':
            # Check if tenant has the facturacion-cfdi or automatic-invoicing addon active
            # self.instance represents the tenant being updated
            if self.instance:
                if 'facturacion-cfdi' not in self.instance.active_addons and 'automatic-invoicing' not in self.instance.active_addons:
                    raise serializers.ValidationError(
                        "Para activar la facturación automática, debes tener contratado el agregado de facturación (facturacion-cfdi)."
                    )
        return value

    def validate_shipping_markup_percentage(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            if self.instance and self.instance.shipping_markup_percentage != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden modificar el margen de ganancia de envíos.")
        return value

    def validate_skydropx_api_key(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'skydropx_api_key', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden modificar la clave API de Skydropx.")
        return value

    def validate_custom_smtp_host(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_smtp_host', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden configurar servidores SMTP personalizados.")
        return value

    def validate_custom_smtp_port(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_smtp_port', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden configurar servidores SMTP personalizados.")
        return value

    def validate_custom_smtp_username(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_smtp_username', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden configurar servidores SMTP personalizados.")
        return value

    def validate_custom_smtp_password(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_smtp_password', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden configurar servidores SMTP personalizados.")
        return value

    def validate_custom_smtp_from_email(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_smtp_from_email', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden configurar servidores SMTP personalizados.")
        return value

    def validate_custom_css(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_css', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden agregar código CSS personalizado.")
        return value

    def validate_custom_js(self, value):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and not (user.is_staff or user.role == 'ADMIN'):
            current_val = getattr(self.instance, 'custom_js', None) if self.instance else None
            if current_val != value:
                raise serializers.ValidationError("Solo el CEO o administradores de Nectar Labs pueden agregar código JS personalizado.")
        return value



    def to_representation(self, instance):
        instance.reset_stamps_if_new_month()
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
    server_time = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'store_category', 'subdomain', 'custom_domain', 'use_custom_domain', 'logo_url', 
            'welcome_message', 'require_customer_info', 'active_addons',
            'portal_title', 'footer_text', 'has_active_plan_contract', 'is_addons_only',
            'is_active', 'owner', 'trial_ends_at', 'tenant_context', 'server_time',
            'stripe_publishable_key',
            # 6-Color Palette (Dark & Light)
            'theme_color', 'accent_color', 'bg_color', 'card_bg_color', 'text_color', 'border_color',
            'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light',
            # Pollen/Nectar Falling settings
            'pollen_active', 'pollen_icon', 'pollen_color', 'pollen_count', 'pollen_blur',
            # Custom CSS/JS
            'custom_css', 'custom_js', 'custom_frontend_url', 'custom_backend_url'
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return obj.logo_url

    def get_server_time(self, obj):
        from django.utils import timezone
        return timezone.now().isoformat()

