# Generated manually

from django.db import migrations, models
import apps.shop.models
import apps.shop.storage


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0025_product_tenant'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contract',
            name='pdf_file',
            field=models.FileField(
                blank=True,
                null=True,
                storage=apps.shop.storage.R2ContractStorage(),
                upload_to=apps.shop.models.contract_pdf_path
            ),
        ),
    ]
