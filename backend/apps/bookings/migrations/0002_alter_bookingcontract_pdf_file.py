from django.db import migrations, models
import apps.bookings.models

class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='bookingcontract',
            name='pdf_file',
            field=models.FileField(blank=True, null=True, storage=apps.bookings.models.raw_storage, upload_to='contracts/'),
        ),
    ]
