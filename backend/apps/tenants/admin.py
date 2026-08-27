from django.contrib import admin
from .models import Tenant, TenantPage, TenantNavItem

class TenantPageInline(admin.StackedInline):
    model = TenantPage
    extra = 0
    fields = ('title', 'slug', 'page_type', 'is_homepage', 'is_standalone_isolated', 'is_published', 'order')
    show_change_link = True

class TenantNavItemInline(admin.TabularInline):
    model = TenantNavItem
    extra = 0
    fields = ('label', 'url', 'page', 'position', 'order', 'is_visible', 'open_in_new_tab')

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'subdomain', 'owner', 'custom_domain', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'subdomain', 'owner__email', 'owner__username', 'custom_domain')
    readonly_fields = ('api_key', 'created_at', 'updated_at')
    inlines = [TenantPageInline, TenantNavItemInline]
    fieldsets = (
        (None, {
            'fields': ('name', 'subdomain', 'owner', 'is_active')
        }),
        ('Integration Options', {
            'fields': ('api_key', 'allowed_origins', 'custom_domain', 'use_custom_domain')
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


@admin.register(TenantPage)
class TenantPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'tenant', 'page_type', 'is_homepage', 'is_standalone_isolated', 'is_published', 'order', 'updated_at')
    list_filter = ('tenant', 'page_type', 'is_homepage', 'is_standalone_isolated', 'is_published')
    search_fields = ('title', 'slug', 'tenant__name', 'tenant__subdomain', 'hero_title')
    prepopulated_fields = {'slug': ('title',)}
    fieldsets = (
        ('Información General de la Página', {
            'fields': ('tenant', 'title', 'slug', 'page_type', 'is_homepage', 'is_published', 'order')
        }),
        ('Aislamiento de Plantilla (Código Independiente / Standalone)', {
            'fields': ('is_standalone_isolated', 'custom_html'),
            'description': 'Al marcar "¿Es Código Aislado Standalone?", la página se renderizará de forma 100% independiente sin aplicar el diseño, header/footer ni plantillas de Nectar-Labs.'
        }),
        ('Sección Hero Banner & CTA (Plantillas Estándar)', {
            'fields': ('hero_title', 'hero_subtitle', 'hero_image_url', 'cta_text', 'cta_url'),
            'classes': ('collapse',),
        }),
        ('Secciones Dinámicas Adicionales (JSON)', {
            'fields': ('content_json',),
            'classes': ('collapse',),
        }),
        ('Metadatos SEO & Redes Sociales', {
            'fields': ('meta_title', 'meta_description', 'og_image_url'),
            'classes': ('collapse',),
        }),
    )


@admin.register(TenantNavItem)
class TenantNavItemAdmin(admin.ModelAdmin):
    list_display = ('label', 'tenant', 'position', 'url', 'page', 'order', 'is_visible')
    list_filter = ('tenant', 'position', 'is_visible')
    search_fields = ('label', 'url', 'tenant__name', 'tenant__subdomain')

