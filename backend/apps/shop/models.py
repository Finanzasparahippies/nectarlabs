from decimal import Decimal
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
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Porcentaje de descuento de temporada (0 a 100)"
    )
    
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
    promo_code = models.ForeignKey('PromoCode', on_delete=models.SET_NULL, null=True, blank=True, related_name='contracts')
    project_quote = models.ForeignKey(
        'dashboard.ProjectQuote', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='contracts'
    )

    class PaymentMethod(models.TextChoices):
        STRIPE = 'STRIPE', 'Tarjeta (Stripe)'
        SPEI = 'SPEI', 'Transferencia Electrónica (SPEI)'
        DEPOSIT = 'DEPOSIT', 'Depósito Directo (BBVA)'

    payment_commitment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.SPEI
    )

    class PaymentDay(models.TextChoices):
        WEEKLY_MONDAY = 'WEEKLY_MONDAY', 'Lunes de cada semana (Semanal)'
        FORTNIGHTLY_1ST_15TH = 'FORTNIGHTLY_1ST_15TH', 'Días 1 y 15 de cada mes (Quincenal)'
        MONTHLY_1ST = 'MONTHLY_1ST', 'Día 1ero de cada mes (Mensual)'

    payment_day = models.CharField(
        max_length=30,
        choices=PaymentDay.choices,
        default=PaymentDay.MONTHLY_1ST
    )

    pdf_file = models.FileField(upload_to=contract_pdf_path, storage=R2ContractStorage(), blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    next_payment_date = models.DateField(blank=True, null=True)
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Porcentaje de descuento especial (0 a 100)"
    )
 
    def save(self, *args, **kwargs):
        if not self.pk:
            if self.promo_code and self.promo_code.is_valid():
                self.discount_percentage = self.promo_code.discount_percentage
                self.promo_code.used_count += 1
                self.promo_code.save()
            elif self.plan:
                self.discount_percentage = self.plan.discount_percentage
            else:
                self.discount_percentage = 0.00

            # Reward referrer if it's a CLIENT promo code
            if self.promo_code and self.promo_code.code_type == 'CLIENT' and self.promo_code.referrer:
                try:
                    ref_contract = Contract.objects.filter(user=self.promo_code.referrer, is_active=True).first()
                    if ref_contract:
                        next_inst = ref_contract.installments.filter(
                            installment_type='DEVELOPMENT', 
                            status='PENDING'
                        ).order_by('due_date').first()
                        if next_inst:
                            next_inst.discount_percentage = self.promo_code.discount_percentage
                            next_inst.promo_code = self.promo_code
                            next_inst.amount = next_inst.base_amount * (1 - self.promo_code.discount_percentage / 100)
                            next_inst.save()
                except Exception as e:
                    import logging
                    logging.error(f"Error rewarding referrer in contract save: {e}", exc_info=True)

        if self.plan:
            plan_name_lower = self.plan.name.lower()
            if any(kw in plan_name_lower for kw in ['basico', 'básico', 'basic']):
                self.payment_day = Contract.PaymentDay.WEEKLY_MONDAY
            elif any(kw in plan_name_lower for kw in ['mid', 'pro', 'medio', 'quincenal']):
                self.payment_day = Contract.PaymentDay.FORTNIGHTLY_1ST_15TH
            else:
                self.payment_day = Contract.PaymentDay.MONTHLY_1ST
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contrato {self.id} - {self.full_name}"

class Product(models.Model):
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='products',
        null=True,
        blank=True
    )
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

    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='orders',
        null=True,
        blank=True
    )
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

    class InstallmentType(models.TextChoices):
        DEVELOPMENT = 'DEVELOPMENT', 'Desarrollo/Plan'
        DESIGN = 'DESIGN', 'Diseño de Marca'

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='installments')
    installment_type = models.CharField(
        max_length=20,
        choices=InstallmentType.choices,
        default=InstallmentType.DEVELOPMENT
    )
    installment_number = models.IntegerField(help_text="Número de abono (1 de 6, 2 de 24, etc.)")
    due_date = models.DateField(help_text="Fecha límite de pago")
    
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Monto base sin descuentos")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Porcentaje de descuento aplicado a este pago")
    promo_code = models.ForeignKey('PromoCode', on_delete=models.SET_NULL, null=True, blank=True, related_name='installments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Monto final a pagar (después de descuentos)")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=50, blank=True, null=True, help_text="Método usado para este pago")
    receipt_file = models.FileField(upload_to='receipts/%Y/%m/', blank=True, null=True, help_text="Comprobante de SPEI/Depósito subido por cliente")
    stripe_invoice_id = models.CharField(max_length=150, blank=True, null=True)
    cfdi_uuid = models.CharField(max_length=100, blank=True, null=True, help_text="Folio Fiscal / UUID CFDI del SAT")
    paid_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def apply_discount(self, pct, promo=None):
        self.discount_percentage = pct
        self.promo_code = promo
        self.amount = self.base_amount * (1 - pct / 100)
        self.save()

    def save(self, *args, **kwargs):
        is_new = not self.pk
        old_status = None
        if not is_new:
            try:
                old_status = PaymentInstallment.objects.get(pk=self.pk).status
            except PaymentInstallment.DoesNotExist:
                pass
                
        # Auto-compute amount if not set
        if self.amount is None or self.amount == 0:
            self.amount = self.base_amount * (1 - self.discount_percentage / 100)

        super().save(*args, **kwargs)

        # Trigger commission generation for Salespeople on PAID transition
        if self.status == 'PAID' and (is_new or old_status != 'PAID'):
            # Activate tenant of the contract owner
            try:
                from apps.tenants.models import Tenant
                tenant = Tenant.objects.filter(owner=self.contract.user).first()
                if tenant and not tenant.is_active:
                    tenant.is_active = True
                    tenant.save()
            except Exception as tenant_act_err:
                import logging
                logging.getLogger(__name__).error(f"Error activating tenant on paid installment: {tenant_act_err}", exc_info=True)

            contract = self.contract
            if contract.promo_code and contract.promo_code.code_type == 'SELLER' and contract.promo_code.referrer:
                referrer = contract.promo_code.referrer
                # Restructure: Commissions only for SALES role users approved by the owner directly
                if referrer.role == 'SALES' and getattr(referrer, 'is_approved_seller', False):
                    from .models import SalesCommission
                    if not SalesCommission.objects.filter(installment=self).exists():
                        installment_number = self.installment_number
                        if installment_number == 1:
                            pct = Decimal('10.00')
                        elif installment_number == 2:
                            pct = Decimal('5.00')
                        else:
                            pct = Decimal('2.00')
                        
                        commission_amount = self.amount * (pct / Decimal('100'))
                        SalesCommission.objects.create(
                            salesperson=referrer,
                            installment=self,
                            commission_percentage=pct,
                            amount=commission_amount,
                            status=SalesCommission.Status.PENDING
                        )

    def __str__(self):
        return f"{self.get_installment_type_display()} #{self.installment_number} - {self.contract.full_name} (${self.amount})"


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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        updated = False
        if getattr(settings, "STRIPE_SECRET_KEY", None) and (not self.stripe_price_id or not self.stripe_yearly_price_id):
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                # Create Stripe Product
                product = stripe.Product.create(
                    name=f"[Nectar Labs Add-on] {self.name}",
                    description=self.description,
                )
                
                if not self.stripe_price_id:
                    monthly_price = stripe.Price.create(
                        unit_amount=int(self.monthly_price * 100),
                        currency="mxn",
                        product=product.id,
                        recurring={"interval": "month"},
                    )
                    self.stripe_price_id = monthly_price.id
                    updated = True
                    
                if not self.stripe_yearly_price_id:
                    yearly_price = stripe.Price.create(
                        unit_amount=int(self.yearly_price * 100),
                        currency="mxn",
                        product=product.id,
                        recurring={"interval": "year"},
                    )
                    self.stripe_yearly_price_id = yearly_price.id
                    updated = True
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error creating Stripe Product for AddOn {self.slug}: {e}")
                
        if updated:
            super().save(update_fields=['stripe_price_id', 'stripe_yearly_price_id'])

    def __str__(self):
        return f"{self.name} (${self.monthly_price}/mes)"


class PromoCode(models.Model):
    class CodeType(models.TextChoices):
        CLIENT = 'CLIENT', 'Cliente'
        SELLER = 'SELLER', 'Vendedor'

    code = models.CharField(max_length=50, unique=True, help_text="Código único de la promoción (ej: AMIGO10)")
    code_type = models.CharField(max_length=20, choices=CodeType.choices, default=CodeType.CLIENT, help_text="Tipo de referido")
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Porcentaje de descuento que otorga (0 a 100)"
    )
    is_active = models.BooleanField(default=True, help_text="Indica si el código está activo")
    max_uses = models.PositiveIntegerField(null=True, blank=True, help_text="Límite de usos permitidos (nulo para ilimitado)")
    used_count = models.PositiveIntegerField(default=0, help_text="Veces que ha sido utilizado")
    valid_until = models.DateField(null=True, blank=True, help_text="Fecha límite de validez")
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='referred_promo_codes',
        help_text="Usuario que refirió este código (si aplica)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        if not self.is_active:
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        if self.valid_until is not None and self.valid_until < timezone.now().date():
            return False
        return True

    def save(self, *args, **kwargs):
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} ({self.get_code_type_display()} - {self.discount_percentage}%)"


class SalesCommission(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente de Pago'
        PAID = 'PAID', 'Pagado al Vendedor'

    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sales_commissions'
    )
    installment = models.ForeignKey(
        'PaymentInstallment', 
        on_delete=models.CASCADE, 
        related_name='commissions'
    )
    commission_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2
    )
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2
    )
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comisión {self.salesperson.email} - Mes {self.installment.installment_number} (${self.amount})"
