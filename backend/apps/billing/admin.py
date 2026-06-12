from django.contrib import admin
from .models import TaxProfile, Invoice, SATProductKey, SATUnitKey


@admin.register(TaxProfile)
class TaxProfileAdmin(admin.ModelAdmin):
    list_display = ('rfc', 'razon_social', 'tenant', 'regimen_fiscal', 'codigo_postal', 'facturapi_organization_id')
    search_fields = ('rfc', 'razon_social', 'tenant__name')
    list_select_related = ('tenant',)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'tenant', 'uuid_sat', 'total', 'status', 'is_tenant_to_customer', 'created_at')
    list_filter = ('status', 'is_tenant_to_customer', 'created_at')
    search_fields = ('uuid_sat', 'facturapi_invoice_id', 'stripe_invoice_id', 'tenant__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(SATProductKey)
class SATProductKeyAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'description', 'normalized_description')


@admin.register(SATUnitKey)
class SATUnitKeyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name', 'normalized_name')
