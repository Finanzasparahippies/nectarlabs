# Generated manually on 2026-05-22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='logo',
            field=models.ImageField(blank=True, null=True, upload_to='tenant_logos/'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='portal_title',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='footer_text',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tenant',
            name='accent_color',
            field=models.CharField(default='#10B981', max_length=7),
        ),
        migrations.AddField(
            model_name='tenant',
            name='bg_color',
            field=models.CharField(default='#020403', max_length=7),
        ),
        migrations.AddField(
            model_name='tenant',
            name='card_bg_color',
            field=models.CharField(default='#050a06', max_length=7),
        ),
        migrations.AddField(
            model_name='tenant',
            name='text_color',
            field=models.CharField(default='#FFFFFF', max_length=7),
        ),
        migrations.AddField(
            model_name='tenant',
            name='border_color',
            field=models.CharField(default='#151F18', max_length=7),
        ),
    ]
