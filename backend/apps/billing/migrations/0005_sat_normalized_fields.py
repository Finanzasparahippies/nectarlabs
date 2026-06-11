from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0004_sat_catalog_integration'),
    ]

    operations = [
        migrations.AddField(
            model_name='satproductkey',
            name='normalized_description',
            field=models.TextField(blank=True, db_index=True, null=True, verbose_name='Descripción Normalizada'),
        ),
        migrations.AddField(
            model_name='satunitkey',
            name='normalized_name',
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True, verbose_name='Nombre Normalizado'),
        ),
    ]
