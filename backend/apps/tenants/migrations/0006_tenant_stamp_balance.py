# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0005_tenant_accent_color_light_tenant_bg_color_light_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='stamp_balance',
            field=models.PositiveIntegerField(
                default=0,
                help_text="Balance actual de timbres fiscales (comprados o incluidos en la suscripción)."
            ),
        ),
    ]
