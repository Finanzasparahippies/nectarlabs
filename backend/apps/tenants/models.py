import uuid
from django.db import models
from django.conf import settings

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
    
    # Customization & Branding fields
    theme_color = models.CharField(max_length=7, default="#C68A1E")
    logo_url = models.URLField(blank=True, null=True)
    welcome_message = models.TextField(default="¡Hola! ¿En qué podemos ayudarte hoy?")
    require_customer_info = models.BooleanField(
        default=True,
        help_text="Whether to require customer Name and Email before starting a support session."
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.subdomain})"

    @property
    def active_addons(self):
        from apps.shop.models import AddOn, Contract
        # Check if owner has a signed and active 6-month contract with any plan
        has_plan_contract = Contract.objects.filter(
            user=self.owner,
            is_active=True,
            is_fully_signed=True,
            plan__isnull=False
        ).exists()
        
        if has_plan_contract:
            # Plan contract holders get access to ALL active Add-ons
            return list(AddOn.objects.filter(is_active=True).values_list('slug', flat=True).distinct())
            
        # Otherwise, they only get the ones they purchased manually (associated via their contracts)
        return list(AddOn.objects.filter(
            is_active=True,
            contracts__user=self.owner,
            contracts__is_active=True,
            contracts__is_fully_signed=True
        ).values_list('slug', flat=True).distinct())

