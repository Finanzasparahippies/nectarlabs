import logging
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.billing.services import get_pac_service, PACError, FacturapiPACService

logger = logging.getLogger("apps")


class Command(BaseCommand):
    help = "Diagnóstico y pruebas de conectividad de Facturapi (User Key, Test Key y Live Key)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--live',
            action='store_true',
            help="Realiza verificación contra el ambiente Live de Facturapi (sk_live_*)"
        )
        parser.add_argument(
            '--check-all',
            action='store_true',
            help="Verifica secuencialmente User Key, Test Key y Live Key"
        )

    def _mask_key(self, key):
        if not key:
            return "NO CONFIGURADA"
        if len(key) <= 12:
            return f"{key[:4]}...{key[-4:]}"
        return f"{key[:8]}...{key[-6:]}"

    def _test_auth_endpoint(self, label, api_key, url="https://www.facturapi.io/v2/organizations"):
        self.stdout.write(f"\n--- Verificando {label} ---")
        self.stdout.write(f"• Clave: {self._mask_key(api_key)}")
        if not api_key:
            self.stdout.write(self.style.WARNING("  [!] Clave no configurada. Omitiendo prueba."))
            return False

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", []) if isinstance(data, dict) else data
                self.stdout.write(self.style.SUCCESS(
                    f"  [OK] Conexión exitosa ({resp.status_code}). Organizaciones visibles: {len(items)}"
                ))
                return True
            else:
                self.stdout.write(self.style.ERROR(
                    f"  [FALLO] HTTP {resp.status_code}: {resp.text}"
                ))
                return False
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  [ERROR] Excepción de conexión: {e}"))
            return False

    def handle(self, *args, **options):
        is_live = options.get('live', False)
        check_all = options.get('check_all', False)

        user_key = getattr(settings, 'FACTURAPI_USER_KEY', '')
        test_key = getattr(settings, 'PAC_TEST_KEY', '')
        live_key = getattr(settings, 'PAC_LIVE_KEY', '')
        active_key = getattr(settings, 'PAC_API_KEY', '')
        pac_env = getattr(settings, 'PAC_ENVIRONMENT', 'test')

        self.stdout.write(self.style.NOTICE(f"\n{'=' * 65}"))
        self.stdout.write(self.style.NOTICE(f" DIAGNÓSTICO DE INTEGRACIÓN FACTURAPI v2 — NÉCTAR LABS"))
        self.stdout.write(self.style.NOTICE(f"{'=' * 65}"))
        self.stdout.write(f"• PAC_ENVIRONMENT:    {pac_env}")
        self.stdout.write(f"• PAC_API_KEY Activa: {self._mask_key(active_key)}")

        if check_all:
            self._test_auth_endpoint("User Key (sk_user_*) - Creación de Organizaciones", user_key)
            self._test_auth_endpoint("Test Key (sk_test_*) - Staging / Local", test_key)
            self._test_auth_endpoint("Live Key (sk_live_*) - Producción SAT", live_key)
        elif is_live:
            self._test_auth_endpoint("Live Key (sk_live_*) - Producción SAT", live_key)
        else:
            self._test_auth_endpoint("User Key (sk_user_*) - Matriz", user_key)
            self._test_auth_endpoint(f"PAC Key Activa ({pac_env})", active_key)

        # Probar instanciación de servicio base
        self.stdout.write("\n--- Verificación del Servicio FacturapiPACService ---")
        try:
            pac = get_pac_service()
            self.stdout.write(self.style.SUCCESS(f"  [OK] PAC Service activo: {pac.__class__.__name__}"))
            if isinstance(pac, FacturapiPACService):
                self.stdout.write(f"  • Base URL: {pac.base_url}")
                self.stdout.write(f"  • User Key configurada en headers: {'SÍ' if 'Authorization' in pac.user_headers else 'NO'}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  [ERROR] Fallo al inicializar PAC Service: {e}"))

        self.stdout.write(self.style.NOTICE(f"\n{'=' * 65}\n"))
