# Generated manually

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0008_projectquote'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Lead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('phone', models.CharField(blank=True, max_length=50, null=True)),
                ('project_idea', models.TextField(blank=True, null=True)),
                ('estimated_value', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('status', models.CharField(choices=[('PROSPECT', 'Prospecto'), ('CONTACTED', 'Contactado'), ('PROPOSAL', 'Propuesta Presentada'), ('WON', 'Ganado'), ('LOST', 'Perdido')], default='PROSPECT', max_length=20)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('salesperson', models.ForeignKey(help_text='Vendedor asignado a este prospecto', on_delete=django.db.models.deletion.CASCADE, related_name='leads', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='projectquote',
            name='salesperson',
            field=models.ForeignKey(blank=True, help_text='Vendedor asignado', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_quotes', to=settings.AUTH_USER_MODEL),
        ),
    ]
