# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_alter_user_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Administrator'),
                    ('BUSINESS', 'Business Owner'),
                    ('ANALYST', 'Data Analyst'),
                    ('CUSTOMER', 'Customer'),
                    ('DESIGNER', 'Designer'),
                    ('DEVELOPER', 'Developer'),
                    ('SALES', 'Salesperson')
                ],
                default='CUSTOMER',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='is_approved_seller',
            field=models.BooleanField(
                default=False,
                help_text="Indica si el vendedor está aprobado para generar comisiones."
            ),
        ),
    ]
