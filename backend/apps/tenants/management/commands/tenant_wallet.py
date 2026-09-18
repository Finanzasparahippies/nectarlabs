import sys
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from apps.tenants.models import Tenant, TenantWalletTransaction

class Command(BaseCommand):
    help = "Gestiona la Billetera Unificada de un Inquilino (Saldo, Abonos, Cargos y Auditoría)."

    def add_arguments(self, parser):
        parser.add_argument("subdomain", type=str, help="Subdominio o slug del inquilino (ej: kores)")
        parser.add_argument("--balance", action="store_true", help="Muestra el saldo actual de la billetera unificada")
        parser.add_argument("--credit", type=Decimal, help="Abonar fondos en MXN a la billetera")
        parser.add_argument("--debit", type=Decimal, help="Debitar fondos en MXN de la billetera")
        parser.add_argument("--service", type=str, default="MANUAL_CLI", help="Tipo de servicio o concepto (ej: INVOICING_CFDI, SHIPPING_LABEL, EMAIL_SES, RECHARGE)")
        parser.add_argument("--notes", type=str, default="Operación ejecutada desde CLI nectar.sh", help="Descripción o motivo de la operación")
        parser.add_argument("--history", action="store_true", help="Muestra las últimas 10 transacciones financieras")

    def handle(self, *args, **options):
        subdomain = options["subdomain"].strip().lower()
        tenant = Tenant.objects.filter(subdomain=subdomain).first()
        if not tenant:
            raise CommandError(f"Inquilino con subdominio '{subdomain}' no encontrado.")

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n🐝 Billetera Unificada — {tenant.name} ({tenant.subdomain})"))
        self.stdout.write(f"ID: {tenant.id} | Propietario: {tenant.owner.email}")

        if options.get("credit"):
            amount = options["credit"]
            success, new_bal, tx = tenant.atomic_credit_wallet(
                amount=amount,
                service_type=options["service"] or "RECHARGE",
                description=options["notes"],
                reference_id="CLI_RECHARGE"
            )
            if success:
                self.stdout.write(self.style.SUCCESS(f"✅ Abono exitoso de ${amount:.2f} MXN. Nuevo saldo: ${new_bal:.2f} MXN"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ Fallo al abonar saldo."))

        elif options.get("debit"):
            amount = options["debit"]
            success, new_bal, tx = tenant.atomic_debit_wallet(
                amount=amount,
                service_type=options["service"] or "OTHER",
                description=options["notes"],
                reference_id="CLI_DEBIT"
            )
            if success:
                self.stdout.write(self.style.SUCCESS(f"✅ Débito exitoso de ${amount:.2f} MXN. Nuevo saldo: ${new_bal:.2f} MXN"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ Saldo insuficiente para debitar ${amount:.2f} MXN. Saldo actual: ${new_bal:.2f} MXN"))

        else:
            effective_bal = max(tenant.wallet_balance, tenant.shipping_wallet_balance)
            self.stdout.write(self.style.SUCCESS(f"💰 Saldo Billetera Unificada: ${effective_bal:.2f} MXN"))
            self.stdout.write(f"   - Balance CFDI / Universal: ${tenant.wallet_balance:.2f} MXN")
            self.stdout.write(f"   - Balance Envíos / Skydropx: ${tenant.shipping_wallet_balance:.2f} MXN")
            self.stdout.write(f"   - Timbres Disponibles: {tenant.stamp_balance} timbres")

        if options.get("history") or options.get("credit") or options.get("debit"):
            txs = TenantWalletTransaction.objects.filter(tenant=tenant).order_by("-created_at")[:10]
            if txs.exists():
                self.stdout.write("\n📜 Últimas 10 Transacciones Financieras:")
                self.stdout.write("-" * 75)
                self.stdout.write(f"{'FECHA':<18} | {'SERVICIO':<16} | {'MONTO':<12} | {'SALDO':<12} | {'DETALLE'}")
                self.stdout.write("-" * 75)
                for tx in txs:
                    self.stdout.write(
                        f"{tx.created_at.strftime('%Y-%m-%d %H:%M'):<18} | "
                        f"{tx.service_type[:16]:<16} | "
                        f"${tx.amount:>10.2f} | "
                        f"${tx.balance_after:>10.2f} | "
                        f"{tx.description[:25]}"
                    )
                self.stdout.write("-" * 75)
