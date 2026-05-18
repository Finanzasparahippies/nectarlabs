from django.contrib import admin
from .models import Project, TimeLog, FAQ, ServerCost, BusinessExpense

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

