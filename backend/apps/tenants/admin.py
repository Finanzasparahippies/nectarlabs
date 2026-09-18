from decimal import Decimal
from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import path, reverse
from django.http import HttpResponseRedirect

from .models import Tenant, TenantPage, TenantNavItem, TenantWalletTransaction, TenantDeployment
from .provisioner import (
    get_tenant_containers_status,
    deploy_tenant_containers,
    execute_container_action,
    get_tenant_container_names
)


class TenantPageInline(admin.StackedInline):
    model = TenantPage
    extra = 0
    fields = ('title', 'slug', 'page_type', 'is_homepage', 'is_standalone_isolated', 'is_published', 'order')
    show_change_link = True


class TenantNavItemInline(admin.TabularInline):
    model = TenantNavItem
    extra = 0
    fields = ('label', 'url', 'page', 'position', 'order', 'is_visible', 'open_in_new_tab')


class TenantWalletTransactionInline(admin.TabularInline):
    model = TenantWalletTransaction
    extra = 0
    readonly_fields = ('created_at', 'service_type', 'amount', 'balance_before', 'balance_after', 'description', 'reference_id')
    can_delete = False
    max_num = 15
    ordering = ('-created_at',)
    verbose_name = "Historial Reciente de Billetera Unificada"
    verbose_name_plural = "Historial Reciente de Billetera Unificada"

    def has_add_permission(self, request, obj=None):
        return False


class TenantDeploymentInline(admin.TabularInline):
    model = TenantDeployment
    extra = 0
    readonly_fields = ('created_at', 'environment', 'action', 'status_badge', 'triggered_by', 'finished_at')
    fields = ('created_at', 'environment', 'action', 'status_badge', 'triggered_by', 'finished_at')
    can_delete = False
    max_num = 10
    ordering = ('-created_at',)
    verbose_name = "Historial de Despliegues Remotos"
    verbose_name_plural = "Historial de Despliegues Remotos"

    def status_badge(self, obj):
        colors = {
            'SUCCESS': '#10B981',
            'IN_PROGRESS': '#F59E0B',
            'PENDING': '#6B7280',
            'FAILED': '#EF4444',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Estado"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'subdomain', 'frontend_mode', 'custom_domain', 
        'wallet_badge', 'stamp_balance', 'container_health_badge', 'is_active', 'created_at'
    )
    list_filter = ('frontend_mode', 'is_active', 'use_custom_domain', 'preferred_shipping_provider', 'created_at')
    search_fields = ('name', 'subdomain', 'owner__email', 'owner__username', 'custom_domain')
    readonly_fields = (
        'api_key', 'created_at', 'updated_at', 'logo_preview', 'favicon_preview', 
        'containers_live_status', 'wallet_balance_display'
    )
    inlines = [TenantPageInline, TenantNavItemInline, TenantWalletTransactionInline, TenantDeploymentInline]
    
    actions = ['deploy_staging_containers', 'start_staging_containers', 'stop_staging_containers', 'restart_staging_containers']

    fieldsets = (
        ('Identificación del Negocio', {
            'fields': ('name', 'subdomain', 'owner', 'frontend_mode', 'is_active')
        }),
        ('Control de Despliegue Remoto (Zero-SSH)', {
            'description': 'Monitorea y orquesta los contenedores dedicados del inquilino sin requerir acceso SSH.',
            'fields': ('containers_live_status',)
        }),
        ('Billetera Unificada Nectar Labs (Consumos)', {
            'description': 'Saldo universal para timbrado CFDI (Facturapi), paquetería (Envia/Skydropx) y Amazon SES.',
            'fields': ('wallet_balance', 'wallet_balance_display', 'stamp_balance', 'shipping_wallet_balance')
        }),
        ('Dominios & Red', {
            'fields': ('custom_domain', 'use_custom_domain', 'api_key', 'allowed_origins')
        }),
        ('Identidad Visual & Branding', {
            'fields': (
                'logo', 'logo_url', 'logo_preview',
                'favicon', 'favicon_url', 'favicon_preview',
                'theme_color', 'accent_color', 'portal_title', 'welcome_message', 'footer_text', 'require_customer_info'
            )
        }),
        ('Paleta de 6 Colores (Modo Oscuro / Claro)', {
            'fields': (
                'bg_color', 'card_bg_color', 'text_color', 'border_color',
                'theme_color_light', 'accent_color_light', 'bg_color_light', 'card_bg_color_light', 'text_color_light', 'border_color_light'
            ),
            'classes': ('collapse',),
        }),
        ('Integración Logística (Envia.com & Skydropx)', {
            'fields': (
                'preferred_shipping_provider', 'platform_shipping_fee', 'shipping_markup_percentage',
                'default_package_type', 'default_package_weight', 'default_package_length', 'default_package_width', 'default_package_height',
                'shipping_origin_name', 'shipping_origin_phone', 'shipping_origin_street', 'shipping_origin_suburb', 'shipping_origin_city', 'shipping_origin_state', 'shipping_origin_zip_code'
            ),
            'classes': ('collapse',),
        }),
        ('Personalización Avanzada (CSS / JS / Upstreams)', {
            'fields': ('custom_css', 'custom_js', 'custom_backend_url', 'custom_frontend_url'),
            'classes': ('collapse',),
        }),
        ('Orquestación y Despliegue Autónomo (Zero-SSH)', {
            'fields': ('is_standalone_repo', 'deployment_repo_path', 'deployment_backend_container', 'deployment_frontend_container'),
            'classes': ('collapse',),
        }),
        ('Campañas de Email & SMTP Personalizado', {
            'fields': (
                'newsletter_plan', 'newsletter_extra_credits', 'newsletter_sent_this_month',
                'custom_smtp_host', 'custom_smtp_port', 'custom_smtp_username', 'custom_smtp_password', 'custom_smtp_use_tls', 'custom_smtp_from_email'
            ),
            'classes': ('collapse',),
        }),
        ('Marcas de Tiempo', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # --- Previsualizaciones de Logo y Favicon ---
    def logo_preview(self, obj):
        url = obj.logo.url if obj.logo else obj.logo_url
        if url:
            return format_html(
                '<div style="background:#111; padding:8px; display:inline-block; border-radius:6px; border:1px solid #333;">'
                '<img src="{}" style="max-height:50px; max-width:140px; object-fit:contain;" alt="Logo" />'
                '</div>',
                url
            )
        return format_html('<span style="color:#888;">Sin logotipo configurado</span>')
    logo_preview.short_description = "Vista Previa de Logotipo"

    def favicon_preview(self, obj):
        url = obj.favicon.url if obj.favicon else obj.favicon_url
        if url:
            return format_html(
                '<div style="background:#111; padding:6px; display:inline-block; border-radius:6px; border:1px solid #333;">'
                '<img src="{}" style="width:32px; height:32px; object-fit:contain;" alt="Favicon" />'
                '</div>',
                url
            )
        return format_html('<span style="color:#888;">Sin favicon configurado (usando Nectar Labs por defecto)</span>')
    favicon_preview.short_description = "Vista Previa de Favicon"

    def wallet_badge(self, obj):
        bal = obj.wallet_balance or Decimal('0.00')
        color = '#10B981' if bal > 0 else '#EF4444'
        formatted_bal = f"${bal:,.2f} MXN"
        return format_html(
            '<span style="background:{}; color:#fff; padding:3px 8px; border-radius:12px; font-weight:700; font-size:12px;">{}</span>',
            color, formatted_bal
        )
    wallet_badge.short_description = "Billetera"

    def wallet_balance_display(self, obj):
        bal = obj.wallet_balance or Decimal('0.00')
        formatted_bal = f"${bal:,.2f} MXN"
        return format_html(
            '<div style="font-size:18px; font-weight:700; color:#10B981; padding:8px 0;">'
            'Saldo Disponible: {}'
            '<span style="font-size:12px; color:#888; margin-left:12px; font-weight:normal;">(Timbres CFDI + Envíos + SES)</span>'
            '</div>',
            formatted_bal
        )
    wallet_balance_display.short_description = "Saldo de Billetera Unificada"


    def container_health_badge(self, obj):
        status = get_tenant_containers_status(obj, env='staging')
        overall = status.get("overall_status", "offline")
        colors = {
            "healthy": ("#10B981", "🟢 En línea"),
            "degraded": ("#F59E0B", "🟡 Degradado"),
            "offline": ("#6B7280", "⚪ Detenido / N/A")
        }
        bg, text = colors.get(overall, ("#6B7280", "Desconocido"))
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">{}</span>',
            bg, text
        )
    container_health_badge.short_description = "Estado Contenedor"

    def containers_live_status(self, obj):
        if not obj.pk:
            return "Guarda el tenant primero para consultar estado."
            
        status = get_tenant_containers_status(obj, env='staging')
        names = status.get("names", {})
        be = status.get("backend", {})
        fe = status.get("frontend", {})
        
        be_status_color = "#10B981" if be.get("running") else "#EF4444"
        fe_status_color = "#10B981" if fe.get("running") else "#EF4444"
        
        deploy_url = reverse('admin:tenant_deploy_action', args=[obj.pk])
        restart_url = reverse('admin:tenant_restart_action', args=[obj.pk])
        stop_url = reverse('admin:tenant_stop_action', args=[obj.pk])
        
        html = f"""
        <div style="background:#0F172A; border:1px solid #1E293B; border-radius:8px; padding:16px; margin:8px 0; color:#E2E8F0; font-family:monospace;">
            <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
                <div style="flex:1; min-width:260px; background:#1E293B; padding:12px; border-radius:6px;">
                    <div style="font-size:12px; color:#94A3B8; text-transform:uppercase;">Backend Service ({names.get('backend')})</div>
                    <div style="font-size:16px; font-weight:bold; margin-top:4px;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:{be_status_color}; margin-right:6px;"></span>
                        {be.get('status', 'unknown').upper()}
                    </div>
                    <div style="font-size:11px; color:#64748B; margin-top:4px;">IP: {be.get('ip') or 'N/A'} | ID: {be.get('id') or 'N/A'}</div>
                </div>
                
                <div style="flex:1; min-width:260px; background:#1E293B; padding:12px; border-radius:6px;">
                    <div style="font-size:12px; color:#94A3B8; text-transform:uppercase;">Frontend Service ({names.get('frontend')})</div>
                    <div style="font-size:16px; font-weight:bold; margin-top:4px;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:{fe_status_color}; margin-right:6px;"></span>
                        {fe.get('status', 'unknown').upper()}
                    </div>
                    <div style="font-size:11px; color:#64748B; margin-top:4px;">IP: {fe.get('ip') or 'N/A'} | ID: {fe.get('id') or 'N/A'}</div>
                </div>
            </div>
            
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                <a href="{deploy_url}" class="button" style="background:#2563EB; color:#fff; padding:8px 14px; border-radius:5px; text-decoration:none; font-weight:600; font-size:12px;">🚀 Desplegar / Build Staging</a>
                <a href="{restart_url}" class="button" style="background:#D97706; color:#fff; padding:8px 14px; border-radius:5px; text-decoration:none; font-weight:600; font-size:12px;">🔄 Reiniciar</a>
                <a href="{stop_url}" class="button" style="background:#DC2626; color:#fff; padding:8px 14px; border-radius:5px; text-decoration:none; font-weight:600; font-size:12px;">⏹ Detener</a>
            </div>
        </div>
        """
        return format_html(html)
    containers_live_status.short_description = "Consola de Contenedores"

    # --- Acciones Masivas de Despliegue ---
    def deploy_staging_containers(self, request, queryset):
        count = 0
        for tenant in queryset:
            ok, msg = deploy_tenant_containers(tenant, env='staging', user=request.user, force_rebuild=True)
            if ok:
                count += 1
        self.message_user(request, f"Se inició el despliegue de {count} inquilino(s).", messages.SUCCESS)
    deploy_staging_containers.short_description = "🚀 Desplegar / Build Contenedores Staging"

    def start_staging_containers(self, request, queryset):
        for tenant in queryset:
            deploy_tenant_containers(tenant, env='staging', user=request.user, force_rebuild=False)
        self.message_user(request, "Contenedores iniciados correctamente.", messages.SUCCESS)
    start_staging_containers.short_description = "▶ Iniciar Contenedores Staging"

    def stop_staging_containers(self, request, queryset):
        for tenant in queryset:
            names = get_tenant_container_names(tenant, env='staging')
            execute_container_action(names["backend"], 'stop')
            execute_container_action(names["frontend"], 'stop')
        self.message_user(request, "Contenedores detenidos correctamente.", messages.WARNING)
    stop_staging_containers.short_description = "⏹ Detener Contenedores Staging"

    def restart_staging_containers(self, request, queryset):
        for tenant in queryset:
            names = get_tenant_container_names(tenant, env='staging')
            execute_container_action(names["backend"], 'restart')
            execute_container_action(names["frontend"], 'restart')
        self.message_user(request, "Contenedores reiniciados correctamente.", messages.SUCCESS)
    restart_staging_containers.short_description = "🔄 Reiniciar Contenedores Staging"

    # --- Rutas Personalizadas para Botones en Change View ---
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<uuid:tenant_id>/deploy-action/', self.admin_site.admin_view(self.view_deploy_action), name='tenant_deploy_action'),
            path('<uuid:tenant_id>/restart-action/', self.admin_site.admin_view(self.view_restart_action), name='tenant_restart_action'),
            path('<uuid:tenant_id>/stop-action/', self.admin_site.admin_view(self.view_stop_action), name='tenant_stop_action'),
        ]
        return custom_urls + urls

    def view_deploy_action(self, request, tenant_id):
        tenant = self.get_object(request, str(tenant_id))
        if tenant:
            ok, msg = deploy_tenant_containers(tenant, env='staging', user=request.user, force_rebuild=True)
            if ok:
                self.message_user(request, f"Despliegue iniciado con éxito para {tenant.name}.", messages.SUCCESS)
            else:
                self.message_user(request, f"Error en despliegue: {msg}", messages.ERROR)
        return HttpResponseRedirect(reverse('admin:tenants_tenant_change', args=[tenant_id]))

    def view_restart_action(self, request, tenant_id):
        tenant = self.get_object(request, str(tenant_id))
        if tenant:
            names = get_tenant_container_names(tenant, env='staging')
            execute_container_action(names["backend"], 'restart')
            execute_container_action(names["frontend"], 'restart')
            self.message_user(request, f"Contenedores de {tenant.name} reiniciados.", messages.SUCCESS)
        return HttpResponseRedirect(reverse('admin:tenants_tenant_change', args=[tenant_id]))

    def view_stop_action(self, request, tenant_id):
        tenant = self.get_object(request, str(tenant_id))
        if tenant:
            names = get_tenant_container_names(tenant, env='staging')
            execute_container_action(names["backend"], 'stop')
            execute_container_action(names["frontend"], 'stop')
            self.message_user(request, f"Contenedores de {tenant.name} detenidos.", messages.WARNING)
        return HttpResponseRedirect(reverse('admin:tenants_tenant_change', args=[tenant_id]))


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


@admin.register(TenantWalletTransaction)
class TenantWalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'tenant', 'service_type', 'amount', 'balance_after', 'description', 'reference_id')
    list_filter = ('service_type', 'tenant', 'created_at')
    search_fields = ('tenant__name', 'tenant__subdomain', 'description', 'reference_id')
    readonly_fields = ('tenant', 'service_type', 'amount', 'balance_before', 'balance_after', 'description', 'reference_id', 'metadata', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TenantDeployment)
class TenantDeploymentAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'tenant', 'environment', 'action', 'status', 'triggered_by', 'finished_at')
    list_filter = ('environment', 'action', 'status', 'created_at')
    search_fields = ('tenant__name', 'tenant__subdomain', 'output_logs')
    readonly_fields = ('tenant', 'environment', 'action', 'status', 'output_logs', 'triggered_by', 'created_at', 'finished_at')
    ordering = ('-created_at',)
