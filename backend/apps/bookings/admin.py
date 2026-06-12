from django.contrib import admin
from .models import BookingConfig, BookingInquiry, BookingContract


@admin.register(BookingConfig)
class BookingConfigAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'default_fee')
    search_fields = ('tenant__name', 'tenant__subdomain')


class BookingContractInline(admin.StackedInline):
    model = BookingContract
    extra = 0
    readonly_fields = ('signed_at', 'manager_signed_at', 'created_at', 'is_fully_signed')
    can_delete = False


@admin.register(BookingInquiry)
class BookingInquiryAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'tenant', 'venue_type', 'date', 'is_reviewed', 'created_at')
    list_filter = ('is_reviewed', 'venue_type', 'tenant', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company', 'tenant__name')
    readonly_fields = ('created_at',)
    inlines = [BookingContractInline]


@admin.register(BookingContract)
class BookingContractAdmin(admin.ModelAdmin):
    list_display = ('inquiry', 'fee', 'is_fully_signed', 'signed_at', 'manager_signed_at', 'created_at')
    list_filter = ('is_fully_signed', 'signed_at')
    search_fields = ('inquiry__name', 'inquiry__email')
    readonly_fields = ('signed_at', 'manager_signed_at', 'created_at')
