from django.core.management.base import BaseCommand, CommandError
from apps.tenants.provisioner import provision_tenant_containers, request_ssl_certificate
from apps.tenants.models import Tenant

class Command(BaseCommand):
    help = 'Aprovisiona, reconstruye, detiene o remueve contenedores dinámicos dedicados por Tenant (SaaS Factory PaaS).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--slug',
            type=str,
            required=True,
            help='Subdominio / Slug identificador del Tenant (ej: kores-mexico, demo-byo)'
        )
        parser.add_argument(
            '--action',
            type=str,
            default='build',
            choices=['build', 'start', 'stop', 'remove', 'ssl'],
            help='Acción de aprovisionamiento a ejecutar'
        )
        parser.add_argument(
            '--ssl-domain',
            type=str,
            required=False,
            help='Dominio personalizado para emitir certificado SSL (vía Certbot)'
        )

    def handle(self, *args, **options):
        slug = options['slug']
        action = options['action']
        ssl_domain = options.get('ssl_domain')

        self.stdout.write(self.style.NOTICE(f"=== SaaS Factory PaaS: Procesando Tenant '{slug}' (Acción: {action}) ==="))

        if action == 'ssl':
            if not ssl_domain:
                tenant = Tenant.objects.filter(subdomain=slug).first()
                ssl_domain = tenant.custom_domain if tenant else None

            if not ssl_domain:
                raise CommandError("Se requiere especificar un dominio personalizado con --ssl-domain")

            success, msg = request_ssl_certificate(ssl_domain)
            if success:
                self.stdout.write(self.style.SUCCESS(f"✓ Certificado SSL emitido para {ssl_domain}: {msg}"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ Falla en emisión SSL: {msg}"))
            return

        success, msg = provision_tenant_containers(slug, action=action)
        if success:
            self.stdout.write(self.style.SUCCESS(f"✓ Operación '{action}' completada exitosamente para tenant '{slug}': {msg}"))
        else:
            self.stdout.write(self.style.ERROR(f"✗ Error en operación '{action}' para tenant '{slug}': {msg}"))
            raise CommandError(msg)
