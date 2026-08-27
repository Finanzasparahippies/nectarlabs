import uuid
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0018_alter_tenant_name_alter_tenant_owner_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='TenantPage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200, verbose_name='Título de la Página')),
                ('slug', models.SlugField(max_length=100, verbose_name='Slug / Ruta (ej: inicio, nosotros, ofertas)')),
                ('page_type', models.CharField(choices=[('LANDING', 'Landing Page Estándar Nectar'), ('CUSTOM_HTML', 'HTML Personalizado (Incrustado)'), ('ISOLATED_CODE', 'Código Aislado 100% Standalone (Sin Plantilla)'), ('MARKDOWN', 'Documento Markdown'), ('FORM', 'Formulario / Captura de Clientes'), ('EXTERNAL_LINK', 'Enlace Externo / Máscara')], default='LANDING', max_length=30, verbose_name='Tipo de Página')),
                ('is_homepage', models.BooleanField(default=False, verbose_name='¿Es la página principal del Tenant?')),
                ('is_standalone_isolated', models.BooleanField(default=False, help_text='Si está activo, la página renderizará su código HTML/JS/CSS de forma 100% aislada sin cargar la plantilla ni layout predeterminado de Nectar-Labs.')),
                ('hero_title', models.CharField(blank=True, max_length=255, null=True, verbose_name='Título Principal (Hero)')),
                ('hero_subtitle', models.TextField(blank=True, null=True, verbose_name='Subtítulo Principal')),
                ('hero_image_url', models.URLField(blank=True, max_length=500, null=True, verbose_name='URL de Imagen / Banner Hero')),
                ('cta_text', models.CharField(blank=True, max_length=100, null=True, verbose_name='Texto del Botón Acción (CTA)')),
                ('cta_url', models.CharField(blank=True, max_length=500, null=True, verbose_name='Enlace del Botón Acción')),
                ('content_json', models.JSONField(blank=True, default=dict, verbose_name='Secciones Dinámicas (JSON)')),
                ('custom_html', models.TextField(blank=True, help_text='Código HTML/JS/CSS libre o aislado. Si la página es Aislada Standalone, se mostrará tal cual sin plantillas.', null=True)),
                ('meta_title', models.CharField(blank=True, max_length=200, null=True, verbose_name='Título SEO (Meta Title)')),
                ('meta_description', models.TextField(blank=True, null=True, verbose_name='Descripción SEO (Meta Description)')),
                ('og_image_url', models.URLField(blank=True, max_length=500, null=True, verbose_name='Imagen para redes sociales (OG Image)')),
                ('is_published', models.BooleanField(default=True, verbose_name='¿Publicada?')),
                ('order', models.IntegerField(default=0, verbose_name='Orden de despliegue')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pages', to='tenants.tenant', verbose_name='Inquilino')),
            ],
            options={
                'verbose_name': 'Página de Inquilino',
                'verbose_name_plural': 'Páginas de Inquilinos',
                'ordering': ['order', 'created_at'],
                'unique_together': {('tenant', 'slug')},
            },
        ),
        migrations.CreateModel(
            name='TenantNavItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('label', models.CharField(max_length=100, verbose_name='Etiqueta / Nombre en Menú')),
                ('url', models.CharField(blank=True, help_text='URL destino relativa (ej: /productos) o externa (https://...)', max_length=500, null=True)),
                ('position', models.CharField(choices=[('HEADER', 'Encabezado (Menú Principal)'), ('FOOTER', 'Pie de Página (Footer)')], default='HEADER', max_length=20, verbose_name='Ubicación')),
                ('order', models.IntegerField(default=0, verbose_name='Orden de aparición')),
                ('is_visible', models.BooleanField(default=True, verbose_name='¿Visible?')),
                ('open_in_new_tab', models.BooleanField(default=False, verbose_name='¿Abrir en nueva pestaña?')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('page', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='nav_links', to='tenants.tenantpage', verbose_name='Página Vinculada')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nav_items', to='tenants.tenant', verbose_name='Inquilino')),
            ],
            options={
                'verbose_name': 'Elemento de Navegación',
                'verbose_name_plural': 'Elementos de Navegación',
                'ordering': ['position', 'order', 'created_at'],
            },
        ),
    ]
