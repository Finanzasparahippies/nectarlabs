"""
Nectar Labs — Diagnóstico y Pruebas Operativas de Logística Multi-Proveedor
Permite probar cotizaciones y emisiones en Sandbox y Producción para Envia.com y Skydropx Pro.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.shop.logistics import (
    EnviaProvider,
    SkydropxProvider,
    get_shipping_rates,
)
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Diagnóstico integral del motor de envíos multi-proveedor (Envia.com & Skydropx Pro)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--provider',
            choices=['all', 'envia', 'skydropx'],
            default='all',
            help="Proveedor a evaluar ('all', 'envia' o 'skydropx')"
        )
        parser.add_argument(
            '--env',
            choices=['sandbox', 'staging', 'production', 'prod'],
            default=None,
            help="Ambiente de prueba ('sandbox' o 'production')"
        )
        parser.add_argument(
            '--dest-cp',
            type=str,
            default='83100',
            help="Código postal de destino para la cotización de prueba (por defecto: 83100)"
        )
        parser.add_argument(
            '--tenant',
            type=str,
            default=None,
            help="Subdominio del inquilino a evaluar (opcional)"
        )

    def handle(self, *args, **options):
        provider_choice = options.get('provider')
        dest_cp = options.get('dest_cp')
        tenant_subdomain = options.get('tenant')

        tenant = None
        if tenant_subdomain:
            tenant = Tenant.objects.filter(subdomain=tenant_subdomain).first()
            if not tenant:
                self.stderr.write(self.style.ERROR(f"Inquilino con subdominio '{tenant_subdomain}' no encontrado."))
                return

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 70))
        self.stdout.write(self.style.MIGRATE_HEADING("📦 DIAGNÓSTICO DE LOGÍSTICA MULTI-PROVEEDOR NECTAR LABS"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 70))
        self.stdout.write(f"• Proveedor:          {provider_choice.upper()}")
        self.stdout.write(f"• C.P. Destino:       {dest_cp}")
        self.stdout.write(f"• Inquilino:          {tenant.name if tenant else 'Néctar Labs Hub (Global)'}")

        dest_data = {
            "name": "Comprador de Prueba",
            "postal_code": dest_cp,
            "city": "Hermosillo",
            "state": "SO",
            "country": "MX"
        }
        parcel_data = {
            "content": "Muestra de prueba",
            "amount": 1,
            "weight": 1.0,
            "length": 20.0,
            "width": 15.0,
            "height": 10.0
        }

        # 1. Prueba Envia.com
        if provider_choice in ['all', 'envia']:
            self.stdout.write(self.style.HTTP_INFO("\n--- 🌐 [1/2] EVALUANDO ENVIA.COM ---"))
            envia_prov = EnviaProvider(tenant=tenant)
            self.stdout.write(f"• Modo Simulado (Mock): {'Sí' if envia_prov.is_mock else 'No (API Real)'}")
            self.stdout.write(f"• Ambiente Producción:   {'Sí' if envia_prov.is_production else 'No (Sandbox)'}")
            try:
                rates = envia_prov.quote_rates(
                    origin={"postalCode": "83000", "country": "MX"},
                    destination={"postalCode": dest_cp, "country": "MX"},
                    packages=[parcel_data]
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Envia.com: {len(rates)} tarifas cotizadas:"))
                for r in rates[:5]:
                    self.stdout.write(
                        f"   [{r.provider_type}] {r.provider:14} ({r.service_level_name:25}) "
                        f"Base: ${r.amount:6.2f} | Total Comprador: ${r.total_amount:6.2f} MXN ({r.days} días)"
                    )
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error cotizando Envia.com: {e}"))

        # 2. Prueba Skydropx Pro
        if provider_choice in ['all', 'skydropx']:
            self.stdout.write(self.style.HTTP_INFO("\n--- 🚀 [2/2] EVALUANDO SKYDROPX PRO ---"))
            skx_prov = SkydropxProvider(tenant=tenant)
            self.stdout.write(f"• Modo Simulado (Mock): {'Sí' if skx_prov.is_mock else 'No (API Real)'}")
            self.stdout.write(f"• Endpoint Activo:      {skx_prov.base_url}")
            try:
                rates = skx_prov.quote_rates(
                    origin={"postalCode": "83000", "country": "MX"},
                    destination={"postalCode": dest_cp, "country": "MX"},
                    packages=[parcel_data]
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Skydropx Pro: {len(rates)} tarifas cotizadas:"))
                for r in rates[:5]:
                    self.stdout.write(
                        f"   [{r.provider_type}] {r.provider:14} ({r.service_level_name:25}) "
                        f"Base: ${r.amount:6.2f} | Total Comprador: ${r.total_amount:6.2f} MXN ({r.days} días)"
                    )
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error cotizando Skydropx Pro: {e}"))

        # 3. Multicotizador Unificado Dinámico
        if provider_choice == 'all':
            self.stdout.write(self.style.HTTP_INFO("\n--- ⚡ MULTICOTIZADOR SIMULTÁNEO (DYNAMIC_BEST) ---"))
            try:
                unified = get_shipping_rates(destination=dest_data, parcel=parcel_data, tenant=tenant)
                self.stdout.write(self.style.SUCCESS(f"✅ Multicotizador consolidó {len(unified)} tarifas ordenadas:"))
                for idx, r in enumerate(unified[:8], start=1):
                    self.stdout.write(
                        f"   [{idx}] [{r['provider_type']:8}] {r['provider']:14} ({r['service_level_name']:25}) "
                        f"-> ${r['total_amount']:6.2f} MXN (Entrega: {r['days']} días)"
                    )
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error en multicotizador: {e}"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Diagnóstico de logística completado.\n"))
