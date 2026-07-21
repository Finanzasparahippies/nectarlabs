# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0022_promocode_contract_promo_code_and_more'),
        ('dashboard', '0008_projectquote'),
    ]

    operations = [
        migrations.AddField(
            model_name='contract',
            name='project_quote',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='contracts', to='dashboard.projectquote'),
        ),
    ]
