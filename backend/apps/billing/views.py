import logging
import stripe
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.conf import settings

from django.db import models
import unicodedata

def normalize_text(text):
    if not text:
        return ""
    normalized = unicodedata.normalize('NFKD', str(text))
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower()
from apps.tenants.models import Tenant
from apps.tenants.permissions import HasAddOnPermission
from .models import TaxProfile, Invoice, SATProductKey, SATUnitKey
from .serializers import TaxProfileSerializer, InvoiceSerializer, SATProductKeySerializer, SATUnitKeySerializer
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
    addon_slug = 'facturacion-cfdi'

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
        
        addon_active = 'facturacion-cfdi' in tenant.active_addons

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
    addon_slug = 'facturacion-cfdi'

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
    addon_slug = 'facturacion-cfdi'

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
                codigo_postal=serializer.validated_data['codigo_postal'],
                default_product_key=serializer.validated_data.get('default_product_key', '43231500'),
                default_unit_key=serializer.validated_data.get('default_unit_key', 'E48'),
                default_unit_name=serializer.validated_data.get('default_unit_name', 'Unidad de servicio')
            )
            try:
                org_id = pac.create_organization(profile)
                profile.facturapi_organization_id = org_id
                profile.save()
            except PACError as e:
                err_msg = f"Fallo al registrar perfil fiscal en el PAC: {e}"
                return Response({"error": err_msg, "detail": err_msg}, status=400)
        else:
            # Actualizar datos locales y en el PAC
            profile.rfc = serializer.validated_data.get('rfc', profile.rfc)
            profile.razon_social = serializer.validated_data.get('razon_social', profile.razon_social)
            profile.regimen_fiscal = serializer.validated_data.get('regimen_fiscal', profile.regimen_fiscal)
            profile.codigo_postal = serializer.validated_data.get('codigo_postal', profile.codigo_postal)
            profile.default_product_key = serializer.validated_data.get('default_product_key', profile.default_product_key)
            profile.default_unit_key = serializer.validated_data.get('default_unit_key', profile.default_unit_key)
            profile.default_unit_name = serializer.validated_data.get('default_unit_name', profile.default_unit_name)
            profile.save()

        # Si se subieron archivos de sellos CSD digitales, subirlos directamente al PAC sin guardarlos en Django
        cer_file = serializer.validated_data.get('cer_file')
        key_file = serializer.validated_data.get('key_file')
        password = serializer.validated_data.get('password')

        if cer_file and key_file and password:
            try:
                pac.upload_sello(profile.facturapi_organization_id, cer_file, key_file, password)
            except PACError as e:
                err_msg = f"Error al validar o subir tus sellos CSD al PAC: {e}"
                return Response({"error": err_msg, "detail": err_msg}, status=400)

        return Response(TaxProfileSerializer(profile).data)


class InvoiceViewSet(BillingTenantMixin, viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    addon_slug = 'facturacion-cfdi'

    def get_permissions(self):
        if self.action in ['issue_from_installment']:
            return [permissions.IsAuthenticated()]
        if self.action == 'issue_tenant_to_client':
            return [permissions.AllowAny(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    def get_queryset(self):
        user = self.request.user
        is_system_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        
        if is_system_admin and not self.request.query_params.get('tenant_id'):
            return Invoice.objects.all()
            
        tenant = self.get_tenant()
        return Invoice.objects.filter(tenant=tenant)

    @action(detail=False, methods=['post'], url_path='issue-from-installment')
    def issue_from_installment(self, request):
        user = request.user
        installment_id = request.data.get('installment_id')
        if not installment_id:
            return Response({"error": "El campo 'installment_id' es obligatorio."}, status=400)

        from apps.shop.models import PaymentInstallment
        installment = get_object_or_404(PaymentInstallment, id=installment_id)

        # Aislamiento multi-tenant / Seguridad:
        # El usuario debe ser el propietario del contrato del abono, o un administrador del sistema.
        is_system_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        if not is_system_admin:
            if installment.contract.user != user:
                raise PermissionDenied("No tienes permiso para facturar este abono.")
            
            # Si el inquilino configuró facturación manual por admin, el cliente no puede facturar por su cuenta
            tenant = installment.contract.user.owned_tenants.first()
            if tenant and tenant.invoicing_mode == 'MANUAL_ADMIN':
                return Response(
                    {"error": "La facturación para este portal está configurada como manual por el administrador. Solicita tu factura directamente al administrador."},
                    status=403
                )

        # Verificar que el abono esté pagado
        if installment.status != PaymentInstallment.Status.PAID:
            return Response({"error": "Solo se pueden facturar abonos que se encuentren en estado 'PAID' (Pagado)."}, status=400)

        # Verificar que no tenga ya un UUID de factura
        if installment.cfdi_uuid and installment.cfdi_uuid not in ["LCO_PENDING", "FAILED"]:
            return Response({"error": "Este abono ya cuenta con una factura asociada (CFDI)."}, status=400)

        from apps.billing.services import issue_invoice_for_installment
        invoice = issue_invoice_for_installment(installment)
        if not invoice:
            return Response({"error": "No se pudo emitir la factura. Verifica que el perfil fiscal esté configurado y tengas timbres suficientes."}, status=400)

        if invoice.status == Invoice.Status.FAILED:
            error_message = invoice.error_message or ""
            if any(word in error_message.lower() for word in ["sello", "csd", "certificate", "certificado"]):
                detail_msg = "No se puede timbrar la factura porque no se han configurado los Certificados de Sello Digital (CSD) en Facturapi o no son válidos."
                return Response(
                    {"detail": detail_msg, "error": detail_msg},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            detail_msg = f"Fallo al emitir CFDI en el PAC: {invoice.error_message}"
            return Response({"error": detail_msg, "detail": detail_msg}, status=400)

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='issue-parent-to-tenant')
    def issue_parent_to_tenant(self, request):
        import uuid
        user = request.user
        # Aislamiento/Seguridad: Only platform admin can do this
        is_system_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        if not is_system_admin:
            raise PermissionDenied("Solo el administrador del sistema puede emitir facturas manuales personalizadas.")

        tenant_id = request.data.get('tenant_id')
        if not tenant_id:
            return Response({"error": "El campo 'tenant_id' es obligatorio.", "detail": "El campo 'tenant_id' es obligatorio."}, status=400)

        from apps.tenants.models import Tenant
        tenant = get_object_or_404(Tenant, id=tenant_id)
        profile = getattr(tenant, 'tax_profile', None)

        customer_info = request.data.get('customer_info')
        items = request.data.get('items')
        total = request.data.get('total')

        if not customer_info or not items or total is None:
            err_msg = "Los campos customer_info, items y total son obligatorios."
            return Response({"error": err_msg, "detail": err_msg}, status=400)

        for field in ["rfc", "razon_social", "regimen_fiscal", "codigo_postal", "email"]:
            if not customer_info.get(field):
                err_msg = f"El campo customer_info.{field} es obligatorio."
                return Response({"error": err_msg, "detail": err_msg}, status=400)

        # Create or update the tenant's TaxProfile locally using the manual customer info
        if not profile:
            profile = TaxProfile.objects.create(
                tenant=tenant,
                rfc=customer_info['rfc'].strip().upper(),
                razon_social=customer_info['razon_social'].strip(),
                regimen_fiscal=customer_info['regimen_fiscal'].strip(),
                codigo_postal=customer_info['codigo_postal'].strip()
            )
        else:
            profile.rfc = customer_info['rfc'].strip().upper()
            profile.razon_social = customer_info['razon_social'].strip()
            profile.regimen_fiscal = customer_info['regimen_fiscal'].strip()
            profile.codigo_postal = customer_info['codigo_postal'].strip()
            profile.save()

        from decimal import Decimal
        from apps.billing.models import Invoice
        invoice = Invoice.objects.create(
            tenant=tenant,
            stripe_invoice_id=f"manual-custom-{uuid.uuid4().hex[:8]}",
            total=Decimal(str(total)),
            is_tenant_to_customer=False,  # Néctar Labs to Tenant
            status=Invoice.Status.PENDING
        )

        from apps.billing.services import get_pac_service, LCOSyncError, PACError
        pac = get_pac_service()
        try:
            res = pac.create_invoice(
                invoice=invoice,
                tax_profile=profile,
                customer_info=customer_info,
                items=items,
                is_parent_to_tenant=True
            )
            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
            invoice.uuid_sat = res["uuid_sat"]
            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
            invoice.status = Invoice.Status.PAID
            invoice.error_message = None
            invoice.save()
            # Optional: send receipt email
            try:
                from django.core.mail import EmailMultiAlternatives
                from django.conf import settings
                subject = f"Tu Factura CFDI de Néctar Labs está lista"
                text_content = f"Hola, tu factura con UUID {invoice.uuid_sat} ha sido generada y timbrada con éxito."
                html_content = f"<p>Hola,</p><p>Tu factura de Néctar Labs ha sido generada y timbrada con éxito.</p><p><strong>Folio Fiscal (UUID):</strong> {invoice.uuid_sat}</p><p>Adjunto a este correo encontrarás los archivos XML y PDF correspondientes.</p>"
                
                from_email = settings.DEFAULT_FROM_EMAIL
                msg = EmailMultiAlternatives(subject, text_content, from_email, [customer_info['email']])
                msg.attach_alternative(html_content, "text/html")
                if invoice.xml_file:
                    msg.attach(invoice.xml_file.name, invoice.xml_file.read(), 'text/xml')
                if invoice.pdf_file:
                    msg.attach(invoice.pdf_file.name, invoice.pdf_file.read(), 'application/pdf')
                msg.send()
            except Exception as mail_err:
                import logging
                logging.getLogger("apps").error(f"Error al enviar correo de factura manual: {mail_err}")

            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

        except LCOSyncError as e:
            invoice.status = Invoice.Status.LCO_SYNC_PENDING
            invoice.error_message = str(e)
            invoice.save()
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_202_ACCEPTED)

        except PACError as e:
            invoice.status = Invoice.Status.FAILED
            invoice.error_message = str(e)
            invoice.save()
            error_message = str(e)
            if any(word in error_message.lower() for word in ["sello", "csd", "certificate", "certificado"]):
                detail_msg = "No se puede timbrar la factura porque no se han configurado los Certificados de Sello Digital (CSD) en Facturapi o no son válidos."
                return Response(
                    {"detail": detail_msg, "error": detail_msg},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            detail_msg = f"Fallo al emitir CFDI en el PAC: {e}"
            return Response({"error": detail_msg, "detail": detail_msg}, status=400)


    @action(detail=False, methods=['post'], url_path='issue-tenant-to-client')
    def issue_tenant_to_client(self, request):
        user = request.user
        tenant = None
        
        # 1. Si el usuario está autenticado y es administrador/staff, buscar por tenant_id si se pasa
        if user and user.is_authenticated:
            if user.is_staff or getattr(user, 'role', '') == 'ADMIN':
                tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')
                if tenant_id:
                    tenant = get_object_or_404(Tenant, id=tenant_id)
            if not tenant:
                # Si es un usuario de negocio, obtener su propio tenant
                tenant = Tenant.objects.filter(owner=user).first()
                
        # 2. Si no se ha resuelto (petición anónima/pública desde el portal del inquilino)
        if not tenant:
            tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')
            subdomain = request.query_params.get('subdomain') or request.data.get('subdomain')
            if tenant_id:
                tenant = get_object_or_404(Tenant, id=tenant_id)
            elif subdomain:
                tenant = get_object_or_404(Tenant, subdomain=subdomain.lower())
                
        if not tenant:
            return Response({"error": "No se pudo determinar el portal (tenant) para procesar la factura."}, status=400)

        profile = getattr(tenant, 'tax_profile', None)
        if not profile or not profile.facturapi_organization_id:
            return Response(
                {"error": "No se puede facturar; el perfil fiscal del inquilino no está configurado o no tiene sellos válidos."}, 
                status=400
            )

        customer_info = request.data.get("customer_info")
        items = request.data.get("items")
        total = request.data.get("total")
        receipt_id = request.data.get("receipt_id") or request.data.get("ticket_number")

        if receipt_id:
            pac = get_pac_service()
            try:
                receipt = pac.retrieve_receipt(profile.facturapi_organization_id, receipt_id)
                desglose_items = []
                for item in receipt.get("items", []):
                    prod = item.get("product", {})
                    desglose_items.append({
                        "quantity": int(item.get("quantity", 1)),
                        "product": {
                            "description": prod.get("description"),
                            "price": float(prod.get("price", 0)),
                            "product_key": prod.get("product_key"),
                            "unit_key": prod.get("unit_key", "E48")
                        }
                    })
                items = desglose_items
                total = float(receipt.get("total", 0))
            except Exception as e:
                return Response({"error": f"No se pudo consultar o validar el ticket ingresado: {e}"}, status=400)

        if not customer_info or not items or total is None:
            return Response({"error": "Los campos de facturación (cliente, conceptos o ticket) son obligatorios."}, status=400)

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
            error_message = str(e)
            if any(word in error_message.lower() for word in ["sello", "csd", "certificate", "certificado"]):
                detail_msg = "No se puede timbrar la factura porque no se han configurado los Certificados de Sello Digital (CSD) en Facturapi o no son válidos."
                return Response(
                    {"detail": detail_msg, "error": detail_msg},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            detail_msg = f"Fallo al emitir CFDI en el PAC: {e}"
            return Response({"error": detail_msg, "detail": detail_msg}, status=400)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in [Invoice.Status.PAID, Invoice.Status.CANCEL_REQUESTED]:
            return Response({"error": "Solo se pueden cancelar facturas timbradas con éxito."}, status=400)

        motive = request.data.get('motive', '02')
        substitution = request.data.get('substitution')
        pac = get_pac_service()
        try:
            new_status = pac.cancel_invoice(invoice, motive=motive, substitution=substitution)
            invoice.status = new_status
            invoice.save(update_fields=['status'])
            return Response(InvoiceSerializer(invoice).data)
        except PACError as e:
            return Response({"error": f"Fallo al solicitar cancelación ante el SAT: {e}"}, status=400)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status not in [Invoice.Status.LCO_SYNC_PENDING, Invoice.Status.FAILED, Invoice.Status.PENDING]:
            return Response({"error": "Solo se pueden reintentar facturas fallidas, pendientes o en sincronía LCO."}, status=400)

        original_status = invoice.status
        tenant = invoice.tenant
        is_parent = not invoice.is_tenant_to_customer

        # Check stamp balance if we are retrying a FAILED invoice
        if original_status == Invoice.Status.FAILED and not is_parent:
            if not tenant.has_available_stamps():
                return Response({"error": "No tienes timbres suficientes en tu balance para reintentar esta factura."}, status=400)

        profile = getattr(tenant, 'tax_profile', None)
        if not profile:
            return Response({"error": "No se puede facturar; el perfil fiscal del inquilino no está configurado."}, status=400)

        if not is_parent and not profile.facturapi_organization_id:
            return Response({"error": "No se puede facturar; la organización del inquilino no está registrada en el PAC."}, status=400)

        pac = get_pac_service()
        user = tenant.owner
        
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

            if original_status == Invoice.Status.FAILED and not is_parent:
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

            if original_status == Invoice.Status.FAILED and not is_parent:
                tenant.consume_stamp()

            return Response({"error": f"Sello no activo (SAT LCO). Reintentando más tarde automáticamente: {e}"}, status=400)
            
        except PACError as e:
            invoice.status = Invoice.Status.FAILED
            invoice.error_message = str(e)
            invoice.save(update_fields=['status', 'error_message'])
            error_message = str(e)
            if any(word in error_message.lower() for word in ["sello", "csd", "certificate", "certificado"]):
                detail_msg = "No se puede timbrar la factura porque no se han configurado los Certificados de Sello Digital (CSD) en Facturapi o no son válidos."
                return Response(
                    {"detail": detail_msg, "error": detail_msg},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            detail_msg = f"Fallo de timbrado en el PAC: {e}"
            return Response({"error": detail_msg, "detail": detail_msg}, status=400)


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


class SATProductKeySearchView(APIView):
    permission_classes = [permissions.AllowAny, HasAddOnPermission]
    addon_slug = 'facturacion-cfdi'

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            # Curated popular SAT codes to avoid search fatigue
            popular_codes = ["43231500", "80101500", "81111508", "82101500", "84111506", "01010101"]
            qs = SATProductKey.objects.filter(code__in=popular_codes)
        else:
            normalized_query = normalize_text(query)
            qs = SATProductKey.objects.filter(
                models.Q(code__icontains=query) | models.Q(normalized_description__icontains=normalized_query)
            )[:50]
        
        serializer = SATProductKeySerializer(qs, many=True)
        return Response(serializer.data)


class SATUnitKeySearchView(APIView):
    permission_classes = [permissions.AllowAny, HasAddOnPermission]
    addon_slug = 'facturacion-cfdi'

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            # Curated popular unit codes
            popular_units = ["E48", "H87", "ACT", "KGM", "LTR", "MON"]
            qs = SATUnitKey.objects.filter(code__in=popular_units)
        else:
            normalized_query = normalize_text(query)
            qs = SATUnitKey.objects.filter(
                models.Q(code__icontains=query) | models.Q(normalized_name__icontains=normalized_query)
            )[:50]
        
        serializer = SATUnitKeySerializer(qs, many=True)
        return Response(serializer.data)


class UploadCSDView(BillingTenantMixin, APIView):
    """
    Endpoint dedicado para subir los archivos CSD (.cer + .key + password)
    directamente al PAC sin modificar ningún dato fiscal del TaxProfile.
    """
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'facturacion-cfdi'

    def post(self, request):
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        if not profile:
            return Response(
                {"error": "Debes configurar el perfil fiscal antes de subir los sellos CSD."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not profile.facturapi_organization_id:
            return Response(
                {"error": "La organización del tenant no está registrada en Facturapi. Guarda primero el perfil fiscal."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cer_file = request.FILES.get('cer_file')
        key_file = request.FILES.get('key_file')
        password = request.data.get('password', '').strip()

        if not cer_file or not key_file or not password:
            return Response(
                {"error": "Se requieren los tres campos: cer_file, key_file y password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar extensiones de archivo en el servidor
        if not cer_file.name.lower().endswith('.cer'):
            return Response({"error": "El archivo de certificado debe tener extensión .cer"}, status=400)
        if not key_file.name.lower().endswith('.key'):
            return Response({"error": "El archivo de llave privada debe tener extensión .key"}, status=400)

        pac = get_pac_service()
        try:
            pac.upload_sello(profile.facturapi_organization_id, cer_file, key_file, password)
            return Response({
                "status": "ok",
                "message": "Sellos CSD cargados y registrados en Facturapi con éxito."
            })
        except PACError as e:
            return Response(
                {"error": f"Error al subir sellos CSD al PAC: {e}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class CSDStatusView(BillingTenantMixin, APIView):
    """
    Consulta el estado y vigencia del certificado CSD actualmente
    cargado en Facturapi para la organización del tenant.
    """
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'facturacion-cfdi'

    def get(self, request):
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        if not profile or not profile.facturapi_organization_id:
            return Response({
                "has_certificate": False,
                "valid_from": None,
                "valid_to": None,
                "serial": None,
                "detail": "No hay organización registrada en el PAC."
            })
        pac = get_pac_service()
        try:
            cert_status = pac.get_certificate_status(profile.facturapi_organization_id)
            return Response(cert_status)
        except PACError as e:
            return Response({
                "has_certificate": False,
                "valid_from": None,
                "valid_to": None,
                "serial": None,
                "detail": str(e)
            })


class FacturapiBaseView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated, HasAddOnPermission]
    addon_slug = 'facturacion-cfdi'

    def get_organization_id_and_tenant(self, request):
        user = request.user
        is_system_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
        tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')

        if is_system_admin and not tenant_id:
            # Caso global: Néctar Labs principal (raíz)
            return None, None

        # Caso tenant: buscar tenant y su perfil fiscal
        tenant = self.get_tenant()
        profile = TaxProfile.objects.filter(tenant=tenant).first()
        if not profile or not profile.facturapi_organization_id:
            raise PACError("El perfil fiscal no está configurado o no tiene organización en Facturapi.")
        return profile.facturapi_organization_id, tenant


class FacturapiCustomerView(FacturapiBaseView):
    """
    CRUD de clientes/receptores fiscales en el catálogo de Facturapi
    de la organización del tenant o de la cuenta matriz de Néctar Labs.
    """
    def _validate_customer_data(self, data):
        errors = {}
        rfc = (data.get('rfc') or '').strip().upper()
        if not rfc or len(rfc) not in [12, 13]:
            errors['rfc'] = 'RFC inválido (debe tener 12 o 13 caracteres).'
        if not data.get('legal_name', '').strip():
            errors['legal_name'] = 'La razón social es obligatoria.'
        if not data.get('zip', '').strip():
            errors['zip'] = 'El código postal es obligatorio.'
        return errors, rfc

    def get(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pac = get_pac_service()
        try:
            customers = pac.list_customers(org_id)
            return Response({"customers": customers})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        errors, rfc = self._validate_customer_data(data)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        customer_data = {
            "rfc": rfc,
            "legal_name": data.get('legal_name', '').strip(),
            "tax_system": data.get('tax_system', '601').strip(),
            "email": data.get('email', '').strip(),
            "phone": data.get('phone', '').strip(),
            "zip": data.get('zip', '').strip(),
        }
        pac = get_pac_service()
        try:
            pac_id = pac.create_customer(org_id, customer_data)
            return Response({
                "pac_customer_id": pac_id,
                "message": "Cliente registrado en Facturapi con éxito.",
                "customer": {**customer_data, "id": pac_id}
            }, status=status.HTTP_201_CREATED)
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pac_customer_id=None):
        if not pac_customer_id:
            return Response({"error": "Se requiere el ID del cliente en Facturapi."}, status=400)
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        errors, rfc = self._validate_customer_data(data)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        customer_data = {
            "rfc": rfc,
            "legal_name": data.get('legal_name', '').strip(),
            "tax_system": data.get('tax_system', '601').strip(),
            "email": data.get('email', '').strip(),
            "phone": data.get('phone', '').strip(),
            "zip": data.get('zip', '').strip(),
        }
        pac = get_pac_service()
        try:
            pac.update_customer(org_id, pac_customer_id, customer_data)
            return Response({
                "pac_customer_id": pac_customer_id,
                "message": "Cliente actualizado en Facturapi con éxito.",
                "customer": {**customer_data, "id": pac_customer_id}
            })
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pac_customer_id=None):
        if not pac_customer_id:
            return Response({"error": "Se requiere el ID del cliente en Facturapi."}, status=400)
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        pac = get_pac_service()
        try:
            pac.delete_customer(org_id, pac_customer_id)
            return Response({"message": "Cliente eliminado del catálogo de Facturapi."})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FacturapiProductView(FacturapiBaseView):
    """
    CRUD de productos/conceptos en el catálogo de Facturapi.
    """
    def _validate_product_data(self, data):
        errors = {}
        if not data.get('description', '').strip():
            errors['description'] = 'La descripción es obligatoria.'
        try:
            price = float(data.get('price', 0))
            if price < 0:
                errors['price'] = 'El precio no puede ser negativo.'
        except (ValueError, TypeError):
            errors['price'] = 'El precio debe ser un número válido.'
        if not data.get('product_key', '').strip():
            errors['product_key'] = 'La clave del producto SAT es obligatoria.'
        return errors

    def get(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pac = get_pac_service()
        try:
            products = pac.list_products(org_id)
            return Response({"products": products})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        errors = self._validate_product_data(data)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        product_data = {
            "description": data.get('description', '').strip(),
            "price": float(data.get('price')),
            "product_key": data.get('product_key', '').strip(),
            "unit_key": data.get('unit_key', 'E48').strip()
        }
        pac = get_pac_service()
        try:
            pac_id = pac.create_product(org_id, product_data)
            return Response({
                "pac_product_id": pac_id,
                "message": "Producto registrado en Facturapi con éxito.",
                "product": {**product_data, "id": pac_id}
            }, status=status.HTTP_201_CREATED)
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pac_product_id=None):
        if not pac_product_id:
            return Response({"error": "Se requiere el ID del producto en Facturapi."}, status=400)
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        errors = self._validate_product_data(data)
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        product_data = {
            "description": data.get('description', '').strip(),
            "price": float(data.get('price')),
            "product_key": data.get('product_key', '').strip(),
            "unit_key": data.get('unit_key', 'E48').strip()
        }
        pac = get_pac_service()
        try:
            pac.update_product(org_id, pac_product_id, product_data)
            return Response({
                "pac_product_id": pac_product_id,
                "message": "Producto actualizado en Facturapi con éxito.",
                "product": {**product_data, "id": pac_product_id}
            })
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pac_product_id=None):
        if not pac_product_id:
            return Response({"error": "Se requiere el ID del producto en Facturapi."}, status=400)
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        pac = get_pac_service()
        try:
            pac.delete_product(org_id, pac_product_id)
            return Response({"message": "Producto eliminado del catálogo de Facturapi."})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FacturapiReceiptView(FacturapiBaseView):
    """
    Listado y emisión de notas de venta/recibos en Facturapi.
    """
    def get(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pac = get_pac_service()
        try:
            receipts = pac.list_receipts(org_id)
            return Response({"receipts": receipts})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        try:
            org_id, tenant = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Si es un tenant, verificar balance de timbres
        if tenant and not tenant.has_available_stamps():
            return Response(
                {"error": "No tienes timbres suficientes en tu balance. Adquiere un paquete de timbres para continuar."},
                status=400
            )

        data = request.data
        if not data.get("items"):
            return Response({"error": "El campo 'items' es obligatorio."}, status=400)

        pac = get_pac_service()
        try:
            res = pac.create_receipt(org_id, data)
            if tenant:
                tenant.consume_stamp()
            return Response(res, status=status.HTTP_201_CREATED)
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FacturapiRetentionView(FacturapiBaseView):
    """
    Listado y emisión de retenciones fiscales en Facturapi.
    """
    def get(self, request):
        try:
            org_id, _ = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        pac = get_pac_service()
        try:
            retentions = pac.list_retentions(org_id)
            return Response({"retentions": retentions})
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        try:
            org_id, tenant = self.get_organization_id_and_tenant(request)
        except (PACError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Si es un tenant, verificar balance de timbres
        if tenant and not tenant.has_available_stamps():
            return Response(
                {"error": "No tienes timbres suficientes en tu balance. Adquiere un paquete de timbres para continuar."},
                status=400
            )

        data = request.data
        if not data.get("customer") or not data.get("cve_retenc") or not data.get("periodo") or not data.get("totales"):
            return Response({"error": "Los campos customer, cve_retenc, periodo y totales son obligatorios."}, status=400)

        pac = get_pac_service()
        try:
            res = pac.create_retention(org_id, data)
            if tenant:
                tenant.consume_stamp()
            return Response(res, status=status.HTTP_201_CREATED)
        except PACError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
