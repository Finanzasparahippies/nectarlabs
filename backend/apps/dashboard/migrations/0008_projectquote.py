# Generated manually

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0007_project_designer_project_designer_plan_timelog_user_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectQuote',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('client_name', models.CharField(help_text='Nombre o Razón Social del prospecto/cliente', max_length=200)),
                ('client_email', models.EmailField(help_text='Email de contacto para la cotización', max_length=254)),
                ('project_name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, help_text='Descripción o alcance general', null=True)),
                ('modules', models.JSONField(default=list, help_text="Listado de módulos de funcionalidad cotizados. Formato: [{'name': '...', 'description': '...', 'price': 123.00}]")),
                ('total_price', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('estimated_delivery_weeks', models.PositiveIntegerField(default=4, help_text='Semanas estimadas de desarrollo')),
                ('status', models.CharField(choices=[('DRAFT', 'Borrador'), ('SENT', 'Enviado'), ('APPROVED', 'Aprobado'), ('REJECTED', 'Rechazado')], default='DRAFT', max_length=20)),
                ('pdf_file', models.FileField(blank=True, null=True, upload_to='project_quotes_pdf/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quotes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
