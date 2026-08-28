"""
Módulo de Gestión de Inquilinos (Multi-Tenancy) y Configuración Fiscal en Nectar-Labs.

Este módulo define la entidad principal `Tenant`, representando la organización o negocio cliente.
Soporta subdominios aislados, mapeo de dominios personalizados (BYO Domain), personalización
de marca con tema Glassmorphism (paletas de 6 colores en modo oscuro y claro), balance de timbres
para Facturación CFDI 4.0 y monedero de envíos.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone

class Tenant(models.Model):
    """
    Entidad principal de Inquilino (Negocio / Cliente) en la arquitectura multi-tenant de Nectar Labs.
    Mantiene la relación con su propietario, configuración de marca, límites de correo y timbres fiscales.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nombre del Negocio")
    subdomain = models.SlugField(max_length=50, unique=True, db_index=True, verbose_name="Subdominio Nectar")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="owned_tenants",
        verbose_name="Propietario del Negocio"
    )
    api_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    allowed_origins = models.TextField(
        blank=True, 
        help_text="Allowed origins for embedding the widget, separated by commas or newlines."
    )
    custom_domain = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        unique=True, 
        db_index=True,
        help_text="Custom custom domain mapping (e.g. support.myclient.com)."
    )
    use_custom_domain = models.BooleanField(
        default=False,
        help_text="Whether to use the custom domain instead of the subdomain."
    )
    
    # Customization & Branding fields
    logo = models.ImageField(upload_to="tenant_logos/", blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)
    welcome_message = models.TextField(default="¡Hola! ¿En qué podemos ayudarte hoy?")
    portal_title = models.CharField(max_length=150, blank=True, null=True)
    footer_text = models.TextField(blank=True, null=True)
    require_customer_info = models.BooleanField(
        default=True,
        help_text="Whether to require customer Name and Email before starting a support session."
    )
    
    # 6-Color Palette Customization (Dark Mode)
    theme_color = models.CharField(max_length=7, default="#C68A1E")     # Primary / Nectar Gold
    accent_color = models.CharField(max_length=7, default="#10B981")    # Secondary / Emerald Green
    bg_color = models.CharField(max_length=7, default="#020403")        # General Canvas Background
    card_bg_color = models.CharField(max_length=7, default="#050a06")   # Cards / Modals Background
    text_color = models.CharField(max_length=7, default="#FFFFFF")      # Main Text color
    border_color = models.CharField(max_length=7, default="#151F18")    # Borders / Dividers color

    # Light Mode Palette Customization
    theme_color_light = models.CharField(max_length=7, default="#C68A1E")
    accent_color_light = models.CharField(max_length=7, default="#10B981")
    bg_color_light = models.CharField(max_length=7, default="#FAFAFA")
    card_bg_color_light = models.CharField(max_length=7, default="#FFFFFF")
    text_color_light = models.CharField(max_length=7, default="#111827")
    border_color_light = models.CharField(max_length=7, default="#E5E7EB")
    
    # 🐝 Pollen/Nectar Falling Effect Settings
    pollen_active = models.BooleanField(default=True)
    pollen_icon = models.CharField(max_length=50, default="⚫")
    pollen_color = models.CharField(max_length=7, default="#C68A1E")
    pollen_count = models.PositiveIntegerField(default=6)
    pollen_blur = models.FloatField(default=0.2)
    
    # Newsletter Billing & Limits Configuration
    NEWSLETTER_PLANS = [
        ('TRIAL', 'Periodo de prueba'),
        ('PREMIUM', 'Plan Premium ($79)'),
    ]
    newsletter_plan = models.CharField(
        max_length=20, 
        choices=NEWSLETTER_PLANS, 
        default='TRIAL'
    )
    newsletter_extra_credits = models.PositiveIntegerField(
        default=0, 
        help_text="Créditos extra de correo contratados (múltiplos de 10,000)"
    )
    newsletter_sent_this_month = models.PositiveIntegerField(default=0)
    newsletter_last_reset = models.DateField(default=timezone.localdate)
    newsletter_sent_today = models.PositiveIntegerField(default=0, help_text="Correos masivos enviados el día de hoy.")
    newsletter_last_reset_day = models.DateField(default=timezone.localdate, help_text="Último día en el que se reinició el contador diario de correos.")

    # Bring Your Own SMTP (BYO SMTP)
    custom_smtp_host = models.CharField(max_length=255, blank=True, null=True)
    custom_smtp_port = models.IntegerField(blank=True, null=True)
    custom_smtp_username = models.CharField(max_length=255, blank=True, null=True)
    custom_smtp_password = models.CharField(max_length=255, blank=True, null=True)
    custom_smtp_use_tls = models.BooleanField(default=True)
    custom_smtp_from_email = models.EmailField(blank=True, null=True)
    
    stamp_balance = models.PositiveIntegerField(
        default=0,
        help_text="Balance actual de timbres fiscales (comprados o incluidos en la suscripción)."
    )
    shipping_wallet_balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Saldo disponible para pagar guías de envío de Skydropx en Néctar Labs."
    )
    trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Fecha y hora de finalización de la prueba gratuita de 14 días."
    )
    tenant_context = models.TextField(
        blank=True,
        null=True,
        help_text="Contexto personalizado que se le inyecta al bot de soporte de IA."
    )
    
    # Skydropx Integration
    skydropx_api_key = models.CharField(max_length=255, blank=True, null=True)
    shipping_origin_name = models.CharField(max_length=255, blank=True, null=True, default="")
    shipping_origin_phone = models.CharField(max_length=20, blank=True, null=True, default="")
    shipping_origin_street = models.TextField(blank=True, null=True, default="")
    shipping_origin_suburb = models.CharField(max_length=255, blank=True, null=True, default="")
    shipping_origin_city = models.CharField(max_length=255, blank=True, null=True, default="")
    shipping_origin_state = models.CharField(max_length=100, blank=True, null=True, default="")
    shipping_origin_zip_code = models.CharField(max_length=10, blank=True, null=True, default="")
    shipping_markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=15.00, help_text="Porcentaje de ganancia sobre el costo de Skydropx")

    # Ambassador plan stamps tracking
    stamps_used_this_month = models.PositiveIntegerField(default=0)
    stamps_last_reset = models.DateField(default=timezone.localdate)

    class InvoicingMode(models.TextChoices):
        AUTOMATIC = 'AUTOMATIC', 'Facturación Automática (al pagar)'
        MANUAL_CLIENT = 'MANUAL_CLIENT', 'Manual por el Cliente'
        MANUAL_ADMIN = 'MANUAL_ADMIN', 'Manual por el Administrador'

    invoicing_mode = models.CharField(
        max_length=20,
        choices=InvoicingMode.choices,
        default=InvoicingMode.MANUAL_CLIENT,
        help_text="Preferencia de facturación para los abonos de este inquilino."
    )

    store_category = models.CharField(
        max_length=100,
        default="General",
        blank=True,
        help_text="Categoría de la tienda/negocio (ej: Consumibles, Ropa, Tecnología, Comida, etc.)"
    )

    # Stripe integration keys per tenant
    stripe_publishable_key = models.CharField(max_length=255, blank=True, null=True, help_text="Clave pública de Stripe del Tenant")
    stripe_secret_key = models.CharField(max_length=255, blank=True, null=True, help_text="Clave secreta de Stripe del Tenant")

    class FrontendMode(models.TextChoices):
        NATIVE = 'NATIVE', 'Plantilla Nativa (Nectar Labs Glassmorphism)'
        CUSTOM_STANDALONE = 'CUSTOM_STANDALONE', 'Plantilla Personalizada (BYO Frontend / Proxy)'

    frontend_mode = models.CharField(
        max_length=25,
        choices=FrontendMode.choices,
        default=FrontendMode.NATIVE,
        help_text="Modo de renderizado del frontend para este Tenant (Nativa Glassmorphism vs Personalizada BYO)"
    )

    custom_css = models.TextField(blank=True, null=True, help_text="Código CSS personalizado para el portal público del Tenant")
    custom_js = models.TextField(blank=True, null=True, help_text="Código JS personalizado para el portal público del Tenant")
    custom_backend_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL de backend personalizada (acepta rutas relativas o URLs absolutas) para redirigir peticiones API")
    custom_frontend_url = models.CharField(max_length=500, blank=True, null=True, help_text="URL de frontend personalizada (acepta rutas relativas o URLs absolutas) para enmascarar en iframe")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.subdomain})"

    @property
    def is_in_trial(self):
        return bool(self.trial_ends_at and self.trial_ends_at > timezone.now() and not self.has_active_plan_contract)

    @property
    def is_ambassador(self):
        from apps.shop.models import Contract
        return Contract.objects.filter(
            user=self.owner,
            is_active=True,
            is_fully_signed=True,
            plan__name__icontains="embajador"
        ).exists()

    @property
    def free_stamps_left(self):
        if self.is_in_trial:
            return 0
        today = timezone.now().date()
        if not self.stamps_last_reset or (self.stamps_last_reset.month != today.month or self.stamps_last_reset.year != today.year):
            return 20
        return max(0, 20 - self.stamps_used_this_month)

    def reset_stamps_if_new_month(self):
        today = timezone.now().date()
        if not self.stamps_last_reset or (self.stamps_last_reset.month != today.month or self.stamps_last_reset.year != today.year):
            self.stamps_used_this_month = 0
            self.stamps_last_reset = today
            if self.has_active_plan_contract or 'facturacion-cfdi' in self.active_addons:
                self.stamp_balance = 100
            self.save(update_fields=['stamps_used_this_month', 'stamps_last_reset', 'stamp_balance'])

    def has_available_stamps(self):
        self.reset_stamps_if_new_month()
        if self.is_in_trial:
            return self.stamp_balance > 0
        if self.is_ambassador and self.stamps_used_this_month < 20:
            return True
        return self.stamp_balance > 0

    def consume_stamp(self):
        self.reset_stamps_if_new_month()
        if not self.is_in_trial and self.is_ambassador and self.stamps_used_this_month < 20:
            self.stamps_used_this_month += 1
            self.save(update_fields=['stamps_used_this_month'])
            return True
        if self.stamp_balance > 0:
            self.stamp_balance -= 1
            self.save(update_fields=['stamp_balance'])
            return True
        return False

    @property
    def has_active_plan_contract(self):
        from apps.shop.models import Contract
        return Contract.objects.filter(
            user=self.owner,
            is_active=True,
            is_fully_signed=True,
            plan__isnull=False
        ).exists()

    @property
    def is_addons_only(self):
        if self.has_active_plan_contract:
            return False
        return len(self.active_addons) > 0

    @property
    def active_addons(self):
        from apps.shop.models import AddOn, Contract, AddOnSubscription
        
        addons = set()
        if self.trial_ends_at and self.trial_ends_at > timezone.now():
            addons.update(AddOn.objects.filter(is_active=True).values_list('slug', flat=True).distinct())
        elif self.has_active_plan_contract:
            # Check active plan tier
            active_contract = Contract.objects.filter(
                user=self.owner,
                is_active=True,
                is_fully_signed=True,
                plan__isnull=False
            ).select_related('plan').first()
            
            plan_name = active_contract.plan.name.lower() if (active_contract and active_contract.plan) else ""
            is_premium_tier = self.is_ambassador or any(kw in plan_name for kw in ['produccion', 'producción', 'premium', 'embajador'])
            
            if is_premium_tier:
                # Premium gets all packages AND all individual modules
                addons.update(AddOn.objects.filter(is_active=True).values_list('slug', flat=True).distinct())
                addons.update(['pack-ecommerce-lite', 'pack-pos-ecommerce', 'pack-blog-sponsors'])
            else:
                # Basic & Mid tiers get all 3 official packages
                addons.update(['pack-ecommerce-lite', 'pack-pos-ecommerce', 'pack-blog-sponsors'])
                
            # Also include explicitly attached contract addons & active subscriptions
            addons.update(AddOn.objects.filter(
                is_active=True,
                contracts__user=self.owner,
                contracts__is_active=True
            ).values_list('slug', flat=True).distinct())
            
            active_subs = AddOnSubscription.objects.filter(
                user=self.owner,
                status__in=['active', 'trialing'],
                is_activated=True
            ).values_list('addon__slug', flat=True)
            addons.update(active_subs)
        else:
            # Return only the ones explicitly purchased or assigned via active contracts
            addons.update(AddOn.objects.filter(
                is_active=True,
                contracts__user=self.owner,
                contracts__is_active=True
            ).values_list('slug', flat=True).distinct())
            
            # Synchronize active subscriptions
            active_subs = AddOnSubscription.objects.filter(
                user=self.owner,
                status__in=['active', 'trialing'],
                is_activated=True
            ).values_list('addon__slug', flat=True)
            addons.update(active_subs)
            
        if self.newsletter_plan == 'PREMIUM':
            addons.add('campaigner')
            
        # Si tiene el viejo ecommerce-combo, mapear a ecommerce y sus constituyentes para compatibilidad
        if 'ecommerce-combo' in addons:
            addons.update(['delivery-tracking', 'facturacion-cfdi', 'ecommerce', 'campaigner'])

        if 'pack-ecommerce-lite' in addons:
            addons.update(['delivery-tracking', 'facturacion-cfdi', 'ecommerce', 'campaigner', 'business-analytics'])

        if 'pack-pos-ecommerce' in addons:
            addons.update(['delivery-tracking', 'facturacion-cfdi', 'ecommerce', 'pos-manager', 'campaigner', 'business-analytics'])

        if 'pack-blog-sponsors' in addons:
            addons.update(['sponsorship', 'ecommerce', 'facturacion-cfdi', 'campaigner', 'business-analytics'])

        # Normalize/Expand active addons with aliases for full backend/frontend compatibility
        addon_aliases = {
            'bot-chat': 'live-chat',
            'live-chat': 'bot-chat',
            'delivery-tracking': 'logistics-gps',
            'logistics-gps': 'delivery-tracking',
            'sponsorship': 'patreon-sponsorship',
            'patreon-sponsorship': 'sponsorship',
            'business-analytics': 'analytics-apm',
            'analytics-apm': 'business-analytics',
            'campaigner': 'newsletter-campaigner',
            'newsletter-campaigner': 'campaigner',
            'facturacion-cfdi': 'mexico-invoicing',
            'mexico-invoicing': 'facturacion-cfdi',
        }
        for slug in list(addons):
            if slug in addon_aliases:
                addons.add(addon_aliases[slug])

        return list(addons)


class TenantPage(models.Model):
    """
    Página dinámica o personalizada administrable por Inquilino (Tenant).
    Soporta diseño basado en plantillas Nectar-Labs o código 100% aislado (standalone/iframe) para salirse de las plantillas por defecto.
    """
    class PageType(models.TextChoices):
        LANDING = 'LANDING', 'Landing Page Estándar Nectar'
        CUSTOM_HTML = 'CUSTOM_HTML', 'HTML Personalizado (Incrustado)'
        ISOLATED_CODE = 'ISOLATED_CODE', 'Código Aislado 100% Standalone (Sin Plantilla)'
        MARKDOWN = 'MARKDOWN', 'Documento Markdown'
        FORM = 'FORM', 'Formulario / Captura de Clientes'
        EXTERNAL_LINK = 'EXTERNAL_LINK', 'Enlace Externo / Máscara'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='pages', verbose_name="Inquilino")
    title = models.CharField(max_length=200, verbose_name="Título de la Página")
    slug = models.SlugField(max_length=100, db_index=True, verbose_name="Slug / Ruta (ej: inicio, nosotros, ofertas)")
    page_type = models.CharField(max_length=30, choices=PageType.choices, default=PageType.LANDING, verbose_name="Tipo de Página")
    
    is_homepage = models.BooleanField(default=False, verbose_name="¿Es la página principal del Tenant?")
    is_standalone_isolated = models.BooleanField(
        default=False, 
        help_text="Si está activo, la página renderizará su código HTML/JS/CSS de forma 100% aislada sin cargar la plantilla ni layout predeterminado de Nectar-Labs."
    )

    # Hero Banner / Landing Section Fields
    hero_title = models.CharField(max_length=255, blank=True, null=True, verbose_name="Título Principal (Hero)")
    hero_subtitle = models.TextField(blank=True, null=True, verbose_name="Subtítulo Principal")
    hero_image_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="URL de Imagen / Banner Hero")
    cta_text = models.CharField(max_length=100, blank=True, null=True, verbose_name="Texto del Botón Acción (CTA)")
    cta_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="Enlace del Botón Acción")

    # Contenido estructurado y código aislado
    content_json = models.JSONField(default=dict, blank=True, verbose_name="Secciones Dinámicas (JSON)")
    custom_html = models.TextField(blank=True, null=True, help_text="Código HTML/JS/CSS libre o aislado. Si la página es Aislada Standalone, se mostrará tal cual sin plantillas.")

    # SEO Metadata
    meta_title = models.CharField(max_length=200, blank=True, null=True, verbose_name="Título SEO (Meta Title)")
    meta_description = models.TextField(blank=True, null=True, verbose_name="Descripción SEO (Meta Description)")
    og_image_url = models.URLField(max_length=500, blank=True, null=True, verbose_name="Imagen para redes sociales (OG Image)")

    is_published = models.BooleanField(default=True, verbose_name="¿Publicada?")
    order = models.IntegerField(default=0, verbose_name="Orden de despliegue")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Página de Inquilino"
        verbose_name_plural = "Páginas de Inquilinos"
        unique_together = ('tenant', 'slug')
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.title} (/{self.slug}) - {self.tenant.subdomain}"


class TenantNavItem(models.Model):
    """
    Elemento del menú de navegación (Header/Footer) para un Tenant.
    """
    class Position(models.TextChoices):
        HEADER = 'HEADER', 'Encabezado (Menú Principal)'
        FOOTER = 'FOOTER', 'Pie de Página (Footer)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='nav_items', verbose_name="Inquilino")
    label = models.CharField(max_length=100, verbose_name="Etiqueta / Nombre en Menú")
    url = models.CharField(max_length=500, blank=True, null=True, help_text="URL destino relativa (ej: /productos) o externa (https://...)")
    page = models.ForeignKey(TenantPage, on_delete=models.SET_NULL, null=True, blank=True, related_name='nav_links', verbose_name="Página Vinculada")
    position = models.CharField(max_length=20, choices=Position.choices, default=Position.HEADER, verbose_name="Ubicación")
    order = models.IntegerField(default=0, verbose_name="Orden de aparición")
    is_visible = models.BooleanField(default=True, verbose_name="¿Visible?")
    open_in_new_tab = models.BooleanField(default=False, verbose_name="¿Abrir en nueva pestaña?")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Elemento de Navegación"
        verbose_name_plural = "Elementos de Navegación"
        ordering = ['position', 'order', 'created_at']

    def __str__(self):
        return f"{self.label} ({self.position}) - {self.tenant.subdomain}"


