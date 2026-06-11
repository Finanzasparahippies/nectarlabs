from django.db import models
from django.conf import settings
from django.core.files.storage import default_storage

# Determine storage class dynamically to allow local/test overrides
if getattr(settings, 'TESTING', False):
    from django.core.files.storage import FileSystemStorage
    raw_storage = FileSystemStorage()
else:
    try:
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        raw_storage = RawMediaCloudinaryStorage()
    except ImportError:
        raw_storage = default_storage

class BookingConfig(models.Model):
    tenant = models.OneToOneField('tenants.Tenant', on_delete=models.CASCADE, related_name='booking_config')
    default_fee = models.DecimalField(max_digits=10, decimal_places=2, default=25000.00)
    contract_template = models.TextField(
        default=(
            "CONTRATO DE PRESTACIÓN DE SERVICIOS\n\n"
            "Este contrato rige la relación entre {{tenant_name}} y el organizador {{client_name}}.\n\n"
            "1. OBJETO: El prestador brindará sus servicios oficiales el día {{event_date}}.\n"
            "2. HONORARIOS: Se establece una tarifa de ${{fee}} MXN.\n"
            "3. CONDICIONES: Liquidación del 50% anticipado y 50% restante antes del evento."
        )
    )
    venue_types_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom key-value pairs for venue/event types (e.g. {'festival': 'Festival', 'private': 'Evento Privado'})"
    )

    def get_venue_display(self, key):
        if self.venue_types_json and key in self.venue_types_json:
            return self.venue_types_json[key]
        defaults = {
            'festival': 'Festival',
            'theater': 'Teatro / Auditorio',
            'club': 'Club / Antro',
            'private': 'Evento Privado',
            'other': 'Otro',
        }
        return defaults.get(key, key)

    def __str__(self):
        return f"Configuración de Booking para {self.tenant.subdomain}"

class BookingInquiry(models.Model):
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='booking_inquiries')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    company = models.CharField(max_length=255, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    venue_type = models.CharField(max_length=100)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    def get_venue_type_display(self):
        try:
            config = self.tenant.booking_config
            return config.get_venue_display(self.venue_type)
        except Exception:
            defaults = {
                'festival': 'Festival',
                'theater': 'Teatro / Auditorio',
                'club': 'Club / Antro',
                'private': 'Evento Privado',
                'other': 'Otro',
            }
            return defaults.get(self.venue_type, self.venue_type)

    def __str__(self):
        return f"Inquiry from {self.name} - {self.venue_type} (Tenant: {self.tenant.subdomain})"

    class Meta:
        verbose_name_plural = "Booking Inquiries"

class BookingContract(models.Model):
    inquiry = models.OneToOneField(BookingInquiry, on_delete=models.CASCADE, related_name='contract')
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    signature_base64 = models.TextField(null=True, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    manager_signature = models.TextField(null=True, blank=True)
    manager_signed_at = models.DateTimeField(null=True, blank=True)
    is_fully_signed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to='contracts/', storage=raw_storage, null=True, blank=True)

    def __str__(self):
        return f"Contrato de Booking - {self.inquiry.name} ({self.inquiry.date})"
