import json
from django.core.management.base import BaseCommand, CommandError
from apps.tenants.models import Tenant
from apps.tenants.provisioner import deploy_tenant_containers, execute_container_action, get_tenant_containers_status

class Command(BaseCommand):
    help = "Orquesta y despliega contenedores Docker autónomos para un inquilino de forma remota (Zero-SSH)."

    def add_arguments(self, parser):
        parser.add_argument("subdomain", type=str, help="Subdominio del inquilino (ej: kores)")
        parser.add_argument(
            "--action", 
            type=str, 
            default="status", 
            choices=["deploy", "start", "stop", "restart", "status"],
            help="Acción de orquestación a ejecutar sobre los contenedores"
        )
        parser.add_argument(
            "--env", 
            type=str, 
            default="staging", 
            choices=["staging", "production"],
            help="Ambiente de destino (staging o production)"
        )
        parser.add_argument("--json", action="store_true", help="Formatear salida en JSON")

    def handle(self, *args, **options):
        subdomain = options["subdomain"].strip().lower()
        action = options["action"].lower()
        environment = options["env"].lower()

        tenant = Tenant.objects.filter(subdomain=subdomain).first()
        if not tenant:
            raise CommandError(f"Inquilino con subdominio '{subdomain}' no encontrado.")

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n🚀 Orquestador de Despliegues Zero-SSH — {tenant.name}"))
        self.stdout.write(f"Inquilino: {tenant.subdomain} | Acción: {action.upper()} | Ambiente: {environment.upper()}")

        if action == "status":
            status_data = get_tenant_containers_status(tenant, environment=environment)
            if options.get("json"):
                self.stdout.write(json.dumps(status_data, indent=2))
            else:
                self.stdout.write("\n📊 Estado de Contenedores:")
                fe_running = "RUNNING" if status_data['frontend'].get('running') else "STOPPED"
                be_running = "RUNNING" if status_data['backend'].get('running') else "STOPPED"
                self.stdout.write(f"   - Frontend ({status_data['frontend']['name']}): {status_data['frontend'].get('status', 'unknown')} ({fe_running})")
                self.stdout.write(f"   - Backend  ({status_data['backend']['name']}): {status_data['backend'].get('status', 'unknown')} ({be_running})")
                self.stdout.write(f"   - Salud Global: {'✅ ONLINE' if status_data['is_online'] else '⚠️ OFFLINE (Fallback Activo)'}\n")

        elif action == "deploy":
            self.stdout.write("⚙️ Ejecutando despliegue y build completo...")
            res = deploy_tenant_containers(tenant, environment=environment)
            if res.get("success"):
                self.stdout.write(self.style.SUCCESS(f"✅ Despliegue completado con éxito."))
                if res.get("logs"):
                    self.stdout.write(f"\nLogs:\n{res['logs']}")
            else:
                self.stdout.write(self.style.ERROR(f"❌ Fallo en el despliegue: {res.get('error')}"))
                if res.get("logs"):
                    self.stdout.write(f"\nLogs:\n{res['logs']}")

        elif action in ["start", "stop", "restart"]:
            self.stdout.write(f"⚙️ Ejecutando acción '{action}' sobre frontend y backend...")
            res_fe = execute_container_action(tenant, "frontend", action, environment=environment)
            res_be = execute_container_action(tenant, "backend", action, environment=environment)
            
            fe_status = "✅ OK" if res_fe.get("success") else f"❌ Error: {res_fe.get('error')}"
            be_status = "✅ OK" if res_be.get("success") else f"❌ Error: {res_be.get('error')}"
            
            self.stdout.write(f"   - Frontend: {fe_status}")
            self.stdout.write(f"   - Backend:  {be_status}")
