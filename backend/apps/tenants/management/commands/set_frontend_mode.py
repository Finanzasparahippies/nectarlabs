"""
Comando Django para alternar el modo de plantilla frontend (NATIVE vs CUSTOM_STANDALONE)
para cualquier tenant (ej: kores-mexico).
"""

from django.core.management.base import BaseCommand, CommandError
from apps.tenants.models import Tenant
from apps.tenants.utils import invalidate_tenant_cache

class Command(BaseCommand):
    help = "Alterna el modo de plantilla frontend (NATIVE vs CUSTOM_STANDALONE) de un Tenant"

    def add_arguments(self, parser):
        parser.add_argument('--slug', type=str, required=True, help="Subdominio o slug del tenant")
        parser.add_argument('--mode', type=str, required=True, choices=['NATIVE', 'CUSTOM_STANDALONE'], help="Modo frontend: NATIVE o CUSTOM_STANDALONE")
        parser.add_argument('--custom-url', type=str, required=False, help="URL personalizada del frontend (ej: https://staging.kores.vip o http://premium_ties_frontend_staging:3000)")

    def handle(self, *args, **options):
        slug = options['slug']
        mode = options['mode']
        custom_url = options.get('custom_url')

        tenant = Tenant.objects.filter(subdomain=slug).first()
        if not tenant:
            raise CommandError(f"Tenant con subdominio '{slug}' no encontrado.")

        tenant.frontend_mode = mode
        if custom_url:
            tenant.custom_frontend_url = custom_url
        elif mode == 'CUSTOM_STANDALONE' and not tenant.custom_frontend_url:
            tenant.custom_frontend_url = 'https://staging.kores.vip'

        tenant.save()
        invalidate_tenant_cache(tenant)

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Tenant '{slug}' actualizado exitosamente. Modo Frontend: {mode} (URL: {tenant.custom_frontend_url})"
            )
        )
