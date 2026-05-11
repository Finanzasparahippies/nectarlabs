from django.db import models
from django.conf import settings
from .storage import R2ContractStorage

class Plan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    hours = models.IntegerField(help_text="Hours included in this plan")
    description = models.TextField()
    is_recommended = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class Contract(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contracts')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    full_name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50)
    address = models.TextField()
    project_idea = models.TextField()
    signature_base64 = models.TextField(help_text="Client signature")
    signed_at = models.DateTimeField(auto_now_add=True)
    
    developer_signature = models.TextField(blank=True, null=True, help_text="Nectar Labs signature")
    developer_signed_at = models.DateTimeField(blank=True, null=True)
    is_fully_signed = models.BooleanField(default=False)
    
    pdf_file = models.FileField(upload_to='contracts/', storage=R2ContractStorage(), blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    next_payment_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"Contrato {self.id} - {self.full_name}"

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True)
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)

    def __str__(self):
        return self.name

class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        SHIPPED = 'SHIPPED', 'Shipped'
        CANCELLED = 'CANCELLED', 'Cancelled'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    stripe_payment_intent = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} - {self.user.email}"
