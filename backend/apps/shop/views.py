from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import stripe
from .models import Plan, Product, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer, PaymentInstallmentSerializer, AddOnSerializer, PromoCodeSerializer, SalesCommissionSerializer
from .utils import generate_contract_pdf, send_contract_emails, send_payment_receipt_email, send_addon_payment_receipt_email

stripe.api_key = settings.STRIPE_SECRET_KEY

def get_frontend_origin(request):
    origin = request.META.get('HTTP_ORIGIN')
    if origin:
        return origin
    referer = request.META.get('HTTP_REFERER')
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        return f"{parsed.scheme}://{parsed.netloc}"
    return settings.FRONTEND_URL

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.all()
        
        # Filter by tenant parameter if present
        tenant_id = self.request.query_params.get('tenant_id')
        subdomain = self.request.query_params.get('subdomain')
        
        from apps.tenants.models import Tenant
        import uuid
        from apps.users.models import User

        if tenant_id:
            try:
                queryset = queryset.filter(tenant_id=uuid.UUID(str(tenant_id)))
            except (ValueError, TypeError):
                queryset = queryset.none()
        elif subdomain:
            queryset = queryset.filter(tenant__subdomain=subdomain.lower())
        else:
            # Fallback to user context if authenticated
            user = self.request.user
            if user and user.is_authenticated:
                if user.is_staff or user.role == User.Role.ADMIN:
                    # Admins see everything
                    pass
                elif user.role == User.Role.BUSINESS:
                    # Business owner sees products of their owned tenants
                    queryset = queryset.filter(tenant__in=user.owned_tenants.all())
                elif user.tenant:
                    queryset = queryset.filter(tenant=user.tenant)
                else:
                    queryset = queryset.none()
            else:
                # If anonymous and no tenant context is provided, return empty
                queryset = queryset.none()
                
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        from apps.users.models import User as UserModel
        if user and user.is_authenticated and user.role == UserModel.Role.BUSINESS:
            tenant = user.owned_tenants.first()
            serializer.save(tenant=tenant)
        else:
            serializer.save()

class AddOnViewSet(viewsets.ModelViewSet):
    queryset = AddOn.objects.all()
    serializer_class = AddOnSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def subscribe(self, request, pk=None):
        addon = self.get_object()
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        
        if billing_cycle == 'yearly':
            price_id = addon.stripe_yearly_price_id
            cycle_name = 'anual'
        else:
            price_id = addon.stripe_price_id
            cycle_name = 'mensual'
            
        if not price_id:
            return Response({'error': f'Este Add-on no está configurado para la suscripción {cycle_name} de Stripe.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not price_id.startswith('price_'):
            return Response({'error': f'Configuración de Stripe incorrecta para el Add-on "{addon.name}" (suscripción {cycle_name}): El ID "{price_id}" parece ser un ID de Producto (empieza con prod_) o es inválido. Debes ingresar el ID de Precio de Stripe (que empieza con price_) en el Django Admin.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            comments = request.data.get('comments', '')
            comments_truncated = comments[:450] if comments else ''
            
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                subscription_data={
                    'metadata': {
                        'user_id': request.user.id,
                        'addon_id': addon.id,
                        'type': 'addon_subscription',
                        'comments': comments_truncated
                    }
                },
                success_url=f"{get_frontend_origin(request)}/dashboard?payment=success&addon_slug={addon.slug}",
                cancel_url=f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                metadata={
                    'user_id': request.user.id,
                    'addon_id': addon.id,
                    'type': 'addon_subscription',
                    'comments': comments_truncated
                }
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def customer_portal(self, request):
        try:
            customers = stripe.Customer.list(email=request.user.email).data
            if customers:
                customer_id = customers[0].id
            else:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=request.user.get_full_name() or request.user.username
                )
                customer_id = customer.id
                
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{get_frontend_origin(request)}/dashboard"
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Auto-healer: ensure all signed contracts have a tenant
        from apps.tenants.models import Tenant
        from django.utils.text import slugify
        for contract in Contract.objects.filter(is_fully_signed=True):
            if not Tenant.objects.filter(owner=contract.user).exists():
                try:
                    base_subdomain = slugify(contract.full_name or contract.user.username)
                    if not base_subdomain:
                        base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                    
                    subdomain = base_subdomain
                    counter = 1
                    while Tenant.objects.filter(subdomain=subdomain).exists():
                        subdomain = f"{base_subdomain}-{counter}"
                        counter += 1
                    
                    Tenant.objects.create(
                        owner=contract.user,
                        name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                        subdomain=subdomain,
                        is_active=False
                    )
                except Exception as e:
                    import logging
                    logging.error(f"Error auto-healing tenant: {e}", exc_info=True)

        # El administrador (desarrollador) puede ver todos los contratos
        if self.request.user.is_staff:
            return Contract.objects.all()
        # Los clientes solo ven sus propios contratos
        return Contract.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Asignar el usuario actual al contrato
        contract = serializer.save(user=self.request.user)
        
        # Generar el PDF Parcial e iniciar flujo de firmas
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
        except Exception as e:
            import logging
            logging.error(f"Error in contract creation flow: {e}", exc_info=True)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def dev_sign(self, request, pk=None):
        if not (request.user.is_staff or request.user.role in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'No tienes permisos para firmar contratos'}, status=status.HTTP_403_FORBIDDEN)
            
        contract = self.get_object()
        signature = request.data.get('signature')
        
        if not signature:
            return Response({'error': 'Firma del desarrollador requerida'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Registrar firma del socio tecnológico
        contract.developer_signature = signature
        contract.developer_signed_at = timezone.now()
        contract.is_fully_signed = True
        contract.save()

        # Generar automáticamente abonos obligatorios de forma independiente para desarrollo y diseño
        if contract.plan or contract.project_quote:
            from apps.shop.utils import generate_installments_for_contract
            generate_installments_for_contract(contract)
            # Auto-populate next_payment_date with the due date of the first generated installment
            first_inst = contract.installments.order_by('due_date').first()
            if first_inst:
                contract.next_payment_date = first_inst.due_date
                contract.save()
        
        # --- AUTO-CREATE TENANT ---
        try:
            from apps.tenants.models import Tenant
            from django.utils.text import slugify
            if not Tenant.objects.filter(owner=contract.user).exists():
                base_subdomain = slugify(contract.full_name or contract.user.username)
                if not base_subdomain:
                    base_subdomain = slugify(contract.user.username) or f"client-{contract.user.id}"
                
                subdomain = base_subdomain
                counter = 1
                while Tenant.objects.filter(subdomain=subdomain).exists():
                    subdomain = f"{base_subdomain}-{counter}"
                    counter += 1
                
                Tenant.objects.create(
                    owner=contract.user,
                    name=contract.full_name or f"Portal de {contract.user.get_full_name() or contract.user.username}",
                    subdomain=subdomain,
                    is_active=False
                )
        except Exception as tenant_err:
            import logging
            logging.error(f"Error creating tenant automatically: {tenant_err}", exc_info=True)

        # --- AUTO-CREATE PROJECT ---
        try:
            from apps.dashboard.models import Project
            plan_name = contract.plan.name if contract.plan else 'Personalizado'
            project_name = f"Ecosistema - {contract.full_name} ({plan_name})"
            if not Project.objects.filter(client=contract.user, plan=contract.plan).exists():
                Project.objects.create(
                    client=contract.user,
                    plan=contract.plan,
                    name=project_name,
                    status=Project.Status.MVP,
                    is_active=True
                )
        except Exception as proj_err:
            import logging
            logging.error(f"Error creating project automatically: {proj_err}", exc_info=True)

        # Regenerar PDF FINAL y enviar copias certificadas
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
                return Response({'message': 'Contrato cerrado, mensualidades generadas, proyecto creado y correo enviado con éxito'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'error': 'Error al procesar el cierre'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='client-sign', permission_classes=[permissions.IsAuthenticated])
    def client_sign(self, request, pk=None):
        contract = self.get_object()
        if contract.user != request.user and not request.user.is_staff:
            return Response({'error': 'No tienes permisos para firmar este contrato'}, status=status.HTTP_403_FORBIDDEN)
            
        signature = request.data.get('signature')
        if not signature:
            return Response({'error': 'Firma del cliente requerida'}, status=status.HTTP_400_BAD_REQUEST)
            
        full_name = request.data.get('full_name')
        tax_id = request.data.get('tax_id')
        address = request.data.get('address')
        
        if full_name:
            contract.full_name = full_name
        if tax_id:
            contract.tax_id = tax_id
        if address:
            contract.address = address
            
        contract.signature_base64 = signature
        contract.signed_at = timezone.now()
        contract.save()
        
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
                return Response({'message': 'Contrato firmado por el cliente. Pendiente de firma de Néctar Labs.'})
        except Exception as e:
            import logging
            logging.error(f"Error in client_sign flow: {e}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'error': 'Error al procesar la firma del cliente'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='apply-promo-code', permission_classes=[permissions.IsAuthenticated])
    def apply_promo_code(self, request, pk=None):
        contract = self.get_object()
        code_str = request.data.get('code', '').strip().upper()
        
        if not code_str:
            return Response({'error': 'Código promocional no especificado.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            promo = PromoCode.objects.get(code=code_str)
            if not promo.is_valid():
                return Response({'error': 'Este código promocional ya no es válido o ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Override contract's discount percentage with promo code's discount percentage
            contract.promo_code = promo
            contract.discount_percentage = promo.discount_percentage
            contract.save()
            
            # Recalculate only the next pending installment's amount
            from .utils import update_remaining_installments_amounts
            update_remaining_installments_amounts(contract)
            
            return Response({
                'message': f'Código {promo.code} aplicado con éxito. El próximo pago pendiente ha sido recalculado.',
                'discount_percentage': float(promo.discount_percentage),
                'contract_discount': float(contract.discount_percentage)
            })
        except PromoCode.DoesNotExist:
            return Response({'error': 'Código promocional no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view_pdf(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                    self.request.user = user
                except Exception:
                    from django.http import HttpResponse
                    return HttpResponse("Token no válido o expirado.", status=401)
        
        if not user or not user.is_authenticated:
            from django.http import HttpResponse
            return HttpResponse("No autorizado.", status=401)

        from django.shortcuts import get_object_or_404
        contract = get_object_or_404(Contract, pk=pk)
        
        if not user.is_staff and contract.user != user:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a este contrato.", status=403)

        if not contract.pdf_file:
            from django.http import HttpResponse
            return HttpResponse("PDF no generado para este contrato.", status=404)
        
        from django.http import HttpResponse
        try:
            contract.pdf_file.open('rb')
            pdf_content = contract.pdf_file.read()
            contract.pdf_file.close()
            django_response = HttpResponse(pdf_content, content_type='application/pdf')
            django_response['Content-Disposition'] = f'inline; filename="Contrato_{contract.id}.pdf"'
            return django_response
        except Exception as e:
            return HttpResponse(f"Error al recuperar el archivo PDF: {e}", status=500)

class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Auto-healer: generate missing installments for already signed contracts (only if they have a plan)
        for contract in Contract.objects.filter(is_fully_signed=True, plan__isnull=False):
            if contract.installments.count() == 0:
                from apps.shop.utils import generate_installments_for_contract
                generate_installments_for_contract(contract)
            # Auto-healer for next_payment_date
            if not contract.next_payment_date:
                first_inst = contract.installments.order_by('due_date').first()
                if first_inst:
                    contract.next_payment_date = first_inst.due_date
                    contract.save()

        is_admin_or_business = self.request.user.is_staff or self.request.user.role in ['ADMIN', 'BUSINESS']
        if is_admin_or_business:
            return PaymentInstallment.objects.all().order_by('due_date')
        return PaymentInstallment.objects.filter(contract__user=self.request.user).order_by('due_date')

    def perform_update(self, serializer):
        is_admin_or_business = self.request.user.is_staff or self.request.user.role in ['ADMIN', 'BUSINESS']
        if not is_admin_or_business:
            # Forzamos a guardar únicamente el archivo recibido y actualizar status
            serializer.save(
                receipt_file=self.request.data.get('receipt_file')
            )
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def checkout_session(self, request, pk=None):
        installment = self.get_object()
        
        # Validar que no esté ya pagada
        if installment.status == PaymentInstallment.Status.PAID:
            return Response({'error': 'Esta mensualidad ya ha sido pagada.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': f"Mensualidad {installment.installment_number}/6 - Nectar Labs",
                            'description': f"Cliente: {installment.contract.full_name}",
                        },
                        'unit_amount': int(installment.amount * 100),  # Stripe requiere centavos (ej: $1000.00 -> 100000)
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{get_frontend_origin(request)}/dashboard?payment=success&installment_id={installment.id}",
                cancel_url=f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                metadata={
                    'installment_id': installment.id
                }
            )
            return Response({'url': session.url}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view_receipt(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                    self.request.user = user
                except Exception:
                    from django.http import HttpResponse
                    return HttpResponse("Token no válido o expirado.", status=401)
        
        if not user or not user.is_authenticated:
            from django.http import HttpResponse
            return HttpResponse("No autorizado.", status=401)

        from django.shortcuts import get_object_or_404
        installment = get_object_or_404(PaymentInstallment, pk=pk)
        
        is_admin_or_business = user.is_staff or user.role in ['ADMIN', 'BUSINESS']
        if not is_admin_or_business and installment.contract.user != user:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a esta mensualidad.", status=403)

        if not installment.receipt_file:
            from django.http import HttpResponse
            return HttpResponse("No hay comprobante cargado para esta mensualidad.", status=404)
        
        import requests
        from django.http import HttpResponse
        try:
            response = requests.get(installment.receipt_file.url, timeout=10)
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            filename = f"Comprobante_{installment.id}"
            if "pdf" in content_type:
                filename += ".pdf"
            elif "png" in content_type:
                filename += ".png"
            elif "jpeg" in content_type or "jpg" in content_type:
                filename += ".jpg"
                
            django_response = HttpResponse(response.content, content_type=content_type)
            django_response['Content-Disposition'] = f'inline; filename="{filename}"'
            return django_response
        except Exception as e:
            return HttpResponse(f"Error al recuperar el archivo: {e}", status=500)


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    # Procesar pago exitoso
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Caso 1: Pago de una mensualidad (Installment)
        installment_id = session.get('metadata', {}).get('installment_id')
        if installment_id:
            try:
                installment = PaymentInstallment.objects.get(id=installment_id)
                installment.status = PaymentInstallment.Status.PAID
                installment.stripe_invoice_id = session.get('id')  # ID de sesión o pago
                installment.paid_at = timezone.now()
                installment.payment_method = 'STRIPE'
                installment.save()
                
                # Actualizar la fecha del siguiente pago en el contrato
                contract = installment.contract
                contract.next_payment_date = installment.due_date + timedelta(days=30)
                contract.save()
                
                # Enviar correo de confirmación de pago (facturación)
                try:
                    send_payment_receipt_email(installment)
                except Exception as mail_err:
                    import logging
                    logging.getLogger(__name__).error(f"Error sending payment receipt email: {mail_err}", exc_info=True)
            except PaymentInstallment.DoesNotExist:
                pass

        # Caso 2: Suscripción a un Add-on individual
        elif session.get('metadata', {}).get('type') == 'addon_subscription':
            user_id = session.get('metadata', {}).get('user_id')
            addon_id = session.get('metadata', {}).get('addon_id')
            comments = session.get('metadata', {}).get('comments', '')
            if user_id and addon_id:
                try:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    user = User.objects.get(id=user_id)
                    
                    # Upgrade role to BUSINESS if they are currently a CUSTOMER
                    if user.role == User.Role.CUSTOMER:
                        user.role = User.Role.BUSINESS
                        user.save()

                    # Buscar el contrato activo del usuario para agregarle el addon
                    contract = Contract.objects.filter(user=user, is_active=True).first()
                    if not contract:
                        # Si no tiene contrato activo, crear uno básico
                        contract = Contract.objects.create(
                            user=user,
                            full_name=user.get_full_name() or user.username,
                            is_fully_signed=True,
                            payment_commitment_method='STRIPE'
                        )
                    contract.addons.add(addon_id)
                    
                    # --- AUTO-CREATE TENANT ---
                    try:
                        from apps.tenants.models import Tenant
                        from django.utils.text import slugify
                        tenant = Tenant.objects.filter(owner=user).first()
                        if not tenant:
                            base_subdomain = slugify(contract.full_name or user.username)
                            if not base_subdomain:
                                base_subdomain = slugify(user.username) or f"client-{user.id}"
                            
                            subdomain = base_subdomain
                            counter = 1
                            while Tenant.objects.filter(subdomain=subdomain).exists():
                                subdomain = f"{base_subdomain}-{counter}"
                                counter += 1
                            
                            Tenant.objects.create(
                                owner=user,
                                name=contract.full_name or f"Portal de {user.get_full_name() or user.username}",
                                subdomain=subdomain,
                                is_active=True
                            )
                        else:
                            if not tenant.is_active:
                                tenant.is_active = True
                                tenant.save()
                    except Exception as tenant_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error creating/activating tenant on addon subscription: {tenant_err}", exc_info=True)

                    # Enviar correo de confirmación de pago del Add-on (facturación)
                    try:
                        addon = AddOn.objects.get(id=addon_id)
                        send_addon_payment_receipt_email(contract.user, addon, session)
                    except Exception as mail_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error sending addon subscription payment receipt email: {mail_err}", exc_info=True)
                    
                    # --- AUTO-CREATE IMPLEMENTATION TICKET ---
                    try:
                        from apps.tickets.models import Ticket
                        addon = AddOn.objects.get(id=addon_id)
                        ticket_title = f"[Suscripción Stripe] Integración de Add-on: {addon.name}"
                        ticket_description = (
                            f"## Nueva Suscripción Recurrente a Add-on (Pago Exitoso)\n\n"
                            f"El cliente ha realizado el pago en Stripe para suscribirse al módulo.\n\n"
                            f"### Detalles del Módulo\n"
                            f"- **Módulo**: {addon.name}\n"
                            f"- **Esquema de Pago**: Suscripción Mensual\n"
                            f"- **Precio**: ${addon.monthly_price} MXN/mes\n"
                            f"- **Referencia Técnica**: `{addon.source_reference}`\n"
                            f"- **Complejidad**: {addon.complexity}\n"
                            f"- **Requerimientos Servidor**: {addon.server_requirements}\n\n"
                            f"### Notas del Cliente / Requerimientos Particulares:\n"
                            f"{comments if comments.strip() else '_El cliente no ingresó comentarios adicionales._'}\n\n"
                            f"---\n"
                            f"*Creado automáticamente tras confirmación de Stripe Webhook.*"
                        )
                        Ticket.objects.create(
                            client=contract.user,
                            tenant=contract.user.owned_tenants.first() or contract.user.tenant,
                            title=ticket_title,
                            description=ticket_description,
                            category=Ticket.Category.IMPLEMENTATION,
                            priority=Ticket.Priority.HIGH,
                            status=Ticket.Status.OPEN
                        )
                    except Exception as ticket_err:
                        import logging
                        logging.error(f"Error creating ticket on webhook: {ticket_err}", exc_info=True)
                except Exception:
                    pass

        # Caso 3: Suscripción / Pago de Sponsorship (Patreon) para un cliente del Tenant
        elif session.get('metadata', {}).get('type') == 'patreon_sponsorship':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            user_id = session.get('metadata', {}).get('user_id')
            tier_id = session.get('metadata', {}).get('tier_id')
            target_id = session.get('metadata', {}).get('target_id')
            billing_cycle = session.get('metadata', {}).get('billing_cycle', 'MONTHLY')
            
            if tenant_id and user_id and tier_id:
                try:
                    from apps.tenants.models import Tenant
                    from apps.sponsorship.models import SponsorshipTier, SponsorTarget, Sponsorship
                    from django.contrib.auth import get_user_model
                    
                    User = get_user_model()
                    tenant = Tenant.objects.get(id=tenant_id)
                    user = User.objects.get(id=user_id)
                    tier = SponsorshipTier.objects.get(id=tier_id, tenant=tenant)
                    
                    target = None
                    if target_id:
                        target = SponsorTarget.objects.filter(id=target_id, tenant=tenant).first()
                        
                    Sponsorship.objects.create(
                        tenant=tenant,
                        user=user,
                        target=target,
                        tier=tier,
                        billing_cycle=billing_cycle,
                        amount=tier.price_annual if billing_cycle == 'ANNUAL' else tier.price,
                        stripe_subscription_id=session.get('subscription'),
                        stripe_payment_intent=session.get('payment_intent'),
                        active=True
                    )
                except Exception as webhook_err:
                    import logging
                    logging.getLogger("apps").error(f"Error handling patreon_sponsorship webhook: {webhook_err}", exc_info=True)

    # Procesar cancelación de suscripción
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        metadata = subscription.get('metadata', {})
        user_id = metadata.get('user_id')
        addon_id = metadata.get('addon_id')
        
        if user_id and addon_id:
            try:
                # Buscar el contrato activo del usuario y remover el add-on
                contract = Contract.objects.filter(user_id=user_id, is_active=True).first()
                if contract:
                    contract.addons.remove(addon_id)
            except Exception:
                pass

    return HttpResponse(status=200)


class PromoCodeViewSet(viewsets.ModelViewSet):
    serializer_class = PromoCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            user = request.user
            is_admin = user.is_staff or getattr(user, 'role', '') == 'ADMIN'
            if not is_admin:
                self.permission_denied(request, message="No tienes permisos para administrar códigos de referido.")

    def get_queryset(self):
        # Staff/admin see ALL codes (including inactive), regular users see only active
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'BUSINESS']:
            return PromoCode.objects.all().order_by('-created_at')
        return PromoCode.objects.filter(is_active=True)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def validate(self, request):
        code_str = request.query_params.get('code', '').strip().upper()
        if not code_str:
            return Response({'is_valid': False, 'message': 'Código promocional no especificado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            promo = PromoCode.objects.get(code=code_str)
            if promo.is_valid():
                return Response({
                    'is_valid': True,
                    'code': promo.code,
                    'discount_percentage': float(promo.discount_percentage),
                    'code_type': promo.code_type,
                    'message': f'Código {promo.code} aplicado con éxito (-{promo.discount_percentage}% en tu primer mes).'
                })
            else:
                return Response({
                    'is_valid': False,
                    'message': 'Este código promocional ya no es válido o ha expirado.'
                })
        except PromoCode.DoesNotExist:
            return Response({
                'is_valid': False,
                'message': 'Código promocional no encontrado.'
            })

    @action(detail=False, methods=['get'], url_path='my-referral-code')
    def my_referral_code(self, request):
        user = request.user
        code_str = f"NECTAR-{user.username.upper()}"
        
        # Determine code type based on user role
        code_type = PromoCode.CodeType.SELLER if user.role == 'SALES' else PromoCode.CodeType.CLIENT
        discount = 10.00
        
        promo, created = PromoCode.objects.get_or_create(
            referrer=user,
            defaults={
                'code': code_str,
                'code_type': code_type,
                'discount_percentage': discount,
                'is_active': True,
            }
        )
        return Response({
            'code': promo.code,
            'code_type': promo.code_type,
            'discount_percentage': float(promo.discount_percentage),
            'used_count': promo.used_count
        })


class SalesCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SalesCommissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            return SalesCommission.objects.all().order_by('-created_at')
        return SalesCommission.objects.filter(salesperson=user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        commissions = self.get_queryset()
        paid_total = sum(c.amount for c in commissions.filter(status='PAID'))
        pending_total = sum(c.amount for c in commissions.filter(status='PENDING'))
        
        # Referred contracts count
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            # Admin sees global: total unique sellers, total referred contracts
            from apps.users.models import User as UserModel
            active_sellers = UserModel.objects.filter(role='SALES').count()
            referred_contracts_count = Contract.objects.filter(
                promo_code__code_type='SELLER'
            ).distinct().count()
        else:
            active_sellers = None
            referred_contracts_count = Contract.objects.filter(
                promo_code__referrer=user,
                promo_code__code_type='SELLER'
            ).distinct().count()

        return Response({
            'paid_total': float(paid_total),
            'pending_total': float(pending_total),
            'referred_contracts_count': referred_contracts_count,
            'active_sellers': active_sellers,
        })

    @action(detail=True, methods=['post'], url_path='mark-paid', permission_classes=[permissions.IsAuthenticated])
    def mark_paid(self, request, pk=None):
        """Admin-only: mark a SalesCommission as PAID."""
        user = request.user
        if not (user.is_staff or getattr(user, 'role', '') in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'No tienes permiso para realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        commission = self.get_object()
        if commission.status == SalesCommission.Status.PAID:
            return Response({'error': 'Esta comisión ya fue marcada como pagada.'}, status=status.HTTP_400_BAD_REQUEST)

        commission.status = SalesCommission.Status.PAID
        commission.save()

        serializer = self.get_serializer(commission)
        return Response(serializer.data, status=status.HTTP_200_OK)
