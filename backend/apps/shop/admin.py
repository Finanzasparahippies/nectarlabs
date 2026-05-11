from django.contrib import admin
from .models import Plan, Product, Order

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'hours', 'is_active')
    list_filter = ('is_active',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock')
    search_fields = ('name',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'stripe_payment_intent')

