"""
Nectar Labs — Diagnóstico y Pruebas Operativas de Logística Multi-Proveedor
Permite evaluar multicotización dinámica (DYNAMIC_BEST), Envia.com y Skydropx Pro
tanto en Sandbox como en Producción, con soporte para inquilinos y cuenta maestra global.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
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
            type=str,
            default='DYNAMIC_BEST',
            help="Proveedor a evaluar: 'DYNAMIC_BEST', 'ALL', 'ENVIA' o 'SKYDROPX' (no sensible a mayúsculas)"
        )
        parser.add_argument(
            '--origin',
            type=str,
            default='83000',
            help="Código postal de origen (por defecto: 83000 - Hermosillo, Sonora)"
        )
        parser.add_argument(
            '--dest',
            type=str,
            default=None,
            help="Código postal de destino (por defecto: 06600 - CDMX)"
        )
        parser.add_argument(
            '--dest-cp',
            type=str,
            default=None,
            help="Alias para --dest (Código postal de destino)"
        )
        parser.add_argument(
            '--carrier',
            type=str,
            default=None,
            help="Courier específico a filtrar o cotizar (ej. paquetexpress, fedex, dhl, estafeta)"
        )
        parser.add_argument(
            '--env',
            choices=['sandbox', 'staging', 'production', 'prod'],
            default=None,
            help="Ambiente forzado de prueba ('sandbox' o 'production')"
        )
        parser.add_argument(
            '--tenant',
            type=str,
            default=None,
            help="Subdominio o ID del inquilino a evaluar (opcional; si se omite usa Master Hub de Nectar Labs)"
        )
        parser.add_argument(
            '--generate-label',
            action='store_true',
            help="Genera una guía de prueba en Sandbox para el proveedor evaluado"
        )
        parser.add_argument(
            '--confirm-prod',
            action='store_true',
            help="Confirmación obligatoria para permitir generación de guía real en Producción"
        )

    def handle(self, *args, **options):
        raw_provider = (options.get('provider') or 'DYNAMIC_BEST').strip().upper()
        # Normalizar alias
        if raw_provider in ['ALL', 'DYNAMIC', 'DYNAMIC_BEST']:
            provider_choice = 'DYNAMIC_BEST'
        elif raw_provider in ['ENVIA', 'ENVIA.COM']:
            provider_choice = 'ENVIA'
        elif raw_provider in ['SKYDROPX', 'SKYDROP', 'SKYDROPX_PRO']:
            provider_choice = 'SKYDROPX'
        else:
            provider_choice = raw_provider

        origin_cp = str(options.get('origin') or '83000').strip()
        dest_cp = str(options.get('dest') or options.get('dest_cp') or '06600').strip()
        target_carrier = options.get('carrier')
        forced_env = options.get('env')
        tenant_identifier = options.get('tenant')
        should_generate_label = options.get('generate_label', False)
        confirm_prod = options.get('confirm_prod', False)

        # Configurar ambiente forzado si se especificó
        if forced_env:
            norm_env = 'production' if forced_env in ['production', 'prod'] else 'sandbox'
            settings.ENVIA_ENVIRONMENT = norm_env
            settings.SKYDROPX_ENVIRONMENT = norm_env if norm_env == 'production' else 'staging'

        # Resolver tenant si se especificó
        tenant = None
        if tenant_identifier:
            if str(tenant_identifier).isdigit():
                tenant = Tenant.objects.filter(id=int(tenant_identifier)).first()
            else:
                tenant = Tenant.objects.filter(subdomain=tenant_identifier).first()
            if not tenant:
                self.stderr.write(self.style.ERROR(f"❌ Inquilino '{tenant_identifier}' no encontrado en base de datos."))
                return

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "=" * 70))
        self.stdout.write(self.style.MIGRATE_HEADING("📦 DIAGNÓSTICO DE LOGÍSTICA MULTI-PROVEEDOR NECTAR LABS"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 70))
        self.stdout.write(f"• Modalidad / Proveedor: {provider_choice}")
        self.stdout.write(f"• Origen (C.P.):         {origin_cp} (Hermosillo, Sonora)")
        self.stdout.write(f"• Destino (C.P.):        {dest_cp}")
        self.stdout.write(f"• Inquilino:             {tenant.name if tenant else 'Néctar Labs Master Platform (PaaS Hub)'}")
        if target_carrier:
            self.stdout.write(f"• Courier Objetivo:      {target_carrier.upper()}")

        origin_data = {
            "name": (tenant.shipping_origin_name if tenant else None) or "Néctar Labs Bodega Central",
            "company": (tenant.name if tenant else None) or "Nectar Labs",
            "phone": "6621000000",
            "street": "Av. Central 100",
            "district": "Centro",
            "city": "Hermosillo",
            "state": "SO",
            "postalCode": origin_cp,
            "country": "MX"
        }
        dest_data = {
            "name": "Comprador de Prueba",
            "phone": "5511111111",
            "street": "Insurgentes Sur 1600",
            "district": "Del Valle",
            "city": "Ciudad de México",
            "state": "CX",
            "postalCode": dest_cp,
            "postal_code": dest_cp,
            "zip_code": dest_cp,
            "country": "MX"
        }
        parcel_data = {
            "content": "Muestra Operativa Nectar Labs",
            "amount": 1,
            "weight": 1.0,
            "length": 20.0,
            "width": 15.0,
            "height": 10.0
        }

        # ── 1. EVALUACIÓN ENVIA.COM ──
        if provider_choice in ['DYNAMIC_BEST', 'ENVIA']:
            self.stdout.write(self.style.HTTP_INFO("\n--- 🌐 [1] EVALUANDO ENVIA.COM ---"))
            envia_prov = EnviaProvider(tenant=tenant)
            self.stdout.write(f"• Modo Simulado (Mock):  {'Sí' if envia_prov.is_mock else 'No (API Real Envia.com)'}")
            self.stdout.write(f"• Ambiente Activo:        {'Producción' if envia_prov.is_production else 'Sandbox'}")
            try:
                rates = envia_prov.quote_rates(
                    origin=origin_data,
                    destination=dest_data,
                    packages=[parcel_data]
                )
                if target_carrier:
                    rates = [r for r in rates if target_carrier.lower() in r.carrier.lower()]

                if rates:
                    self.stdout.write(self.style.SUCCESS(f"✅ Envia.com: {len(rates)} tarifas cotizadas:"))
                    for idx, r in enumerate(rates[:6], start=1):
                        self.stdout.write(
                            f"   [{idx}] [{r.provider_type}] {r.provider:14} ({r.service_level_name:22}) "
                            f"Base: ${r.amount:6.2f} | Total Comprador: ${r.total_amount:6.2f} MXN ({r.days} días)"
                        )
                else:
                    self.stdout.write(self.style.WARNING("⚠ No se obtuvieron tarifas para Envia.com."))

                if should_generate_label and provider_choice == 'ENVIA':
                    if envia_prov.is_production and not confirm_prod:
                        self.stdout.write(self.style.ERROR("❌ Emisión cancelada: En Producción se requiere --confirm-prod."))
                    else:
                        carrier_to_use = target_carrier or (rates[0].carrier if rates else "paquetexpress")
                        service_to_use = rates[0].service_level_name if rates else "ground"
                        self.stdout.write(self.style.MIGRATE_HEADING(f"\nGenerando guía de prueba en Envia ({carrier_to_use})..."))
                        res = envia_prov.client.generate_label(
                            origin=origin_data,
                            destination=dest_data,
                            packages=[parcel_data],
                            carrier=carrier_to_use,
                            service=service_to_use
                        )
                        data_list = res.get("data", [])
                        if data_list and isinstance(data_list, list):
                            lbl = data_list[0]
                            self.stdout.write(self.style.SUCCESS(f"✓ Guía emitida exitosamente: {lbl.get('trackingNumber')}"))
                            self.stdout.write(f"   • PDF: {lbl.get('label')}")
                        else:
                            self.stdout.write(self.style.ERROR(f"✗ Error al emitir guía Envia: {res}"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error evaluando Envia.com: {e}"))

        # ── 2. EVALUACIÓN SKYDROPX PRO ──
        if provider_choice in ['DYNAMIC_BEST', 'SKYDROPX']:
            self.stdout.write(self.style.HTTP_INFO("\n--- 🚀 [2] EVALUANDO SKYDROPX PRO ---"))
            skx_prov = SkydropxProvider(tenant=tenant)
            self.stdout.write(f"• Modo Simulado (Mock):  {'Sí' if skx_prov.is_mock else 'No (API Real Skydropx Pro)'}")
            self.stdout.write(f"• Endpoint Activo:       {skx_prov.base_url}")
            try:
                rates = skx_prov.quote_rates(
                    origin=origin_data,
                    destination=dest_data,
                    packages=[parcel_data]
                )
                if target_carrier:
                    rates = [r for r in rates if target_carrier.lower() in r.carrier.lower()]

                if rates:
                    self.stdout.write(self.style.SUCCESS(f"✅ Skydropx Pro: {len(rates)} tarifas cotizadas:"))
                    for idx, r in enumerate(rates[:6], start=1):
                        self.stdout.write(
                            f"   [{idx}] [{r.provider_type}] {r.provider:14} ({r.service_level_name:22}) "
                            f"Base: ${r.amount:6.2f} | Total Comprador: ${r.total_amount:6.2f} MXN ({r.days} días)"
                        )
                else:
                    self.stdout.write(self.style.WARNING("⚠ No se obtuvieron tarifas para Skydropx Pro."))
                    if getattr(skx_prov, "last_error", None):
                        self.stdout.write(self.style.NOTICE(f"   • Diagnóstico API:  {skx_prov.last_error}"))
                    client_id_masked = f"{skx_prov.client_id[:6]}...{skx_prov.client_id[-4:]}" if len(skx_prov.client_id) > 10 else (skx_prov.client_id or "NO CONFIGURADO")
                    has_secret = "Sí (Configurado)" if skx_prov.client_secret else "No (Vacío - Modo API Key directo)"
                    self.stdout.write(f"   • Client ID:        {client_id_masked}")
                    self.stdout.write(f"   • Client Secret:    {has_secret}")
                    self.stdout.write(f"   • Ambiente activo:  {skx_prov.environment}")
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error evaluando Skydropx Pro: {e}"))

        # ── 3. MULTICOTIZADOR SIMULTÁNEO DINÁMICO (DYNAMIC_BEST) ──
        if provider_choice == 'DYNAMIC_BEST':
            self.stdout.write(self.style.HTTP_INFO("\n--- ⚡ [3] MULTICOTIZADOR SIMULTÁNEO (DYNAMIC_BEST) ---"))
            try:
                unified = get_shipping_rates(destination=dest_data, parcel=parcel_data, tenant=tenant)
                if unified:
                    self.stdout.write(self.style.SUCCESS(f"✅ Multicotizador consolidó y ordenó {len(unified)} tarifas:"))
                    for idx, r in enumerate(unified[:10], start=1):
                        prov_type = r.get('provider_type', 'GLOBAL')
                        carrier = r.get('provider') or r.get('carrier') or 'Courier'
                        srv = r.get('service_level_name', 'Standard')
                        price = r.get('total_amount', 0.0)
                        days = r.get('days', 3)
                        self.stdout.write(
                            f"   [{idx:02d}] [{prov_type:8}] {carrier:15} ({srv:25}) "
                            f"-> ${price:6.2f} MXN ({days} días de entrega)"
                        )
                else:
                    self.stdout.write(self.style.WARNING("⚠ No se pudieron generar tarifas consolidadas."))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Error en multicotizador dinámico: {e}"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Diagnóstico de logística completado con éxito.\n"))
