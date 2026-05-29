from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0005_tenant_accent_color_light_tenant_bg_color_light_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaxProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rfc', models.CharField(max_length=13, verbose_name='RFC')),
                ('razon_social', models.CharField(max_length=255, verbose_name='Razón Social / Nombre')),
                ('regimen_fiscal', models.CharField(max_length=3, verbose_name='Régimen Fiscal (Clave SAT)')),
                ('codigo_postal', models.CharField(max_length=5, verbose_name='Código Postal Fiscal')),
                ('facturapi_organization_id', models.CharField(blank=True, help_text='ID de Organización en Facturapi', max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='tax_profile', to='tenants.tenant')),
            ],
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_invoice_id', models.CharField(blank=True, max_length=150, null=True, verbose_name='ID de Factura Stripe')),
                ('facturapi_invoice_id', models.CharField(blank=True, max_length=100, null=True, verbose_name='ID Factura PAC')),
                ('uuid_sat', models.UUIDField(blank=True, null=True, verbose_name='Folio Fiscal SAT (UUID)')),
                ('total', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Total Facturado (MXN)')),
                ('status', models.CharField(choices=[('PENDING', 'Pendiente de Timbrado'), ('LCO_SYNC_PENDING', 'Esperando Sincronización LCO (SAT)'), ('PAID', 'Timbrada con Éxito'), ('CANCEL_REQUESTED', 'Cancelación Solicitada (Buzón SAT)'), ('CANCELLED', 'Cancelada'), ('FAILED', 'Error en Timbrado')], default='PENDING', max_length=30, verbose_name='Estado de Factura')),
                ('xml_file', models.FileField(blank=True, null=True, upload_to='invoices/xml/', verbose_name='Archivo XML CFDI')),
                ('pdf_file', models.FileField(blank=True, null=True, upload_to='invoices/pdf/', verbose_name='Representación Impresa PDF')),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='Detalles de Error')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='tenants.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
