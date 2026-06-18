# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0010_alter_tenant_invoicing_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='use_custom_domain',
            field=models.BooleanField(default=False, help_text='Whether to use the custom domain instead of the subdomain.'),
        ),
    ]
