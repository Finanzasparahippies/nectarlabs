from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='is_tenant_to_customer',
            field=models.BooleanField(
                default=False,
                help_text='Indica si la factura fue emitida por el inquilino a su propio cliente o por Néctar Labs al inquilino.',
                verbose_name='Factura de Inquilino a Cliente'
            ),
        ),
    ]
