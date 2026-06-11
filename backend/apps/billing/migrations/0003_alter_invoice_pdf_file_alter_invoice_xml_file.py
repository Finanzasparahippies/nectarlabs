from django.db import migrations, models
import apps.billing.models

class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0002_invoice_is_tenant_to_customer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoice',
            name='pdf_file',
            field=models.FileField(blank=True, null=True, storage=apps.billing.models.cfdi_storage, upload_to='invoices/pdf/', verbose_name='Representación Impresa PDF'),
        ),
        migrations.AlterField(
            model_name='invoice',
            name='xml_file',
            field=models.FileField(blank=True, null=True, storage=apps.billing.models.cfdi_storage, upload_to='invoices/xml/', verbose_name='Archivo XML CFDI'),
        ),
    ]
