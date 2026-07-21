from django.db import migrations, models
import apps.shop.storage


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0009_lead_and_quote_salesperson'),
    ]

    operations = [
        migrations.AlterField(
            model_name='projectquote',
            name='pdf_file',
            field=models.FileField(blank=True, null=True, storage=apps.shop.storage.R2QuoteStorage(), upload_to='project_quotes_pdf/'),
        ),
    ]
