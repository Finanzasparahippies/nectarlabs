from django.db import models
from django.conf import settings
from apps.tenants.models import Tenant

from django.core.files.storage import default_storage

# Determine storage class dynamically to allow local/test overrides
if getattr(settings, 'TESTING', False):
    from django.core.files.storage import FileSystemStorage
    cfdi_storage = FileSystemStorage()
else:
    try:
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        cfdi_storage = RawMediaCloudinaryStorage()
    except ImportError:
        cfdi_storage = default_storage

class TaxProfile(models.Model):
    """
    Información fiscal única de cada negocio (inquilino) delegada en el PAC (Facturapi)
    """
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='tax_profile')
    rfc = models.CharField(max_length=13, verbose_name="RFC")
    razon_social = models.CharField(max_length=255, verbose_name="Razón Social / Nombre")
    regimen_fiscal = models.CharField(max_length=3, verbose_name="Régimen Fiscal (Clave SAT)")
    codigo_postal = models.CharField(max_length=5, verbose_name="Código Postal Fiscal")
    
    # Identificador único de la organización del inquilino en Facturapi (PAC)
    facturapi_organization_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        help_text="ID de Organización en Facturapi"
    )
    
    # Default billing keys configurable per tenant
    default_product_key = models.CharField(
        max_length=20,
        default="43231500",
        verbose_name="Clave SAT de Producto por Defecto",
        help_text="Clave de producto o servicio por defecto para facturación manual (ej. 43231500 para Software)"
    )
    default_unit_key = models.CharField(
        max_length=20,
        default="E48",
        verbose_name="Clave SAT de Unidad por Defecto",
        help_text="Clave de unidad por defecto para facturación manual (ej. E48 para Unidad de servicio)"
    )
    default_unit_name = models.CharField(
        max_length=100,
        default="Unidad de servicio",
        verbose_name="Nombre de Unidad por Defecto",
        help_text="Nombre de unidad por defecto (ej. Unidad de servicio o Pieza)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.rfc} - {self.razon_social} ({self.tenant.name})"


class Invoice(models.Model):
    """
    Registro de CFDI emitido por inquilino a través del PAC
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente de Timbrado'
        LCO_SYNC_PENDING = 'LCO_SYNC_PENDING', 'Esperando Sincronización LCO (SAT)'
        PAID = 'PAID', 'Timbrada con Éxito'
        CANCEL_REQUESTED = 'CANCEL_REQUESTED', 'Cancelación Solicitada (Buzón SAT)'
        CANCELLED = 'CANCELLED', 'Cancelada'
        FAILED = 'FAILED', 'Error en Timbrado'

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='invoices')
    stripe_invoice_id = models.CharField(max_length=150, blank=True, null=True, verbose_name="ID de Factura Stripe")
    
    # Referencias del PAC y del SAT
    facturapi_invoice_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="ID Factura PAC")
    uuid_sat = models.UUIDField(null=True, blank=True, verbose_name="Folio Fiscal SAT (UUID)")
    
    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Total Facturado (MXN)")
    status = models.CharField(
        max_length=30, 
        choices=Status.choices, 
        default=Status.PENDING,
        verbose_name="Estado de Factura"
    )
    
    # Archivos del CFDI guardados
    xml_file = models.FileField(upload_to='invoices/xml/', storage=cfdi_storage, blank=True, null=True, verbose_name="Archivo XML CFDI")
    pdf_file = models.FileField(upload_to='invoices/pdf/', storage=cfdi_storage, blank=True, null=True, verbose_name="Representación Impresa PDF")
    
    # Detalles de error (LCO, errores de validación)
    error_message = models.TextField(blank=True, null=True, verbose_name="Detalles de Error")
    
    is_tenant_to_customer = models.BooleanField(
        default=False,
        verbose_name="Factura de Inquilino a Cliente",
        help_text="Indica si la factura fue emitida por el inquilino a su propio cliente o por Néctar Labs al inquilino."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"CFDI {self.uuid_sat or 'Pendiente'} - {self.tenant.name} (${self.total})"


class SATProductKey(models.Model):
    """
    Claves oficiales de Productos y Servicios del SAT (catálogo c_ClaveProdServ)
    """
    code = models.CharField(max_length=20, unique=True, db_index=True, verbose_name="Clave SAT")
    description = models.TextField(db_index=True, verbose_name="Descripción")
    normalized_description = models.TextField(db_index=True, blank=True, null=True, verbose_name="Descripción Normalizada")
    is_active = models.BooleanField(default=True, verbose_name="Vigente")

    def __str__(self):
        return f"{self.code} - {self.description[:50]}"


class SATUnitKey(models.Model):
    """
    Claves oficiales de Unidades de Medida del SAT (catálogo c_ClaveUnidad)
    """
    code = models.CharField(max_length=20, unique=True, db_index=True, verbose_name="Clave SAT")
    name = models.CharField(max_length=255, verbose_name="Nombre")
    normalized_name = models.CharField(max_length=255, db_index=True, blank=True, null=True, verbose_name="Nombre Normalizado")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Vigente")

    def __str__(self):
        return f"{self.code} - {self.name}"


class SalesNote(models.Model):
    class Status(models.TextChoices):
        PAID = 'PAID', 'Pagada'
        INVOICED = 'INVOICED', 'Facturada'
        CANCELLED = 'CANCELLED', 'Cancelada'

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='sales_notes')
    folio = models.CharField(max_length=50, unique=True, verbose_name="Folio de Nota")
    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Total (MXN)")
    payment_method = models.CharField(
        max_length=50,
        default="01",
        verbose_name="Forma de Pago SAT"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PAID,
        verbose_name="Estado de la Nota"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.folio:
            import uuid
            from django.utils import timezone
            date_str = timezone.now().strftime("%Y%m%d")
            unique_suffix = uuid.uuid4().hex[:6].upper()
            self.folio = f"NV-{date_str}-{unique_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Nota {self.folio} - {self.tenant.name} (${self.total})"


class SalesNoteItem(models.Model):
    sales_note = models.ForeignKey(SalesNote, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255, verbose_name="Concepto")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Cantidad")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio Unitario")
    product_key = models.CharField(
        max_length=20,
        default="01010101",
        verbose_name="Clave SAT de Producto"
    )
    unit_key = models.CharField(
        max_length=20,
        default="E48",
        verbose_name="Clave SAT de Unidad"
    )

    def __str__(self):
        return f"{self.quantity} x {self.description} (${self.unit_price})"

