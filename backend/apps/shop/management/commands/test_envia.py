import json
import logging
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.shop.shipping import (
    EnviaClient,
    is_envia_production,
    get_envia_master_token,
    get_envia_shipping_base_url,
    get_envia_queries_base_url,
    get_envia_geocodes_base_url
)

logger = logging.getLogger("apps")


class Command(BaseCommand):
    help = "Diagnóstico y pruebas operativas de Envia.com (Sandbox y Producción)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--env',
            choices=['sandbox', 'production'],
            default=None,
            help="Forzar ambiente específico para la prueba (sandbox o production)"
        )
        parser.add_argument(
            '--carrier',
            type=str,
            default=None,
            help="Courier específico a cotizar (ej. paquetexpress, fedex, dhl)"
        )
        parser.add_argument(
            '--generate-label',
            action='store_true',
            help="Genera una guía de prueba en Sandbox (no ejecutable en Producción sin confirmación)"
        )

    def handle(self, *args, **options):
        forced_env = options.get('env')
        target_carrier = options.get('carrier')
        should_generate = options.get('generate_label')

        if forced_env:
            settings.ENVIA_ENVIRONMENT = forced_env

        env_is_prod = is_envia_production()
        env_label = "PRODUCCIÓN" if env_is_prod else "SANDBOX"
        token = get_envia_master_token()

        self.stdout.write(self.style.NOTICE(f"\n{'=' * 60}"))
        self.stdout.write(self.style.NOTICE(f" DIAGNÓSTICO ENVIA.COM — AMBIENTE: {env_label}"))
        self.stdout.write(self.style.NOTICE(f"{'=' * 60}\n"))

        self.stdout.write(f"• Shipping Base URL: {get_envia_shipping_base_url()}")
        self.stdout.write(f"• Queries Base URL:  {get_envia_queries_base_url()}")
        self.stdout.write(f"• Geocodes Base URL: {get_envia_geocodes_base_url()}")
        masked_token = f"{token[:8]}...{token[-6:]}" if len(token) > 14 else "NO CONFIGURADO"
        self.stdout.write(f"• Token Activo:      {masked_token}")

        client = EnviaClient(api_key=token)

        # 1. Validación de Geocodes
        self.stdout.write(self.style.MIGRATE_HEADING("\n[1/3] Validando Servicio de Geocodes (C.P. 83000)..."))
        geo_res = client.validate_zipcode("MX", "83000")
        if (isinstance(geo_res, dict) and (geo_res.get("data") or geo_res.get("state"))) or (isinstance(geo_res, list) and len(geo_res) > 0):
            self.stdout.write(self.style.SUCCESS("✓ Geocodes API operativo."))
        else:
            self.stdout.write(self.style.WARNING(f"⚠ Respuesta Geocodes: {geo_res}"))

        # 2. Cotización en Vivo
        origin = {
            "name": "Néctar Labs Bodega",
            "company": "Nectar Labs",
            "phone": "6621000000",
            "street": "Av. Central 100",
            "district": "Centro",
            "city": "Hermosillo",
            "state": "SO",
            "postalCode": "83000",
            "country": "MX"
        }
        destination = {
            "name": "Cliente Prueba",
            "phone": "5511111111",
            "street": "Insurgentes Sur 1600",
            "district": "Del Valle",
            "city": "Ciudad de Mexico",
            "state": "CX",
            "postalCode": "03100",
            "country": "MX"
        }
        packages = [{
            "type": "box",
            "content": "Kit de Desarrollo Néctar",
            "amount": 1,
            "declaredValue": 500,
            "weight": 1.0,
            "length": 20,
            "width": 15,
            "height": 10
        }]

        carrier_to_quote = target_carrier or ("paquetexpress" if not env_is_prod else "estafeta")
        self.stdout.write(self.style.MIGRATE_HEADING(f"\n[2/3] Cotizando ruta Hermosillo -> CDMX (Carrier: {carrier_to_quote})..."))

        rates = client.quote_rates(origin=origin, destination=destination, packages=packages, carrier=carrier_to_quote)

        if rates:
            self.stdout.write(self.style.SUCCESS(f"✓ Se obtuvieron {len(rates)} tarifas disponibles:"))
            for idx, r in enumerate(rates, 1):
                carrier_name = r.get("carrier")
                service = r.get("service") or r.get("serviceDescription")
                price = r.get("totalPrice") or r.get("price")
                currency = r.get("currency", "MXN")
                self.stdout.write(f"   [{idx}] {carrier_name.upper()} ({service}): ${price} {currency}")
        else:
            self.stdout.write(self.style.ERROR(f"✗ No se pudieron obtener tarifas para {carrier_to_quote}."))

        # 3. Emisión de Guía de Prueba
        if should_generate:
            if env_is_prod:
                self.stdout.write(self.style.ERROR("\n[3/3] ✗ Por seguridad, la emisión de guía automática está deshabilitada en Producción."))
            else:
                self.stdout.write(self.style.MIGRATE_HEADING(f"\n[3/3] Emitiendo guía de prueba en Sandbox ({carrier_to_quote})..."))
                selected_service = rates[0].get("service") if rates else "ground"
                label_res = client.generate_label(
                    origin=origin,
                    destination=destination,
                    packages=packages,
                    carrier=carrier_to_quote,
                    service=selected_service
                )
                data_list = label_res.get("data", [])
                if data_list and isinstance(data_list, list):
                    label_data = data_list[0]
                    self.stdout.write(self.style.SUCCESS("✓ Guía de prueba emitida exitosamente:"))
                    self.stdout.write(f"   • Tracking: {label_data.get('trackingNumber')}")
                    self.stdout.write(f"   • URL Etiqueta: {label_data.get('label')}")
                else:
                    self.stdout.write(self.style.ERROR(f"✗ Fallo emitiendo guía: {label_res}"))
        else:
            self.stdout.write(self.style.NOTICE("\n[3/3] Emisión de guía omitida (usa --generate-label para emitir guía en sandbox)."))

        self.stdout.write(self.style.SUCCESS(f"\nDiagnóstico completado con éxito.\n"))
