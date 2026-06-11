from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tenants', '0009_alter_tenant_newsletter_last_reset_alter_tenant_stamps_last_reset'),
        ('shop', '0030_alter_paymentinstallment_receipt_file'),
    ]

    operations = [
        migrations.CreateModel(
            name='AddOnSubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_subscription_id', models.CharField(blank=True, db_index=True, max_length=255, null=True, unique=True)),
                ('status', models.CharField(choices=[('active', 'Activo'), ('trialing', 'Periodo de Prueba'), ('past_due', 'Pago Atrasado'), ('canceled', 'Cancelado'), ('incomplete', 'Incompleto')], default='active', max_length=50)),
                ('billing_cycle', models.CharField(choices=[('monthly', 'Mensual'), ('yearly', 'Anual')], default='monthly', max_length=20)),
                ('price_paid', models.DecimalField(decimal_places=2, default=0.0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('addon', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='shop.addon')),
                ('tenant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='addon_subscriptions', to='tenants.tenant')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='addon_subscriptions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
