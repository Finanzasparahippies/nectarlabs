from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0008_tenant_invoicing_mode'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tenant',
            name='newsletter_last_reset',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
        migrations.AlterField(
            model_name='tenant',
            name='stamps_last_reset',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
