# Generated manually for custom CSS and JS injection capability

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0015_tenant_stripe_publishable_key_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='custom_css',
            field=models.TextField(blank=True, help_text='Código CSS personalizado para el portal público del Tenant', null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='custom_js',
            field=models.TextField(blank=True, help_text='Código JS personalizado para el portal público del Tenant', null=True),
        ),
    ]
