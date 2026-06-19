import uuid
from django.db import models
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

class Subscriber(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='subscribers', null=True, blank=True)
    email = models.EmailField()
    name = models.CharField(max_length=255, blank=True, default='')
    tags = models.TextField(blank=True, default='')
    is_premium = models.BooleanField(default=False)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('email', 'tenant')

    def __str__(self):
        return f"{self.email} ({self.tenant.subdomain if self.tenant else 'No Tenant'})"



from apps.tenants.utils import get_tenant_email_connection, get_platform_sender
from django.core.mail import get_connection

def send_newsletter_email(subject, template_name, context, recipient_list, tenant=None, html_content=None):
    """
    Utility to send HTML emails for newsletters dynamically routed by tenant status,
    with an automatic failover hybrid channel (Brevo -> Amazon SES -> Zoho/Default).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # 0. Enforce limits if tenant is provided and not using BYO SMTP
    has_byo_smtp = False
    if tenant:
        has_byo_smtp = bool(tenant.custom_smtp_host and tenant.custom_smtp_username and tenant.custom_smtp_password)
        if not has_byo_smtp:
            from django.utils import timezone
            # Reset monthly count if the month has changed
            today = timezone.now().date()
            if not tenant.newsletter_last_reset or (tenant.newsletter_last_reset.month != today.month or tenant.newsletter_last_reset.year != today.year):
                tenant.newsletter_sent_this_month = 0
                tenant.newsletter_last_reset = today
                tenant.save(update_fields=['newsletter_sent_this_month', 'newsletter_last_reset'])

            # Determine limit: 1,000 emails base for all plans and active technological partner contracts
            base_limit = 1000
            total_limit = base_limit + tenant.newsletter_extra_credits

            if tenant.newsletter_sent_this_month + len(recipient_list) > total_limit:
                raise ValueError(
                    f"Límite mensual de correos alcanzado. Has enviado {tenant.newsletter_sent_this_month} de {total_limit} correos. "
                    "Puedes contratar un paquete adicional de 1,000 correos por $100 MXN en tu panel de control."
                )

    if not html_content:
        html_content = render_to_string(f"newsletter/{template_name}.html", context)
    text_content = f"Visita nuestra web para ver las novedades: {settings.FRONTEND_URL}"
    
    # 1. Determine base connection & from_email/reply_to
    connection, from_email = get_tenant_email_connection(tenant)
    reply_to = None
    
    if not tenant:
        actual_alias = settings.EMAIL_NEWSLETTER
        from_email = get_platform_sender("Néctar Labs Boletín")
        reply_to = [actual_alias]
        
    # Define the list of connection configs to attempt in order
    providers = []
    
    # If a specific connection was resolved for a tenant, prioritize it
    if connection is not None:
        providers.append(("Tenant SMTP", connection, from_email))
    else:
        # Check if we are running in testing environment to use locmem
        if getattr(settings, 'TESTING', False) or getattr(settings, 'EMAIL_BACKEND', None) == 'django.core.mail.backends.locmem.EmailBackend':
            providers.append(("Testing locmem", None, from_email))
        else:
            # For platform campaigns, attempt Brevo first, then SES, then Zoho/Default
            # Brevo (Free)
            if settings.BREVO_EMAIL_HOST_USER and settings.BREVO_EMAIL_HOST_PASSWORD:
                providers.append(("Brevo SMTP", {
                    'host': settings.BREVO_EMAIL_HOST,
                    'port': settings.BREVO_EMAIL_PORT,
                    'username': settings.BREVO_EMAIL_HOST_USER,
                    'password': settings.BREVO_EMAIL_HOST_PASSWORD,
                    'use_tls': settings.BREVO_EMAIL_USE_TLS,
                }, from_email))
                
            # Amazon SES (Failover/Paid)
            if settings.SES_EMAIL_HOST_USER and settings.SES_EMAIL_HOST_PASSWORD:
                providers.append(("Amazon SES", {
                    'host': settings.SES_EMAIL_HOST,
                    'port': settings.SES_EMAIL_PORT,
                    'username': settings.SES_EMAIL_HOST_USER,
                    'password': settings.SES_EMAIL_HOST_PASSWORD,
                    'use_tls': settings.SES_EMAIL_USE_TLS,
                }, from_email))
                
            # Zoho/Default (Fallback)
            providers.append(("Zoho/Default SMTP", None, from_email))

    # Attempt to send using the providers sequentially until successful
    last_error = None
    recipients_count = len(recipient_list)
    recipients_log = f"{recipients_count} recipients" if recipients_count > 5 else str(recipient_list)

    for name, config, sender in providers:
        try:
            logger.info(f"Attempting to send newsletter email via {name} to {recipients_log}")
            
            # Obtain the connection
            if config is None:
                active_conn = None
            elif isinstance(config, dict):
                active_conn = get_connection(
                    backend='django.core.mail.backends.smtp.EmailBackend',
                    host=config['host'],
                    port=config['port'],
                    username=config['username'],
                    password=config['password'],
                    use_tls=config['use_tls']
                )
            else:
                active_conn = config
                
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                sender,
                recipient_list,
                connection=active_conn,
                reply_to=reply_to
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            
            logger.info(f"Successfully sent newsletter email via {name} to {recipients_log}")
            
            # Increment monthly counter for non-BYO SMTP tenants
            if tenant and not has_byo_smtp:
                tenant.newsletter_sent_this_month += len(recipient_list)
                tenant.save(update_fields=['newsletter_sent_this_month'])

            return True
            
        except Exception as e:
            logger.warning(f"Failed to send email via {name}: {e}. Trying next provider...")
            last_error = e
            
    # If all providers failed, raise the last exception
    if last_error:
        logger.error(f"All email providers failed to send email to {recipients_log}")
        raise last_error
    return False


class MarketingList(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='marketing_lists', null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    slug = models.SlugField(blank=True)
    subscribers = models.ManyToManyField(Subscriber, related_name='marketing_lists', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.tenant.subdomain if self.tenant else 'No Tenant'})"


class EmailCampaign(models.Model):
    TEMPLATE_CHOICES = [
        ('minimalist', 'Minimalist Carbon'),
        ('moss', 'Moss Green'),
        ('cosmic', 'Cosmic Night'),
        ('glow', 'Amber Glow'),
        ('mist', 'Mystic Mist'),
    ]

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='campaigns', null=True, blank=True)
    marketing_list = models.ForeignKey(MarketingList, on_delete=models.SET_NULL, null=True, blank=True, related_name='campaigns')
    subject = models.CharField(max_length=255)
    content = models.TextField()
    template_type = models.CharField(max_length=50, choices=TEMPLATE_CHOICES, default='minimalist')
    image = models.ImageField(upload_to='campaigns/', null=True, blank=True)
    
    # Advanced background settings
    bg_image = models.ImageField(upload_to='campaign_bg/', null=True, blank=True)
    bg_opacity = models.FloatField(default=1.0)
    bg_saturation = models.IntegerField(default=100)
    bg_position = models.CharField(max_length=50, default='center')
    
    # Customizable CTA Button settings
    cta_text = models.CharField(max_length=100, blank=True, default='')
    cta_link = models.URLField(blank=True, default='')
    
    # JSONFields for customization
    image_style = models.JSONField(default=dict, blank=True)
    ctas = models.JSONField(default=list, blank=True)
    custom_styles = models.JSONField(default=dict, blank=True)
    
    # Premium Typography settings
    font_family = models.CharField(max_length=100, default='serif')
    title_font_family = models.CharField(max_length=100, default='serif')
    footer_font_family = models.CharField(max_length=100, default='serif')

    # Custom Email Title and Footer
    email_title = models.TextField(blank=True, default='')
    footer_text = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_sent = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.subject} ({self.get_template_type_display()})"


class CampaignTemplateImage(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='campaign_template_images', null=True, blank=True)
    image = models.ImageField(upload_to='campaign_templates/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Template Image {self.id} ({self.created_at})"




