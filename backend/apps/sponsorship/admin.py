from django.contrib import admin
from .models import (
    SponsorshipConfig, SponsorTarget, SponsorshipTier,
    Sponsorship, SponsorshipUpdateTag, SponsorshipUpdate, SponsorshipUpdateImage
)


@admin.register(SponsorshipConfig)
class SponsorshipConfigAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'membership_name', 'currency')
    search_fields = ('tenant__name', 'tenant__subdomain')


@admin.register(SponsorTarget)
class SponsorTargetAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant')
    search_fields = ('name', 'tenant__name')
    list_filter = ('tenant',)


@admin.register(SponsorshipTier)
class SponsorshipTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'type', 'level', 'price', 'price_annual', 'is_active', 'stripe_price_id')
    list_filter = ('type', 'is_active', 'tenant')
    search_fields = ('name', 'tenant__name', 'stripe_price_id')


@admin.register(Sponsorship)
class SponsorshipAdmin(admin.ModelAdmin):
    list_display = ('user', 'tenant', 'tier', 'target', 'billing_cycle', 'amount', 'active', 'start_date')
    list_filter = ('active', 'billing_cycle', 'tenant', 'start_date')
    search_fields = ('user__email', 'stripe_subscription_id', 'stripe_payment_intent')
    readonly_fields = ('start_date',)


@admin.register(SponsorshipUpdateTag)
class SponsorshipUpdateTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'tenant')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


class SponsorshipUpdateImageInline(admin.TabularInline):
    model = SponsorshipUpdateImage
    extra = 0
    fields = ('image', 'caption', 'order')


@admin.register(SponsorshipUpdate)
class SponsorshipUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'tenant', 'author', 'min_tier_level', 'created_at')
    list_filter = ('tenant', 'min_tier_level', 'created_at')
    search_fields = ('title', 'tenant__name', 'author__email')
    filter_horizontal = ('tags',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [SponsorshipUpdateImageInline]
