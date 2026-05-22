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
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
