from django.db import migrations, models
import apps.shop.models

class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0029_order_shipping_and_orderitem'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymentinstallment',
            name='receipt_file',
            field=models.FileField(blank=True, help_text='Comprobante de SPEI/Depósito subido por cliente', null=True, storage=apps.shop.models.raw_storage, upload_to='receipts/%Y/%m/'),
        ),
    ]
