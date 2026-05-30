# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_is_approved_seller'),
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
                    ('SALES', 'Salesperson'),
                    ('STAFF', 'Staff')
                ],
                default='CUSTOMER',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='is_email_verified',
            field=models.BooleanField(
                default=False,
                help_text="Indica si el correo electrónico ha sido verificado."
            ),
        ),
    ]
