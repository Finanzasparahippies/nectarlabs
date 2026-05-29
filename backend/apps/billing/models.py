from django.db import models
from django.conf import settings
from apps.tenants.models import Tenant

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
    xml_file = models.FileField(upload_to='invoices/xml/', blank=True, null=True, verbose_name="Archivo XML CFDI")
    pdf_file = models.FileField(upload_to='invoices/pdf/', blank=True, null=True, verbose_name="Representación Impresa PDF")
    
    # Detalles de error (LCO, errores de validación)
    error_message = models.TextField(blank=True, null=True, verbose_name="Detalles de Error")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"CFDI {self.uuid_sat or 'Pendiente'} - {self.tenant.name} (${self.total})"
