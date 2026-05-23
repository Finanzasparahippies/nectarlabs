from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from .storage import R2ContractStorage

def contract_pdf_path(instance, filename):
    # Organizar por Año / Mes / Cliente / NombreArchivo
    date = instance.signed_at if instance.signed_at else timezone.now()
    year = date.strftime('%Y')
    month = date.strftime('%m')
    client_slug = slugify(instance.full_name)
    return f'contracts/{year}/{month}/{client_slug}/{filename}'

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
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50)
    address = models.TextField()
    project_idea = models.TextField()
    signature_base64 = models.TextField(help_text="Client signature")
    signed_at = models.DateTimeField(auto_now_add=True)
    
    developer_signature = models.TextField(blank=True, null=True, help_text="Nectar Labs signature")
    developer_signed_at = models.DateTimeField(blank=True, null=True)
    is_fully_signed = models.BooleanField(default=False)
    
    class BrandDesignTier(models.TextChoices):
        NONE = 'NONE', 'Sin Diseño de Marca'
        WEEKLY = 'WEEKLY', 'Semanal ($500/sem)'
        BIWEEKLY = 'BIWEEKLY', 'Quincenal ($900/qna)'
        MONTHLY = 'MONTHLY', 'Mensual ($1600/mes)'

    brand_design_tier = models.CharField(
        max_length=20, 
        choices=BrandDesignTier.choices, 
        default=BrandDesignTier.NONE
    )
    brand_design_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    addons = models.ManyToManyField('AddOn', blank=True, related_name='contracts')

    class PaymentMethod(models.TextChoices):
        STRIPE = 'STRIPE', 'Tarjeta (Stripe)'
        SPEI = 'SPEI', 'Transferencia Electrónica (SPEI)'
        DEPOSIT = 'DEPOSIT', 'Depósito Directo (BBVA)'

    payment_commitment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.SPEI
    )

    pdf_file = models.FileField(upload_to=contract_pdf_path, storage=R2ContractStorage(), blank=True, null=True)
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

class PaymentInstallment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        PAID = 'PAID', 'Pagado'
        CANCELLED = 'CANCELLED', 'Cancelado'

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='installments')
    installment_number = models.IntegerField(help_text="Mes de pago (1 de 6, 2 de 6, etc.)")
    due_date = models.DateField(help_text="Fecha límite de pago")
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Monto mensual total (Plan + Adiciones)")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=50, blank=True, null=True, help_text="Método usado para este pago")
    receipt_file = models.FileField(upload_to='receipts/%Y/%m/', blank=True, null=True, help_text="Comprobante de SPEI/Depósito subido por cliente")
    stripe_invoice_id = models.CharField(max_length=150, blank=True, null=True)
    cfdi_uuid = models.CharField(max_length=100, blank=True, null=True, help_text="Folio Fiscal / UUID CFDI del SAT")
    paid_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensualidad {self.installment_number}/6 - {self.contract.full_name} (${self.amount})"


class AddOn(models.Model):
    class Complexity(models.TextChoices):
        LOW = 'Baja', 'Baja'
        MEDIUM = 'Media', 'Media'
        HIGH = 'Alta', 'Alta'
        VERY_HIGH = 'Muy Alta', 'Muy Alta'

    slug = models.SlugField(max_length=100, unique=True, help_text="Identificador único (ej: live-chat)")
    name = models.CharField(max_length=150, verbose_name="Nombre del Add-on")
    category_badge = models.CharField(max_length=100, verbose_name="Categoría (Badge)")
    description = models.TextField(verbose_name="Descripción Corta")
    detailed_description = models.TextField(verbose_name="Descripción Detallada")
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Mensual (MXN)")
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Anual (MXN)")
    origin_project = models.CharField(max_length=150, verbose_name="Proyecto Origen")
    source_reference = models.CharField(max_length=255, verbose_name="Referencia de Código")
    complexity = models.CharField(
        max_length=50, 
        choices=Complexity.choices, 
        default=Complexity.MEDIUM, 
        verbose_name="Complejidad de Integración"
    )
    server_requirements = models.TextField(verbose_name="Requerimientos de Servidor")
    technical_details = models.JSONField(default=list, help_text="Lista JSON de detalles técnicos (funcionalidades clave)")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID de precio mensual de Stripe para suscripciones directas")
    stripe_yearly_price_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID de precio anual de Stripe para suscripciones directas")

    def __str__(self):
        return f"{self.name} (${self.monthly_price}/mes)"
