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
    stripe_product_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID del Producto de Stripe")
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID del Precio de Stripe (Base Mensual)")
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        updated = False
        if getattr(settings, "STRIPE_SECRET_KEY", None) and not getattr(settings, "TESTING", False) and (not self.stripe_product_id or not self.stripe_price_id):
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                from django.utils.text import slugify
                plan_slug = slugify(self.name)
                
                # Search for existing Stripe Product with this plan slug or plan_id
                product = None
                for p in stripe.Product.list(limit=100).auto_paging_iter():
                    if p.active and (p.metadata.get("plan_slug") == plan_slug or p.metadata.get("plan_id") == str(self.id)):
                        product = p
                        break
                
                expected_name = f"[Nectar Labs Plan] {self.name}"
                if not product:
                    product = stripe.Product.create(
                        name=expected_name,
                        description=self.description,
                        metadata={"plan_id": str(self.id), "plan_slug": plan_slug},
                        idempotency_key=f"plan_product_{self.id}"
                    )
                else:
                    # Update details on Stripe if changed
                    updates = {}
                    if product.name != expected_name:
                        updates["name"] = expected_name
                    if product.description != self.description:
                        updates["description"] = self.description
                    
                    current_plan_id = product.metadata.get("plan_id")
                    current_plan_slug = product.metadata.get("plan_slug")
                    if current_plan_id != str(self.id) or current_plan_slug != plan_slug:
                        updates["metadata"] = {"plan_id": str(self.id), "plan_slug": plan_slug}
                    
                    if updates:
                        stripe.Product.modify(product.id, **updates)
                
                self.stripe_product_id = product.id
                
                # Fetch active prices for this product to avoid duplicates
                prices = stripe.Price.list(product=product.id, active=True)
                
                price_id = None
                amount_cents = int(self.price * 100)
                for p in prices.data:
                    if not p.recurring and p.unit_amount == amount_cents and p.currency == "mxn":
                        price_id = p.id
                        break
                
                if not price_id:
                    price_obj = stripe.Price.create(
                        unit_amount=amount_cents,
                        currency="mxn",
                        product=product.id,
                        idempotency_key=f"plan_price_{self.id}_{amount_cents}"
                    )
                    price_id = price_obj.id
                
                self.stripe_price_id = price_id
                updated = True
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error creating Stripe Product/Prices for Plan {self.name}: {e}")
                
        if updated:
            super().save(update_fields=['stripe_product_id', 'stripe_price_id'])

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

            # Auto-select payment_day from plan name only on initial creation
            # AND only when the caller did not explicitly set a payment_day
            # (i.e., it's still at the model's default value MONTHLY_1ST).
            if self.plan and self.payment_day == Contract.PaymentDay.MONTHLY_1ST:
                plan_name_lower = self.plan.name.lower()
                if any(kw in plan_name_lower for kw in ['basico', 'básico', 'basic']):
                    self.payment_day = Contract.PaymentDay.WEEKLY_MONDAY
                elif any(kw in plan_name_lower for kw in ['mid', 'pro', 'medio', 'quincenal']):
                    self.payment_day = Contract.PaymentDay.FORTNIGHTLY_1ST_15TH
                # else: keep MONTHLY_1ST (already at default)
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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    user_email = models.EmailField(blank=True, null=True)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    stripe_payment_intent = models.CharField(max_length=200, blank=True, null=True)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Address Info
    full_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, default="", blank=True, null=True, help_text="Teléfono del cliente")
    street_and_number = models.TextField(default="", blank=True, null=True, help_text="Calle, número exterior e interior")
    suburb = models.CharField(max_length=255, default="", blank=True, null=True, verbose_name="Colonia")
    city = models.CharField(max_length=100, default="", blank=True, null=True, verbose_name="Ciudad")
    state = models.CharField(max_length=100, default="", blank=True, null=True, verbose_name="Estado")
    postal_code = models.CharField(max_length=10, default="", blank=True, null=True, verbose_name="Código Postal")
    country = models.CharField(max_length=100, default="MX", blank=True, null=True, verbose_name="País")

    # Datos de la Guía Automatizada
    shipping_provider = models.CharField(max_length=50, blank=True, null=True, help_text="Ej: FedEx, DHL")
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    tracking_url = models.URLField(max_length=500, blank=True, null=True)
    shipping_label_pdf = models.URLField(max_length=500, blank=True, null=True)

    # Costos detallados de envío
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo de envío cobrado al cliente (con margen)")
    shipping_cost_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo base de Skydropx")
    skydropx_rate_id = models.CharField(max_length=255, blank=True, null=True, help_text="ID de tarifa seleccionado")

    def __str__(self):
        email_str = self.user.email if self.user else (self.user_email or "No Email")
        return f"Order {self.id} - {email_str}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

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
                        if contract.project_quote:
                            # Custom project commission: 20% of the entire quote total_price, paid ONLY at installment 1 (anticipo)
                            if self.installment_number == 1:
                                pct = Decimal('20.00')
                                commission_amount = Decimal(str(contract.project_quote.total_price)) * (pct / Decimal('100'))
                                SalesCommission.objects.create(
                                    salesperson=referrer,
                                    installment=self,
                                    commission_percentage=pct,
                                    amount=commission_amount,
                                    status=SalesCommission.Status.PENDING
                                )
                        else:
                            # Regular tiered commission (10%, 5%, 2%)
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
        if getattr(settings, "STRIPE_SECRET_KEY", None) and not getattr(settings, "TESTING", False) and (not self.stripe_price_id or not self.stripe_yearly_price_id):
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                # Search for existing Stripe Product with this slug
                product = None
                for p in stripe.Product.list(limit=100).auto_paging_iter():
                    if p.active and p.metadata.get("addon_slug") == self.slug:
                        product = p
                        break
                expected_name = f"[Nectar Labs Add-on] {self.name}"
                if not product:
                    product = stripe.Product.create(
                        name=expected_name,
                        description=self.description,
                        metadata={"addon_slug": self.slug},
                        idempotency_key=f"addon_product_{self.slug}"
                    )
                else:
                    # Update details on Stripe if changed
                    if product.name != expected_name or product.description != self.description:
                        stripe.Product.modify(
                            product.id,
                            name=expected_name,
                            description=self.description
                        )
                
                # Fetch active prices for this product to avoid duplicates
                prices = stripe.Price.list(product=product.id, active=True)
                
                if not self.stripe_price_id:
                    monthly_price_id = None
                    for p in prices.data:
                        if p.recurring and p.recurring.get("interval") == "month" and p.unit_amount == int(self.monthly_price * 100) and p.currency == "mxn":
                            monthly_price_id = p.id
                            break
                    if not monthly_price_id:
                        monthly_price = stripe.Price.create(
                            unit_amount=int(self.monthly_price * 100),
                            currency="mxn",
                            product=product.id,
                            recurring={"interval": "month"},
                            idempotency_key=f"addon_price_monthly_{self.slug}_{int(self.monthly_price * 100)}"
                        )
                        monthly_price_id = monthly_price.id
                    self.stripe_price_id = monthly_price_id
                    updated = True
                    
                if not self.stripe_yearly_price_id:
                    yearly_price_id = None
                    for p in prices.data:
                        if p.recurring and p.recurring.get("interval") == "year" and p.unit_amount == int(self.yearly_price * 100) and p.currency == "mxn":
                            yearly_price_id = p.id
                            break
                    if not yearly_price_id:
                        yearly_price = stripe.Price.create(
                            unit_amount=int(self.yearly_price * 100),
                            currency="mxn",
                            product=product.id,
                            recurring={"interval": "year"},
                            idempotency_key=f"addon_price_yearly_{self.slug}_{int(self.yearly_price * 100)}"
                        )
                        yearly_price_id = yearly_price.id
                    self.stripe_yearly_price_id = yearly_price_id
                    updated = True
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error creating Stripe Product/Prices for AddOn {self.slug}: {e}")
                
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


class StripeEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.event_id
