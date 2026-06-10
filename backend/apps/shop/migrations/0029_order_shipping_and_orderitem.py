# Generated manually

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0028_plan_stripe_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='order',
            name='user_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='stripe_session_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='full_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='phone',
            field=models.CharField(blank=True, default='', help_text='Teléfono del cliente', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='street_and_number',
            field=models.TextField(blank=True, default='', help_text='Calle, número exterior e interior', null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='suburb',
            field=models.CharField(blank=True, default='', max_length=255, null=True, verbose_name='Colonia'),
        ),
        migrations.AddField(
            model_name='order',
            name='city',
            field=models.CharField(blank=True, default='', max_length=100, null=True, verbose_name='Ciudad'),
        ),
        migrations.AddField(
            model_name='order',
            name='state',
            field=models.CharField(blank=True, default='', max_length=100, null=True, verbose_name='Estado'),
        ),
        migrations.AddField(
            model_name='order',
            name='postal_code',
            field=models.CharField(blank=True, default='', max_length=10, null=True, verbose_name='Código Postal'),
        ),
        migrations.AddField(
            model_name='order',
            name='country',
            field=models.CharField(blank=True, default='MX', max_length=100, null=True, verbose_name='País'),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_provider',
            field=models.CharField(blank=True, help_text='Ej: FedEx, DHL', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_number',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_label_pdf',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_cost',
            field=models.DecimalField(decimal_places=2, default=0.00, help_text='Costo de envío cobrado al cliente (con margen)', max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_cost_base',
            field=models.DecimalField(decimal_places=2, default=0.00, help_text='Costo base de Skydropx', max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='skydropx_rate_id',
            field=models.CharField(blank=True, help_text='ID de tarifa seleccionado', max_length=255, null=True),
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='shop.order')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shop.product')),
            ],
        ),
    ]
