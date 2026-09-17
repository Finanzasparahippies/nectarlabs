from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0038_order_shipping_error_alter_order_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enviawebhookeventlog',
            name='status',
            field=models.CharField(
                choices=[
                    ('RECEIVED', 'Recibido'),
                    ('PROCESSED', 'Procesado'),
                    ('IGNORED', 'Ignorado'),
                    ('ERROR', 'Error'),
                ],
                default='RECEIVED',
                max_length=20
            ),
        ),
    ]
