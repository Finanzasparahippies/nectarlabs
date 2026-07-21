from django.db import models
from django.conf import settings
from cloudinary.models import CloudinaryField
from django_ckeditor_5.fields import CKEditor5Field

class SponsorshipConfig(models.Model):
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsorship_config')
    membership_name = models.CharField(max_length=100, default="Sponsor", help_text="How you call your members (e.g. Patrono, Partner, Sponsor, Fan)")
    currency = models.CharField(max_length=10, default="MXN")
    welcome_message = models.TextField(blank=True, default="¡Gracias por convertirte en un patrocinador oficial!")
    public_feed_title = models.CharField(max_length=200, default="Feed Exclusivo de Creadores")

    def __str__(self):
        return f"Configuración de Patrocinios para {self.tenant.subdomain}"

class SponsorTarget(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsor_targets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = CloudinaryField('image', blank=True, null=True)

    def __str__(self):
        return f"{self.name} (Tenant: {self.tenant.subdomain})"

class SponsorshipTier(models.Model):
    TYPE_CHOICES = (
        ("DONATION", "One-time Donation"),
        ("SUBSCRIPTION", "Monthly Subscription"),
    )
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsorship_tiers')
    name = models.CharField(max_length=100)
    level = models.IntegerField(default=0, help_text="Higher level means more access")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="SUBSCRIPTION")
    is_active = models.BooleanField(default=True, help_text="Uncheck to hide this tier from the frontend.")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price in pesos per month")
    price_annual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price in pesos per year (e.g. Price * 10)")
    stripe_price_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_price_id_annual = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True)
    image = CloudinaryField('image', blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.type == "SUBSCRIPTION" and not self.price_annual and self.price:
            self.price_annual = self.price * 10
            
        super().save(*args, **kwargs)
        
        updated = False
        # Only attempt Stripe product creation if stripe secret key is set
        if getattr(settings, "STRIPE_SECRET_KEY", None) and not getattr(settings, "TESTING", False) and (not self.stripe_price_id or (self.type == "SUBSCRIPTION" and not self.stripe_price_id_annual)):
            from .utils import create_stripe_product_and_price
            try:
                price_ids = create_stripe_product_and_price(self)
                self.stripe_price_id = price_ids.get('monthly')
                self.stripe_price_id_annual = price_ids.get('annual')
                updated = True
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error creating Stripe Product for Tier {self.id}: {e}")
        
        if updated:
            super().save(update_fields=['stripe_price_id', 'stripe_price_id_annual'])

    def __str__(self):
        return f"{self.name} (Level {self.level}) (Tenant: {self.tenant.subdomain})"

class Sponsorship(models.Model):
    BILLING_CYCLE_CHOICES = (
        ("MONTHLY", "Mensual"),
        ("ANNUAL", "Anual"),
    )
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsorships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sponsorships')
    target = models.ForeignKey(SponsorTarget, on_delete=models.CASCADE, null=True, blank=True, help_text="Leave blank for general support")
    tier = models.ForeignKey(SponsorshipTier, on_delete=models.PROTECT, null=True)
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CYCLE_CHOICES, default="MONTHLY")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True, null=True)
    active = models.BooleanField(default=True)
    start_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        target_name = self.target.name if self.target else "General"
        return f"{self.user.email} - {target_name} ({self.tier.name if self.tier else 'Custom'})"

class SponsorshipUpdateTag(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsorship_update_tags')
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50)

    class Meta:
        unique_together = ('tenant', 'slug')

    def __str__(self):
        return f"{self.name} (Tenant: {self.tenant.subdomain})"

class SponsorshipUpdate(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sponsorship_updates')
    title = models.CharField(max_length=255)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    content = CKEditor5Field('Content', config_name='extends')
    image = CloudinaryField('image', blank=True, null=True)
    min_tier_level = models.IntegerField(default=0, help_text="Minimum level to view this update. 0 for public.")
    tags = models.ManyToManyField(SponsorshipUpdateTag, blank=True, related_name='updates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (Tenant: {self.tenant.subdomain})"

class SponsorshipUpdateImage(models.Model):
    update = models.ForeignKey(SponsorshipUpdate, related_name='gallery', on_delete=models.CASCADE)
    image = CloudinaryField('image')
    caption = models.CharField(max_length=255, blank=True, null=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image for {self.update.title}"
