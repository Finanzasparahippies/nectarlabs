# Generated manually

from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0006_tenant_stamp_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='skydropx_api_key',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_name',
            field=models.CharField(blank=True, default='', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_phone',
            field=models.CharField(blank=True, default='', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_street',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_suburb',
            field=models.CharField(blank=True, default='', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_city',
            field=models.CharField(blank=True, default='', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_state',
            field=models.CharField(blank=True, default='', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_origin_zip_code',
            field=models.CharField(blank=True, default='', max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='shipping_markup_percentage',
            field=models.DecimalField(decimal_places=2, default=15.00, help_text='Porcentaje de ganancia sobre el costo de Skydropx', max_digits=5),
        ),
        migrations.AddField(
            model_name='tenant',
            name='stamps_used_this_month',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='tenant',
            name='stamps_last_reset',
            field=models.DateField(default=django.utils.timezone.now),
        ),
    ]
