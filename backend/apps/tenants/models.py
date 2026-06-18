import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    subdomain = models.SlugField(max_length=50, unique=True, db_index=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="owned_tenants"
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

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.subdomain})"

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
        today = timezone.now().date()
        if not self.stamps_last_reset or (self.stamps_last_reset.month != today.month or self.stamps_last_reset.year != today.year):
            return 20
        return max(0, 20 - self.stamps_used_this_month)

    def reset_stamps_if_new_month(self):
        today = timezone.now().date()
        if not self.stamps_last_reset or (self.stamps_last_reset.month != today.month or self.stamps_last_reset.year != today.year):
            self.stamps_used_this_month = 0
            self.stamps_last_reset = today
            self.save(update_fields=['stamps_used_this_month', 'stamps_last_reset'])

    def has_available_stamps(self):
        self.reset_stamps_if_new_month()
        if self.is_ambassador and self.stamps_used_this_month < 20:
            return True
        return self.stamp_balance > 0

    def consume_stamp(self):
        self.reset_stamps_if_new_month()
        if self.is_ambassador and self.stamps_used_this_month < 20:
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
        if self.has_active_plan_contract:
            addons.update(AddOn.objects.filter(is_active=True).values_list('slug', flat=True).distinct())
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
            addons.add('newsletter-campaigner')
            
        if 'ecommerce-combo' in addons:
            addons.update(['logistics-gps', 'mexico-invoicing', 'newsletter-campaigner'])

        return list(addons)

