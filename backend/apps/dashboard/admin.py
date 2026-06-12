from django.contrib import admin
from .models import Project, TimeLog, FAQ, ServerCost, BusinessExpense, ProjectAdvance, ProjectQuote, Lead, LeadAppointment

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'status', 'created_at')
    list_filter = ('status', 'client')
    search_fields = ('name', 'client__email')

@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display = ('project', 'date', 'hours')
    list_filter = ('date', 'project')
    date_hierarchy = 'date'

@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question', 'category')
    list_filter = ('category',)

@admin.register(ServerCost)
class ServerCostAdmin(admin.ModelAdmin):
    list_display = ('provider', 'name', 'cost', 'billing_cycle', 'next_payment_date', 'is_active')
    list_filter = ('provider', 'billing_cycle', 'is_active')
    search_fields = ('name',)

@admin.register(BusinessExpense)
class BusinessExpenseAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost', 'billing_cycle', 'next_payment_date', 'is_active')
    list_filter = ('billing_cycle', 'is_active')
    search_fields = ('name',)

@admin.register(ProjectAdvance)
class ProjectAdvanceAdmin(admin.ModelAdmin):
    list_display = ('project', 'milestone', 'title', 'delivered_at', 'delivered_by')
    list_filter = ('milestone', 'project', 'delivered_at')
    search_fields = ('title', 'description', 'project__name')


@admin.register(ProjectQuote)
class ProjectQuoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'client_name', 'client_email', 'salesperson', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('client_name', 'client_email', 'project_name')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


class LeadAppointmentInline(admin.TabularInline):
    model = LeadAppointment
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'salesperson', 'status', 'estimated_value', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone', 'salesperson__email')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    inlines = [LeadAppointmentInline]


@admin.register(LeadAppointment)
class LeadAppointmentAdmin(admin.ModelAdmin):
    list_display = ('lead', 'date', 'time', 'salesperson', 'status', 'created_at')
    list_filter = ('status', 'date', 'created_at')
    search_fields = ('lead__name', 'lead__email', 'notes', 'salesperson__email')
    readonly_fields = ('created_at',)
    ordering = ('-date', '-time')


