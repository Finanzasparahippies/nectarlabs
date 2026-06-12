from django.contrib import admin
from .models import Plan, Product, Order, AddOn, Contract, PaymentInstallment, PromoCode, AddOnSubscription, SalesCommission, StripeEvent

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'hours', 'is_active')
    list_filter = ('is_active',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock', 'tenant')
    list_filter = ('tenant',)
    search_fields = ('name',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total', 'status', 'tenant', 'created_at')
    list_filter = ('status', 'tenant', 'created_at')
    search_fields = ('user__email', 'stripe_payment_intent')

@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'category_badge', 'monthly_price', 'yearly_price', 'complexity', 'is_active')
    list_filter = ('complexity', 'is_active', 'category_badge')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}

class PaymentInstallmentInline(admin.TabularInline):
    model = PaymentInstallment
    extra = 0
    readonly_fields = ('installment_number', 'due_date', 'amount', 'created_at')

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'plan', 'brand_design_tier', 'is_fully_signed', 'is_active', 'signed_at')
    list_filter = ('is_fully_signed', 'is_active', 'brand_design_tier', 'signed_at')
    search_fields = ('full_name', 'tax_id', 'user__email')
    filter_horizontal = ('addons',)
    inlines = [PaymentInstallmentInline]

@admin.register(PaymentInstallment)
class PaymentInstallmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'contract', 'installment_number', 'due_date', 'amount', 'status', 'paid_at')
    list_filter = ('status', 'due_date', 'paid_at')
    search_fields = ('contract__full_name', 'stripe_invoice_id', 'cfdi_uuid')

@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'code_type', 'discount_percentage', 'is_active', 'used_count', 'max_uses', 'valid_until', 'referrer')
    list_filter = ('code_type', 'is_active', 'valid_until')
    search_fields = ('code', 'referrer__email')
    ordering = ('-created_at',)


@admin.register(AddOnSubscription)
class AddOnSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'tenant', 'addon', 'stripe_subscription_id', 'status', 'billing_cycle', 'created_at')
    list_filter = ('status', 'billing_cycle', 'created_at')
    search_fields = ('user__email', 'tenant__name', 'addon__name', 'stripe_subscription_id')


@admin.register(SalesCommission)
class SalesCommissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'salesperson', 'installment', 'commission_percentage', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('salesperson__email', 'installment__contract__full_name')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(StripeEvent)
class StripeEventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'created_at')
    search_fields = ('event_id',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
