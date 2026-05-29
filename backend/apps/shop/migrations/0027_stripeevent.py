# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0026_alter_contract_pdf_file'),
    ]

    operations = [
        migrations.CreateModel(
            name='StripeEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
