# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0024_alter_paymentinstallment_amount'),
        ('tenants', '0003_tenant_custom_smtp_from_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='products', to='tenants.tenant'),
        ),
        migrations.AddField(
            model_name='order',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='tenants.tenant'),
        ),
    ]
