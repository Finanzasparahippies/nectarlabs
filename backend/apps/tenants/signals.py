"""
Señales de Django para la aplicación de Tenants en Nectar-Labs.
Maneja la invalidación automática de caché Redis y la creación idempotente de páginas iniciales por defecto.
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Tenant, TenantPage, TenantNavItem
from .utils import invalidate_tenant_cache

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Tenant)
def handle_tenant_post_save(sender, instance, created, **kwargs):
    """
    Se ejecuta al crear o actualizar un Tenant.
    1. Si es recién creado, autogenera las páginas iniciales por defecto (Home y Contacto).
    2. Invalida la caché Redis del Tenant.
    """
    if created:
        try:
            # Crear Página Principal por defecto
            TenantPage.objects.get_or_create(
                tenant=instance,
                slug='home',
                defaults={
                    'title': f'Inicio - {instance.name}',
                    'page_type': TenantPage.PageType.LANDING,
                    'is_homepage': True,
                    'hero_title': f'Bienvenido a {instance.name}',
                    'hero_subtitle': instance.welcome_message or 'Descubre nuestros productos y servicios de alta calidad.',
                    'cta_text': 'Ver Catálogo',
                    'cta_url': '#productos',
                    'is_published': True,
                    'order': 0,
                }
            )
            # Crear Página de Contacto por defecto
            contacto_page, _ = TenantPage.objects.get_or_create(
                tenant=instance,
                slug='contacto',
                defaults={
                    'title': 'Contacto',
                    'page_type': TenantPage.PageType.CUSTOM_HTML,
                    'is_homepage': False,
                    'hero_title': 'Ponte en contacto con nosotros',
                    'hero_subtitle': 'Estamos aquí para ayudarte. Envíanos un mensaje o contáctanos directamente.',
                    'custom_html': '<div class="p-6 text-center"><h2 class="text-2xl font-bold mb-4">Contáctanos</h2><p>Correo: soporte@nectarlabs.dev</p></div>',
                    'is_published': True,
                    'order': 1,
                }
            )
            # Elementos de menú iniciales
            TenantNavItem.objects.get_or_create(
                tenant=instance,
                label='Inicio',
                defaults={'url': '/', 'position': TenantNavItem.Position.HEADER, 'order': 0}
            )
            TenantNavItem.objects.get_or_create(
                tenant=instance,
                label='Contacto',
                defaults={'page': contacto_page, 'position': TenantNavItem.Position.HEADER, 'order': 1}
            )
            logger.info(f"Páginas y menús iniciales creados para el tenant '{instance.subdomain}'")
        except Exception as e:
            logger.error(f"Error al inicializar páginas por defecto para {instance.subdomain}: {e}")

    invalidate_tenant_cache(instance)


@receiver([post_save, post_delete], sender=TenantPage)
def handle_tenant_page_change(sender, instance, **kwargs):
    """
    Invalida la caché de Redis cuando se crea, modifica o elimina una página del Tenant.
    """
    if instance.tenant:
        invalidate_tenant_cache(instance.tenant)


@receiver([post_save, post_delete], sender=TenantNavItem)
def handle_tenant_nav_item_change(sender, instance, **kwargs):
    """
    Invalida la caché de Redis cuando se crea, modifica o elimina un elemento del menú de navegación.
    """
    if instance.tenant:
        invalidate_tenant_cache(instance.tenant)
