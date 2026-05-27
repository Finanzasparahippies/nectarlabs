from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0018_contract_payment_day'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contract',
            name='pdf_file',
            field=models.FileField(blank=True, null=True, upload_to='contracts/'),
        ),
    ]
