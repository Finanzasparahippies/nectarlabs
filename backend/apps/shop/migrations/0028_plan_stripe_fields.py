# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0027_stripeevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='plan',
            name='stripe_product_id',
            field=models.CharField(blank=True, help_text='ID del Producto de Stripe', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='plan',
            name='stripe_price_id',
            field=models.CharField(blank=True, help_text='ID del Precio de Stripe (Base Mensual)', max_length=100, null=True),
        ),
    ]
