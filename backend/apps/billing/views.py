import logging
import stripe
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.conf import settings

from apps.tenants.models import Tenant
from apps.tenants.permissions import HasAddOnPermission
from .models import TaxProfile, Invoice
from .serializers import TaxProfileSerializer, InvoiceSerializer
from .services import get_pac_service, PACError, LCOSyncError

logger = logging.getLogger(__name__)

STAMP_PACKAGES = {
    50: {"price": 75.00, "stamps": 50, "description": "Paquete de 50 timbres fiscales"},
    100: {"price": 150.00, "stamps": 100, "description": "Paquete de 100 timbres fiscales"},
    500: {"price": 750.00, "stamps": 500, "description": "Paquete de 500 timbres fiscales"},
}

class BillingTenantMixin:
    """Mixin para obtener de forma segura el Tenant del usuario autenticado"""
    def get_tenant(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Se requiere autenticación.")
            
        if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
            tenant_id = self.request.query_params.get('tenant_id')
            if tenant_id:
                return get_object_or_404(Tenant, id=tenant_id)
                
        # Business user u owner normal del tenant
        tenant = Tenant.objects.filter(owner=user).first()
        if not tenant:
            raise PermissionDenied("No se encontró un portal (tenant) asociado a tu cuenta.")
        return tenant


class BillingInfoView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'mexico-invoicing'

    def get(self, request):
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        
        from apps.shop.models import Contract
        is_commercial_partner = Contract.objects.filter(
            user=tenant.owner,
            is_active=True,
            is_fully_signed=True,
            plan__isnull=False
        ).exists()
        
        addon_active = 'mexico-invoicing' in tenant.active_addons

        data = {
            "stamp_balance": tenant.stamp_balance,
            "is_ambassador": tenant.is_ambassador,
            "free_stamps_left": tenant.free_stamps_left,
            "is_commercial_partner": is_commercial_partner,
            "addon_active": addon_active,
            "has_tax_profile": profile is not None,
            "tax_profile": TaxProfileSerializer(profile).data if profile else None
        }
        return Response(data)

def get_or_create_stamp_package_stripe_price(package_size, package_desc, package_price):
    if getattr(settings, "TESTING", False) or not getattr(settings, "STRIPE_SECRET_KEY", None):
        return "dummy_price_id"
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        # Search for existing Stripe Product with this stamp package size metadata
        product = None
        for p in stripe.Product.list(limit=100).auto_paging_iter():
            if p.active and p.metadata.get("stamp_package_size") == str(package_size):
                product = p
                break
        if not product:
            product = stripe.Product.create(
                name=f"[Néctar Labs] Paquete de {package_size} timbres",
                description=package_desc,
                metadata={"stamp_package_size": str(package_size)},
                idempotency_key=f"stamp_package_product_{package_size}"
            )
        
        # Search for existing active price matching this amount for this product
        prices = stripe.Price.list(product=product.id, active=True)
        price_id = None
        amount_cents = int(package_price * 100)
        for p in prices.data:
            if not p.recurring and p.unit_amount == amount_cents and p.currency == "mxn":
                price_id = p.id
                break
        
        if not price_id:
            price_obj = stripe.Price.create(
                unit_amount=amount_cents,
                currency="mxn",
                product=product.id,
                idempotency_key=f"stamp_package_price_{package_size}_{amount_cents}"
            )
            price_id = price_obj.id
            
        return price_id
    except Exception as e:
        import logging
        logging.getLogger("apps").error(f"Error getting/creating Stripe price for stamp package {package_size}: {e}")
        return None

class BuyStampsView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'mexico-invoicing'

    def post(self, request):
        tenant = self.get_tenant()
        package_size = request.data.get('package_size')
        
        try:
            package_size = int(package_size)
        except (ValueError, TypeError):
            return Response({"error": "El tamaño del paquete debe ser un número entero."}, status=400)
            
        if package_size not in STAMP_PACKAGES:
            return Response({"error": "Tamaño de paquete inválido. Opciones disponibles: 50, 100, 500."}, status=400)
            
        package = STAMP_PACKAGES[package_size]
        
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        from apps.shop.views import get_frontend_origin
        frontend_url = get_frontend_origin(request)
        
        price_id = get_or_create_stamp_package_stripe_price(
            package_size,
            package['description'],
            package['price']
        )
        
        try:
            line_items = []
            if price_id and price_id != "dummy_price_id":
                line_items.append({
                    'price': price_id,
                    'quantity': 1,
                })
            else:
                line_items.append({
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': f"[Néctar Labs] {package['description']}",
                            'description': f"Timbres fiscales para {tenant.name}",
                        },
                        'unit_amount': int(package['price'] * 100),
                    },
                    'quantity': 1,
                })

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                allow_promotion_codes=True,
                success_url=f"{frontend_url}/tenants/{tenant.subdomain}/admin?tab=billing&payment=success&package={package_size}",
                cancel_url=f"{frontend_url}/tenants/{tenant.subdomain}/admin?tab=billing&payment=cancel",
                metadata={
                    'tenant_id': str(tenant.id),
                    'stamps_count': package_size,
                    'type': 'stamp_package'
                }
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TaxProfileView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'mexico-invoicing'

    def get(self, request):
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        if not profile:
            return Response(
                {"detail": "No se ha configurado el perfil fiscal de este portal."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = TaxProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        serializer = TaxProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pac = get_pac_service()

        if not profile:
            # Crear perfil fiscal local y registrar organización en el PAC (Facturapi)
            profile = TaxProfile(
                tenant=tenant,
                rfc=serializer.validated_data['rfc'],
                razon_social=serializer.validated_data['razon_social'],
                regimen_fiscal=serializer.validated_data['regimen_fiscal'],
                codigo_postal=serializer.validated_data['codigo_postal']
            )
            try:
                org_id = pac.create_organization(profile)
                profile.facturapi_organization_id = org_id
                profile.save()
            except PACError as e:
                return Response({"error": f"Fallo al registrar perfil fiscal en el PAC: {e}"}, status=400)
        else:
            # Actualizar datos locales y en el PAC
            profile.rfc = serializer.validated_data.get('rfc', profile.rfc)
            profile.razon_social = serializer.validated_data.get('razon_social', profile.razon_social)
            profile.regimen_fiscal = serializer.validated_data.get('regimen_fiscal', profile.regimen_fiscal)
            profile.codigo_postal = serializer.validated_data.get('codigo_postal', profile.codigo_postal)
            profile.save()

        # Si se subieron archivos de sellos CSD digitales, subirlos directamente al PAC sin guardarlos en Django
        cer_file = serializer.validated_data.get('cer_file')
        key_file = serializer.validated_data.get('key_file')
        password = serializer.validated_data.get('password')

        if cer_file and key_file and password:
            try:
                pac.upload_sello(profile.facturapi_organization_id, cer_file, key_file, password)
            except PACError as e:
                return Response({"error": f"Error al validar o subir tus sellos CSD al PAC: {e}"}, status=400)

        return Response(TaxProfileSerializer(profile).data)


class InvoiceViewSet(BillingTenantMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'mexico-invoicing'
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        user = self.request.user
        is_system_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        
        if is_system_admin and not self.request.query_params.get('tenant_id'):
            return Invoice.objects.all()
            
        tenant = self.get_tenant()
        return Invoice.objects.filter(tenant=tenant)

    @action(detail=False, methods=['post'], url_path='issue-to-customer')
    def issue_to_customer(self, request):
        tenant = self.get_tenant()
        profile = getattr(tenant, 'tax_profile', None)
        if not profile or not profile.facturapi_organization_id:
            return Response(
                {"error": "No se puede facturar; el perfil fiscal del inquilino no está configurado o no tiene sellos válidos."}, 
                status=400
            )

        customer_info = request.data.get("customer_info")
        items = request.data.get("items")
        total = request.data.get("total")

        if not customer_info or not items or total is None:
            return Response({"error": "Los campos customer_info, items y total son obligatorios."}, status=400)

        # Basic customer_info validations
        for field in ["rfc", "razon_social", "regimen_fiscal", "codigo_postal", "email"]:
            if not customer_info.get(field):
                return Response({"error": f"El campo customer_info.{field} es obligatorio."}, status=400)

        # Check stamp balance
        if not tenant.has_available_stamps():
            return Response(
                {"error": "No tienes timbres suficientes en tu balance. Adquiere un paquete de timbres para continuar."}, 
                status=400
            )

        # Create Invoice local instance
        invoice = Invoice.objects.create(
            tenant=tenant,
            total=total,
            is_tenant_to_customer=True,
            status=Invoice.Status.PENDING
        )

        pac = get_pac_service()
        try:
            res = pac.create_invoice(
                invoice=invoice,
                tax_profile=profile,
                customer_info=customer_info,
                items=items,
                is_parent_to_tenant=False
            )
            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
            invoice.uuid_sat = res["uuid_sat"]
            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
            invoice.status = Invoice.Status.PAID
            invoice.error_message = None
            invoice.save()
            
            tenant.consume_stamp()
            
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        except LCOSyncError as e:
            invoice.status = Invoice.Status.LCO_SYNC_PENDING
            invoice.error_message = str(e)
            invoice.save()
            
            tenant.consume_stamp()
            
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_202_ACCEPTED)
        except PACError as e:
            invoice.status = Invoice.Status.FAILED
            invoice.error_message = str(e)
            invoice.save()
            return Response({"error": f"Fallo al emitir CFDI en el PAC: {e}"}, status=400)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in [Invoice.Status.PAID, Invoice.Status.CANCEL_REQUESTED]:
            return Response({"error": "Solo se pueden cancelar facturas timbradas con éxito."}, status=400)

        pac = get_pac_service()
        try:
            new_status = pac.cancel_invoice(invoice)
            invoice.status = new_status
            invoice.save(update_fields=['status'])
            return Response(InvoiceSerializer(invoice).data)
        except PACError as e:
            return Response({"error": f"Fallo al solicitar cancelación ante el SAT: {e}"}, status=400)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in [Invoice.Status.LCO_SYNC_PENDING, Invoice.Status.FAILED]:
            return Response({"error": "Solo se pueden reintentar facturas fallidas o pendientes por sincronía LCO."}, status=400)

        original_status = invoice.status
        tenant = invoice.tenant

        # Check stamp balance if we are retrying a FAILED invoice
        if original_status == Invoice.Status.FAILED:
            if not tenant.has_available_stamps():
                return Response({"error": "No tienes timbres suficientes en tu balance para reintentar esta factura."}, status=400)

        profile = getattr(tenant, 'tax_profile', None)
        if not profile or not profile.facturapi_organization_id:
            return Response({"error": "No se puede facturar; el perfil fiscal del inquilino no está configurado."}, status=400)

        pac = get_pac_service()
        user = tenant.owner
        
        is_parent = not invoice.is_tenant_to_customer
        
        if is_parent:
            customer_info = {
                "razon_social": user.get_full_name() or user.username,
                "rfc": profile.rfc, 
                "regimen_fiscal": profile.regimen_fiscal,
                "codigo_postal": profile.codigo_postal,
                "email": user.email
            }
            items = [{
                "quantity": 1,
                "unit_price": float(invoice.total),
                "description": f"Suscripción de Ecosistema Digital - {tenant.name}"
            }]
        else:
            customer_info = request.data.get("customer_info")
            items = request.data.get("items")
            if not customer_info or not items:
                return Response({"error": "Para reintentar una factura de inquilino a cliente, debes enviar 'customer_info' e 'items' en el cuerpo de la petición."}, status=400)

        try:
            res = pac.create_invoice(
                invoice=invoice,
                tax_profile=profile,
                customer_info=customer_info,
                items=items,
                is_parent_to_tenant=is_parent
            )
            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
            invoice.uuid_sat = res["uuid_sat"]
            
            # Asignar archivos descargados del PAC
            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
            
            invoice.status = Invoice.Status.PAID
            invoice.error_message = None
            invoice.save()

            if original_status == Invoice.Status.FAILED:
                tenant.consume_stamp()

            # Enviar el correo de confirmación de facturación
            try:
                from apps.shop.utils import send_payment_receipt_email
                # Buscamos el abono relacionado en apps.shop para enviarle el correo al cliente
                from apps.shop.models import PaymentInstallment
                inst = PaymentInstallment.objects.filter(stripe_invoice_id=invoice.stripe_invoice_id).first()
                if inst:
                    send_payment_receipt_email(inst)
            except Exception as mail_err:
                logger.error(f"Error al enviar correo de confirmación CFDI: {mail_err}")

            return Response(InvoiceSerializer(invoice).data)

        except LCOSyncError as e:
            invoice.status = Invoice.Status.LCO_SYNC_PENDING
            invoice.error_message = str(e)
            invoice.save(update_fields=['status', 'error_message'])

            if original_status == Invoice.Status.FAILED:
                tenant.consume_stamp()

            return Response({"error": f"Sello no activo (SAT LCO). Reintentando más tarde automáticamente: {e}"}, status=400)
            
        except PACError as e:
            invoice.status = Invoice.Status.FAILED
            invoice.error_message = str(e)
            invoice.save(update_fields=['status', 'error_message'])
            return Response({"error": f"Fallo de timbrado en el PAC: {e}"}, status=400)


class BuyEmailCreditsView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        tenant = self.get_tenant()
        credits_count = 1000
        price = 100.00
        
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        from apps.shop.views import get_frontend_origin
        frontend_url = get_frontend_origin(request)
        
        try:
            line_items = [{
                'price_data': {
                    'currency': 'mxn',
                    'product_data': {
                        'name': "[Néctar Labs] Paquete de 1,000 correos masivos",
                        'description': f"Créditos de email adicionales para {tenant.name}",
                    },
                    'unit_amount': int(price * 100),
                },
                'quantity': 1,
            }]

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                allow_promotion_codes=True,
                success_url=f"{frontend_url}/tenants/{tenant.subdomain}/admin?tab=newsletter&payment=success&credits={credits_count}",
                cancel_url=f"{frontend_url}/tenants/{tenant.subdomain}/admin?tab=newsletter&payment=cancel",
                metadata={
                    'tenant_id': str(tenant.id),
                    'credits_count': credits_count,
                    'type': 'email_credits_package'
                }
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
