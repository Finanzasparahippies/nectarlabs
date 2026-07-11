from django.contrib import admin
from .models import Tenant

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'subdomain', 'owner', 'custom_domain', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'subdomain', 'owner__email', 'owner__username', 'custom_domain')
    readonly_fields = ('api_key', 'created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'subdomain', 'owner', 'is_active')
        }),
        ('Integration Options', {
            'fields': ('api_key', 'allowed_origins', 'custom_domain')
        }),
        ('Branding & Customization', {
            'fields': ('theme_color', 'logo_url', 'welcome_message', 'require_customer_info')
        }),
        ('Custom Styling & Masking', {
            'fields': ('custom_css', 'custom_js', 'custom_backend_url', 'custom_frontend_url'),
            'classes': ('collapse',),
        }),
        ('Newsletter Billing & Limits', {
            'fields': ('newsletter_plan', 'newsletter_extra_credits', 'newsletter_sent_this_month', 'newsletter_last_reset')
        }),
        ('Custom SMTP Configuration (BYO SMTP)', {
            'fields': ('custom_smtp_host', 'custom_smtp_port', 'custom_smtp_username', 'custom_smtp_password', 'custom_smtp_use_tls', 'custom_smtp_from_email'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
