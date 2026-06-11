from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0003_alter_invoice_pdf_file_alter_invoice_xml_file'),
    ]

    operations = [
        migrations.CreateModel(
            name='SATProductKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=20, unique=True, verbose_name='Clave SAT')),
                ('description', models.TextField(db_index=True, verbose_name='Descripción')),
                ('is_active', models.BooleanField(default=True, verbose_name='Vigente')),
            ],
        ),
        migrations.CreateModel(
            name='SATUnitKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=20, unique=True, verbose_name='Clave SAT')),
                ('name', models.CharField(max_length=255, verbose_name='Nombre')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Descripción')),
                ('is_active', models.BooleanField(default=True, verbose_name='Vigente')),
            ],
        ),
        migrations.AddField(
            model_name='taxprofile',
            name='default_product_key',
            field=models.CharField(default='43231500', help_text='Clave de producto o servicio por defecto para facturación manual (ej. 43231500 para Software)', max_length=20, verbose_name='Clave SAT de Producto por Defecto'),
        ),
        migrations.AddField(
            model_name='taxprofile',
            name='default_unit_key',
            field=models.CharField(default='E48', help_text='Clave de unidad por defecto para facturación manual (ej. E48 para Unidad de servicio)', max_length=20, verbose_name='Clave SAT de Unidad por Defecto'),
        ),
        migrations.AddField(
            model_name='taxprofile',
            name='default_unit_name',
            field=models.CharField(default='Unidad de servicio', help_text='Nombre de unidad por defecto (ej. Unidad de servicio o Pieza)', max_length=100, verbose_name='Nombre de Unidad por Defecto'),
        ),
    ]
