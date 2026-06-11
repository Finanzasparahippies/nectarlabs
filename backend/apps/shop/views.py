from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import stripe
from .models import Plan, Product, Contract, PaymentInstallment, AddOn, PromoCode, SalesCommission, AddOnSubscription
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer, PaymentInstallmentSerializer, AddOnSerializer, PromoCodeSerializer, SalesCommissionSerializer, AddOnSubscriptionSerializer
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
            
            discounts = []
            promo_code_str = request.data.get('promo_code', '').strip().upper()
            if promo_code_str:
                try:
                    promo = PromoCode.objects.get(code=promo_code_str)
                    if not promo.is_valid():
                        return Response({'error': 'Este código promocional ha expirado o no es válido.'}, status=status.HTTP_400_BAD_REQUEST)
                    stripe_coupon_id = get_or_create_stripe_coupon(promo)
                    if stripe_coupon_id:
                        discounts.append({'coupon': stripe_coupon_id})
                except PromoCode.DoesNotExist:
                    return Response({'error': 'Código promocional no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

            session_kwargs = {
                'payment_method_types': ['card'],
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'allow_promotion_codes': True,
                'subscription_data': {
                    'metadata': {
                        'user_id': request.user.id,
                        'addon_id': addon.id,
                        'type': 'addon_subscription',
                        'comments': comments_truncated
                    }
                },
                'success_url': f"{get_frontend_origin(request)}/dashboard?payment=success&addon_slug={addon.slug}",
                'cancel_url': f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                'metadata': {
                    'user_id': request.user.id,
                    'addon_id': addon.id,
                    'type': 'addon_subscription',
                    'comments': comments_truncated
                }
            }
            if discounts:
                session_kwargs['discounts'] = discounts

            session = stripe.checkout.Session.create(**session_kwargs)
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

class AddOnSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = AddOnSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role in ['ADMIN', 'BUSINESS']:
            return AddOnSubscription.objects.all().order_by('-created_at')
        return AddOnSubscription.objects.filter(user=user).order_by('-created_at')


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

def get_or_create_generic_stripe_product(name, description, metadata_key, metadata_val):
    if getattr(settings, "TESTING", False) or not getattr(settings, "STRIPE_SECRET_KEY", None):
        return "dummy_product_id"
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        product_id = None
        for p in stripe.Product.list(limit=100).auto_paging_iter():
            if p.active and p.metadata.get(metadata_key) == metadata_val:
                product_id = p.id
                break
        if product_id:
            return product_id
        else:
            prod = stripe.Product.create(
                name=name,
                description=description,
                metadata={metadata_key: metadata_val}
            )
            return prod.id
    except Exception as e:
        import logging
        logging.getLogger("apps").error(f"Error creating generic product {name}: {e}")
        return None

def get_or_create_stripe_coupon(promo):
    if getattr(settings, "TESTING", False) or not getattr(settings, "STRIPE_SECRET_KEY", None):
        return "dummy_coupon_id"
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    coupon_id = f"django_{promo.code.lower()}"
    try:
        return stripe.Coupon.retrieve(coupon_id).id
    except Exception:
        duration = "once" if promo.code_type == PromoCode.CodeType.SELLER else "forever"
        coupon = stripe.Coupon.create(
            id=coupon_id,
            percent_off=float(promo.discount_percentage),
            duration=duration,
            metadata={"promo_code": promo.code}
        )
        return coupon.id

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
            instance = serializer.save(
                receipt_file=self.request.data.get('receipt_file')
            )
        else:
            instance = serializer.save()

        # Si el estatus cambió a PAID y no tiene CFDI, y la facturación es AUTOMATIC, la emitimos.
        if instance.status == 'PAID' and not instance.cfdi_uuid:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(owner=instance.contract.user).first()
            if tenant and tenant.invoicing_mode == Tenant.InvoicingMode.AUTOMATIC:
                from apps.billing.services import issue_invoice_for_installment
                try:
                    issue_invoice_for_installment(instance)
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error al emitir CFDI automático en status update: {e}")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def checkout_session(self, request, pk=None):
        installment = self.get_object()
        
        # Validar que no esté ya pagada
        if installment.status == PaymentInstallment.Status.PAID:
            return Response({'error': 'Esta mensualidad ya ha sido pagada.'}, status=status.HTTP_400_BAD_REQUEST)
            
        wants_invoice = request.data.get('wants_invoice', False)
        
        # Calcular monto final agregando 16% IVA si eligen facturar
        from decimal import Decimal
        base_amount = Decimal(str(installment.amount))
        if wants_invoice:
            final_amount = (base_amount * Decimal('1.16')).quantize(Decimal('0.01'))
            product_name = f"Mensualidad {installment.installment_number}/6 (Con Factura) - Nectar Labs"
        else:
            final_amount = base_amount.quantize(Decimal('0.01'))
            product_name = f"Mensualidad {installment.installment_number}/6 - Nectar Labs"

        # Resolver ID de producto Stripe
        stripe_product_id = None
        if installment.installment_type == PaymentInstallment.InstallmentType.DESIGN:
            stripe_product_id = get_or_create_generic_stripe_product(
                "[Néctar Labs] Diseño de Marca",
                "Servicios de diseño de marca e identidad visual",
                "special_product",
                "brand_design"
            )
        else:
            plan = installment.contract.plan
            if plan:
                if not plan.stripe_product_id:
                    try:
                        plan.save()
                    except Exception:
                        pass
                stripe_product_id = plan.stripe_product_id
            
            if not stripe_product_id:
                stripe_product_id = get_or_create_generic_stripe_product(
                    "[Néctar Labs] Desarrollo Personalizado",
                    "Servicios de desarrollo de software a la medida",
                    "special_product",
                    "custom_development"
                )

        try:
            price_data = {
                'currency': 'mxn',
                'unit_amount': int(final_amount * 100),  # Stripe requiere centavos
            }
            if stripe_product_id and stripe_product_id != "dummy_product_id":
                price_data['product'] = stripe_product_id
            else:
                price_data['product_data'] = {
                    'name': product_name,
                    'description': f"Cliente: {installment.contract.full_name}",
                }

            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': price_data,
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{get_frontend_origin(request)}/dashboard?payment=success&installment_id={installment.id}",
                cancel_url=f"{get_frontend_origin(request)}/dashboard?payment=cancel",
                metadata={
                    'installment_id': installment.id,
                    'wants_invoice': 'true' if wants_invoice else 'false'
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
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            # Fallback for non-production environments to allow Stripe CLI forwarding
            if getattr(settings, 'ENVIRONMENT', 'local') != 'production':
                import json
                try:
                    event = json.loads(payload.decode('utf-8'))
                except (ValueError, UnicodeDecodeError):
                    return HttpResponse(status=400)
            else:
                return HttpResponse(status=400)
    else:
        import json
        try:
            event = json.loads(payload.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return HttpResponse(status=400)

    # Idempotency check
    from .models import StripeEvent
    event_id = event.get('id')
    if event_id:
        if StripeEvent.objects.filter(event_id=event_id).exists():
            return HttpResponse("Event already processed.", status=200)
        try:
            StripeEvent.objects.create(event_id=event_id)
        except Exception:
            return HttpResponse("Event processing already in progress.", status=200)

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
                
                # Generar factura CFDI automática si la preferencia del inquilino es AUTOMATIC o si solicitó facturar
                from apps.tenants.models import Tenant
                tenant = Tenant.objects.filter(owner=contract.user).first()
                wants_invoice = session.get('metadata', {}).get('wants_invoice') == 'true'
                if wants_invoice or (tenant and tenant.invoicing_mode == Tenant.InvoicingMode.AUTOMATIC):
                    from apps.billing.services import issue_invoice_for_installment
                    try:
                        issue_invoice_for_installment(installment)
                    except Exception as cfdi_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error en facturación automática Stripe Webhook: {cfdi_err}", exc_info=True)
                
                # Enviar correo de confirmación de pago (solo si no se facturó automáticamente para evitar duplicidad)
                if not installment.cfdi_uuid:
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
                import logging as _logging
                _webhook_logger = _logging.getLogger(__name__)
                contract = None
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
                    
                    # --- CREATE OR UPDATE AddOnSubscription ---
                    try:
                        from apps.tenants.models import Tenant
                        addon = AddOn.objects.get(id=addon_id)
                        tenant = Tenant.objects.filter(owner=contract.user).first()
                        subscription_id = session.get('subscription')
                        billing_cycle = session.get('metadata', {}).get('billing_cycle', 'monthly')
                        
                        price = addon.yearly_price if billing_cycle == 'yearly' else addon.monthly_price

                        AddOnSubscription.objects.update_or_create(
                            user=user,
                            addon=addon,
                            defaults={
                                'tenant': tenant,
                                'stripe_subscription_id': subscription_id,
                                'status': 'active',
                                'billing_cycle': billing_cycle,
                                'price_paid': price
                            }
                        )
                    except Exception as sub_err:
                        _webhook_logger.error(f"[stripe_webhook] Error creating/updating AddOnSubscription in webhook: {sub_err}", exc_info=True)
                except Exception as core_err:
                    _webhook_logger.error(
                        f"[stripe_webhook] addon_subscription: error in core activation for user={user_id} addon={addon_id}: {core_err}",
                        exc_info=True
                    )

                # --- AUTO-CREATE TENANT ---
                try:
                    from apps.tenants.models import Tenant
                    from django.utils.text import slugify
                    if contract:
                        tenant = Tenant.objects.filter(owner=contract.user).first()
                        if not tenant:
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
                                is_active=True
                            )
                        else:
                            if not tenant.is_active:
                                tenant.is_active = True
                                tenant.save()
                        
                        # Sync it back to the newly created/activated tenant in AddOnSubscription
                        try:
                            addon = AddOn.objects.get(id=addon_id)
                            AddOnSubscription.objects.filter(user=user, addon=addon).update(tenant=tenant)
                        except Exception:
                            pass
                except Exception as tenant_err:
                    _webhook_logger.error(f"Error creating/activating tenant on addon subscription: {tenant_err}", exc_info=True)

                # Enviar correo de confirmación de pago del Add-on (facturación)
                try:
                    if contract:
                        addon = AddOn.objects.get(id=addon_id)
                        send_addon_payment_receipt_email(contract.user, addon, session)
                except Exception as mail_err:
                    _webhook_logger.error(f"Error sending addon subscription payment receipt email: {mail_err}", exc_info=True)
                
                # --- AUTO-CREATE IMPLEMENTATION TICKET ---
                try:
                    if contract:
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
                    _webhook_logger.error(f"Error creating ticket on webhook: {ticket_err}", exc_info=True)

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

        # Caso 4: Compra de paquete de timbres
        elif session.get('metadata', {}).get('type') == 'stamp_package':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            stamps_count = session.get('metadata', {}).get('stamps_count')
            if tenant_id and stamps_count:
                try:
                    from apps.tenants.models import Tenant
                    tenant = Tenant.objects.get(id=tenant_id)
                    tenant.stamp_balance = (tenant.stamp_balance or 0) + int(stamps_count)
                    tenant.save()
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error updating stamp balance in webhook: {e}", exc_info=True)

        # Caso 5: Compra en la Tienda del Inquilino (Shop Purchase)
        elif session.get('metadata', {}).get('type') == 'shop_purchase':
            order_id = session.get('metadata', {}).get('order_id')
            if order_id:
                try:
                    from django.db import transaction
                    from .models import Order, Product
                    with transaction.atomic():
                        order = Order.objects.select_for_update().get(id=order_id)
                        if order.status == Order.Status.PENDING:
                            order.status = Order.Status.PAID
                            order.stripe_payment_intent = session.get('payment_intent')
                            order.stripe_session_id = session.get('id')
                            order.save()
                            
                            # Decrementar stock
                            for item in order.items.all():
                                product = Product.objects.select_for_update().get(id=item.product.id)
                                product.stock = max(0, product.stock - item.quantity)
                                product.save()
                                
                            from .shipping import generate_shipping_label
                            from .utils import send_order_confirmation_email
                            
                            def process_fulfillment(order_obj):
                                generate_shipping_label(order_obj)
                                send_order_confirmation_email(order_obj)
                                
                            transaction.on_commit(lambda: process_fulfillment(order))
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error processing shop purchase webhook: {e}", exc_info=True)

        # Caso 6: Compra de paquete de correos masivos (Email Credits)
        elif session.get('metadata', {}).get('type') == 'email_credits_package':
            tenant_id = session.get('metadata', {}).get('tenant_id')
            credits_count = session.get('metadata', {}).get('credits_count')
            if tenant_id and credits_count:
                try:
                    from apps.tenants.models import Tenant
                    tenant = Tenant.objects.get(id=tenant_id)
                    tenant.newsletter_extra_credits = (tenant.newsletter_extra_credits or 0) + int(credits_count)
                    tenant.save()
                except Exception as e:
                    import logging
                    logging.getLogger("apps").error(f"Error updating newsletter email credits in webhook: {e}", exc_info=True)

    # Procesar cancelación de suscripción
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        subscription_id = subscription.get('id')
        metadata = subscription.get('metadata', {})
        user_id = metadata.get('user_id')
        addon_id = metadata.get('addon_id')
        
        try:
            addon_sub = None
            if subscription_id:
                addon_sub = AddOnSubscription.objects.filter(stripe_subscription_id=subscription_id).first()
            if not addon_sub and user_id and addon_id:
                addon_sub = AddOnSubscription.objects.filter(user_id=user_id, addon_id=addon_id).first()
            
            if addon_sub:
                addon_sub.status = 'canceled'
                addon_sub.save()
                
                # Buscar el contrato activo del usuario y remover el add-on
                contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
                if contract:
                    contract.addons.remove(addon_sub.addon)
            elif user_id and addon_id:
                # Fallback anterior
                contract = Contract.objects.filter(user_id=user_id, is_active=True).first()
                if contract:
                    contract.addons.remove(addon_id)
        except Exception as del_err:
            import logging
            logging.getLogger("apps").error(f"Error handling customer.subscription.deleted: {del_err}", exc_info=True)

    # Procesar actualización de suscripción (ej. pagos fallidos o exitosos cambiantes)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        subscription_id = subscription.get('id')
        stripe_status = subscription.get('status') # active, past_due, trialing, incomplete, etc.
        metadata = subscription.get('metadata', {})
        user_id = metadata.get('user_id')
        addon_id = metadata.get('addon_id')
        
        try:
            addon_sub = None
            if subscription_id:
                addon_sub = AddOnSubscription.objects.filter(stripe_subscription_id=subscription_id).first()
            if not addon_sub and user_id and addon_id:
                addon_sub = AddOnSubscription.objects.filter(user_id=user_id, addon_id=addon_id).first()
                
            if addon_sub:
                addon_sub.status = stripe_status
                addon_sub.save()
                
                # Sincronizar el add-on en el contrato activo
                contract = Contract.objects.filter(user=addon_sub.user, is_active=True).first()
                if contract:
                    if stripe_status in ['active', 'trialing']:
                        contract.addons.add(addon_sub.addon)
                    else:
                        contract.addons.remove(addon_sub.addon)
        except Exception as upd_err:
            import logging
            logging.getLogger("apps").error(f"Error handling customer.subscription.updated: {upd_err}", exc_info=True)

    # Acreditación de timbres en renovación/primer pago de suscripción mensual
    elif event['type'] == 'invoice.payment_succeeded':
        invoice_obj = event['data']['object']
        subscription_id = invoice_obj.get('subscription')
        if subscription_id:
            try:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                
                subscription = stripe.Subscription.retrieve(subscription_id)
                metadata = subscription.get('metadata', {})
                if metadata.get('type') == 'addon_subscription':
                    user_id = metadata.get('user_id')
                    addon_id = metadata.get('addon_id')
                    if user_id and addon_id:
                        from django.contrib.auth import get_user_model
                        from apps.tenants.models import Tenant

                        User = get_user_model()
                        user = User.objects.get(id=user_id)
                        addon = AddOn.objects.get(id=addon_id)
                        
                        if addon.slug in ['mexico-invoicing', 'ecommerce-combo']:
                            # Encontrar o crear Tenant
                            tenant = Tenant.objects.filter(owner=user).first()
                            if not tenant:
                                from django.utils.text import slugify
                                contract = Contract.objects.filter(user=user, is_active=True).first()
                                full_name = contract.full_name if contract else (user.get_full_name() or user.username)
                                base_subdomain = slugify(full_name) or f"client-{user.id}"
                                subdomain = base_subdomain
                                counter = 1
                                while Tenant.objects.filter(subdomain=subdomain).exists():
                                    subdomain = f"{base_subdomain}-{counter}"
                                    counter += 1
                                tenant = Tenant.objects.create(
                                    owner=user,
                                    name=f"Portal de {full_name}",
                                    subdomain=subdomain,
                                    is_active=True
                                )
                            
                            tenant.stamp_balance = (tenant.stamp_balance or 0) + 20
                            tenant.save()

                        # --- BUCLE INVERTIDO: Autofacturar la suscripción del inquilino ---
                        try:
                            from apps.billing.models import TaxProfile, Invoice
                            from apps.billing.services import get_pac_service, PACError, LCOSyncError
                            from decimal import Decimal
                            
                            tenant = Tenant.objects.filter(owner=user).first()
                            if tenant and hasattr(tenant, 'tax_profile') and tenant.tax_profile.facturapi_organization_id:
                                profile = tenant.tax_profile
                                
                                # Monto pagado en pesos (amount_paid está en centavos)
                                amount_paid = Decimal(str(invoice_obj.get('amount_paid', 0))) / Decimal('100.00')
                                if amount_paid > 0:
                                    # El total pagado ya incluye IVA del 16%, base = total / 1.16
                                    price_base = (amount_paid / Decimal('1.16')).quantize(Decimal('0.01'))
                                    invoice_total = amount_paid.quantize(Decimal('0.01'))
                                    
                                    # Crear registro de factura
                                    invoice = Invoice.objects.create(
                                        tenant=tenant,
                                        stripe_invoice_id=invoice_obj.get('id') or invoice_obj.get('charge'),
                                        total=invoice_total,
                                        status=Invoice.Status.PENDING
                                    )
                                    
                                    # La autofacturación consume un timbre del inquilino (Parent-to-Tenant)
                                    if not tenant.has_available_stamps():
                                        invoice.status = Invoice.Status.FAILED
                                        invoice.error_message = "No tienes timbres suficientes para autofacturación."
                                        invoice.save()
                                    else:
                                        customer_info = {
                                            "razon_social": user.get_full_name() or user.username,
                                            "rfc": profile.rfc,
                                            "regimen_fiscal": profile.regimen_fiscal,
                                            "codigo_postal": profile.codigo_postal,
                                            "email": user.email
                                        }
                                        items = [{
                                            "quantity": 1,
                                            "unit_price": float(price_base),
                                            "description": f"Suscripción Mensual Add-on: {addon.name} ({tenant.name})"
                                        }]
                                        
                                        pac = get_pac_service()
                                        try:
                                            res = pac.create_invoice(invoice, profile, customer_info, items, is_parent_to_tenant=True)
                                            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
                                            invoice.uuid_sat = res["uuid_sat"]
                                            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
                                            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
                                            invoice.status = Invoice.Status.PAID
                                            invoice.error_message = None
                                            invoice.save()
                                            
                                            tenant.consume_stamp()
                                            
                                            # Enviar factura por correo electrónico
                                            from .utils import send_autofactura_email
                                            send_autofactura_email(user, invoice)
                                        except LCOSyncError as e:
                                            invoice.status = Invoice.Status.LCO_SYNC_PENDING
                                            invoice.error_message = str(e)
                                            invoice.save()
                                            tenant.consume_stamp()
                                        except PACError as e:
                                            invoice.status = Invoice.Status.FAILED
                                            invoice.error_message = str(e)
                                            invoice.save()
                        except Exception as auto_inv_err:
                            import logging
                            logging.getLogger("apps").error(f"Error en bucle invertido de facturación: {auto_inv_err}", exc_info=True)
            except Exception as e:
                import logging
                logging.getLogger("apps").error(f"Error handling invoice.payment_succeeded webhook: {e}", exc_info=True)

    return HttpResponse(status=200)


@csrf_exempt
def facturapi_webhook(request):
    import json
    import hmac
    import hashlib
    import logging
    import requests
    from django.http import HttpResponse
    from django.db import transaction
    from django.core.files.base import ContentFile
    from django.conf import settings
    from apps.billing.models import Invoice, TaxProfile
    from apps.shop.models import PaymentInstallment
    from decimal import Decimal

    logger = logging.getLogger("apps")

    if request.method != 'POST':
        return HttpResponse("Only POST requests allowed", status=405)

    signature = request.headers.get('Facturapi-Signature')
    payload_body = request.body

    # Verify signature if secret is configured
    webhook_secret = getattr(settings, 'FACTURAPI_WEBHOOK_SECRET', '')
    if webhook_secret:
        if not signature:
            logger.warning("[facturapi_webhook] Missing Facturapi-Signature header.")
            return HttpResponse("Missing signature", status=400)
        
        secret = bytes(webhook_secret, 'utf-8')
        digest = hmac.new(secret, msg=payload_body, digestmod=hashlib.sha256)
        calculated = digest.hexdigest()
        
        if not hmac.compare_digest(calculated, signature):
            logger.warning("[facturapi_webhook] Signature verification failed.")
            return HttpResponse("Invalid signature", status=401)

    try:
        payload = json.loads(payload_body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError) as e:
        logger.error(f"[facturapi_webhook] JSON parse error: {e}")
        return HttpResponse("Invalid JSON", status=400)

    event_type = payload.get('type')
    event_data = payload.get('data', {}).get('object', {})
    facturapi_invoice_id = event_data.get('id')

    if not event_type or not facturapi_invoice_id:
        return HttpResponse("Missing event metadata", status=400)

    logger.info(f"[facturapi_webhook] Received event {event_type} for invoice {facturapi_invoice_id}")

    if event_type == 'invoice.created':
        uuid_sat = event_data.get('uuid')
        
        # Look up the invoice first (without blocking transaction) to see if we can fetch/create it
        invoice = Invoice.objects.filter(facturapi_invoice_id=facturapi_invoice_id).first()
        
        # Handle creating invoice if created directly on Facturapi
        if not invoice:
            organization_id = payload.get('organization')
            if organization_id:
                profile = TaxProfile.objects.filter(facturapi_organization_id=organization_id).first()
                if profile:
                    try:
                        invoice = Invoice.objects.create(
                            tenant=profile.tenant,
                            facturapi_invoice_id=facturapi_invoice_id,
                            total=Decimal(str(event_data.get('total', 0))),
                            status=Invoice.Status.PENDING,
                            is_tenant_to_customer=True
                        )
                        logger.info(f"[facturapi_webhook] Created local invoice for external Facturapi invoice {facturapi_invoice_id}")
                    except Exception as create_err:
                        logger.error(f"[facturapi_webhook] Error creating local invoice record: {create_err}")

        xml_file = None
        pdf_file = None

        if invoice and (not invoice.xml_file or not invoice.pdf_file):
            try:
                headers = {
                    "Authorization": f"Bearer {settings.PAC_API_KEY}",
                    "Content-Type": "application/json"
                }
                if invoice.is_tenant_to_customer:
                    tax_profile = getattr(invoice.tenant, 'tax_profile', None)
                    if tax_profile and tax_profile.facturapi_organization_id:
                        headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id
                
                base_url = "https://www.facturapi.io/v2/invoices"
                xml_resp = requests.get(f"{base_url}/{facturapi_invoice_id}/xml", headers=headers, timeout=10)
                pdf_resp = requests.get(f"{base_url}/{facturapi_invoice_id}/pdf", headers=headers, timeout=10)
                
                if xml_resp.status_code == 200:
                    xml_file = ContentFile(xml_resp.content, name=f"{uuid_sat}.xml")
                if pdf_resp.status_code == 200:
                    pdf_file = ContentFile(pdf_resp.content, name=f"{uuid_sat}.pdf")
            except Exception as file_err:
                logger.error(f"[facturapi_webhook] Error downloading invoice files: {file_err}")

        if invoice:
            with transaction.atomic():
                # Lock the invoice
                invoice = Invoice.objects.select_for_update().filter(id=invoice.id).first()
                if invoice and invoice.status != Invoice.Status.PAID:
                    # Check if we should decrement stamp balance (if not already decremented)
                    if invoice.status in [Invoice.Status.PENDING, Invoice.Status.FAILED]:
                        tenant = invoice.tenant
                        tenant.stamp_balance = max(0, tenant.stamp_balance - 1)
                        tenant.save()
                    
                    invoice.status = Invoice.Status.PAID
                    invoice.uuid_sat = uuid_sat
                    invoice.error_message = None
                    if xml_file:
                        invoice.xml_file.save(xml_file.name, xml_file, save=False)
                    if pdf_file:
                        invoice.pdf_file.save(pdf_file.name, pdf_file, save=False)
                    invoice.save()
                    logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as PAID")
                    
                    # If this is parent-to-tenant invoice, link to PaymentInstallment and send confirmation email
                    if not invoice.is_tenant_to_customer:
                        inst = PaymentInstallment.objects.filter(stripe_invoice_id=invoice.stripe_invoice_id).first()
                        if inst:
                            inst.cfdi_uuid = str(uuid_sat)
                            inst.save(update_fields=['cfdi_uuid'])
                            try:
                                from apps.shop.utils import send_payment_receipt_email
                                send_payment_receipt_email(inst)
                            except Exception as mail_err:
                                logger.error(f"[facturapi_webhook] Error sending payment receipt email: {mail_err}")

    elif event_type == 'invoice.cancelled':
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().filter(facturapi_invoice_id=facturapi_invoice_id).first()
            if invoice and invoice.status != Invoice.Status.CANCELLED:
                invoice.status = Invoice.Status.CANCELLED
                invoice.save(update_fields=['status'])
                logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as CANCELLED")

    elif event_type == 'invoice.failed':
        message = event_data.get('message') or event_data.get('error', {}).get('message') or "Unknown error"
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().filter(facturapi_invoice_id=facturapi_invoice_id).first()
            if invoice and invoice.status != Invoice.Status.FAILED:
                invoice.status = Invoice.Status.FAILED
                invoice.error_message = message
                invoice.save(update_fields=['status', 'error_message'])
                logger.info(f"[facturapi_webhook] Marked invoice {facturapi_invoice_id} as FAILED: {message}")

    return HttpResponse("OK", status=200)


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


from rest_framework.views import APIView
from django.db import transaction
from decimal import Decimal
from apps.tenants.models import Tenant
from .models import Order, OrderItem
from .shipping import get_shipping_rates

class GetShippingRatesView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        tenant_id = request.data.get('tenant_id')
        subdomain = request.data.get('subdomain')
        tenant = None
        
        if tenant_id:
            tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
        elif subdomain:
            tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido."}, status=status.HTTP_400_BAD_REQUEST)

        destination = request.data.get('destination')
        if not destination or not (destination.get('zip_code') or destination.get('postal_code')):
            return Response({"error": "La dirección de destino con código postal es obligatoria."}, status=status.HTTP_400_BAD_REQUEST)

        if not destination.get('zip_code') and destination.get('postal_code'):
            destination['zip_code'] = destination['postal_code']

        parcel = request.data.get('parcel')
        rates = get_shipping_rates(destination, parcel=parcel, tenant=tenant)
        return Response({"rates": rates}, status=status.HTTP_200_OK)


class ShopCheckoutView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        data = request.data
        tenant_id = data.get('tenant_id')
        subdomain = data.get('subdomain')
        
        tenant = None
        if tenant_id:
            tenant = Tenant.objects.select_for_update().filter(id=tenant_id, is_active=True).first()
        elif subdomain:
            tenant = Tenant.objects.select_for_update().filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            return Response({"error": "No se pudo identificar un inquilino (tenant) válido."}, status=status.HTTP_400_BAD_REQUEST)

        email = data.get('email')
        full_name = data.get('full_name')
        phone = data.get('phone', '')
        street_and_number = data.get('street_and_number')
        suburb = data.get('suburb')
        city = data.get('city')
        state = data.get('state')
        postal_code = data.get('postal_code')
        country = data.get('country', 'MX')
        items_data = data.get('items', [])
        
        skydropx_rate_id = data.get('skydropx_rate_id')
        shipping_cost = data.get('shipping_cost')
        shipping_cost_base = data.get('shipping_cost_base')
        shipping_provider = data.get('shipping_provider', 'FedEx')

        if not all([email, full_name, street_and_number, suburb, city, state, postal_code, items_data]):
            return Response({"error": "Todos los campos de entrega e ítems son requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        if skydropx_rate_id is None or shipping_cost is None:
            return Response({"error": "Debes seleccionar una tarifa de envío válida."}, status=status.HTTP_400_BAD_REQUEST)

        total_products_amount = Decimal('0.00')
        order_items_to_prepare = []
        line_items = []

        for item in items_data:
            prod_id = item.get('product_id')
            qty = int(item.get('quantity', 1))

            try:
                product = Product.objects.select_for_update().get(id=prod_id, tenant=tenant)
            except Product.DoesNotExist:
                return Response({"error": f"Producto con ID {prod_id} no encontrado en este catálogo."}, status=status.HTTP_404_NOT_FOUND)

            if product.stock < qty:
                return Response({"error": f"Stock insuficiente para {product.name}."}, status=status.HTTP_400_BAD_REQUEST)

            total_products_amount += product.price * qty
            order_items_to_prepare.append({'product': product, 'quantity': qty, 'price': product.price})

            price_id = product.stripe_price_id
            if not price_id or not price_id.startswith('price_'):
                line_items.append({
                    'price_data': {
                        'currency': 'mxn',
                        'product_data': {
                            'name': product.name,
                            'description': product.description,
                        },
                        'unit_amount': int(product.price * 100),
                    },
                    'quantity': qty,
                })
            else:
                line_items.append({
                    'price': price_id,
                    'quantity': qty,
                })

        line_items.append({
            'price_data': {
                'currency': 'mxn',
                'product_data': {
                    'name': f"Envío ({shipping_provider})",
                },
                'unit_amount': int(Decimal(str(shipping_cost)) * 100),
            },
            'quantity': 1,
        })

        total_order_amount = total_products_amount + Decimal(str(shipping_cost))
        order = Order.objects.create(
            tenant=tenant,
            user=request.user if request.user.is_authenticated else None,
            user_email=email,
            total=total_order_amount,
            status=Order.Status.PENDING,
            full_name=full_name,
            phone=phone,
            street_and_number=street_and_number,
            suburb=suburb,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            shipping_provider=shipping_provider,
            shipping_cost=Decimal(str(shipping_cost)),
            shipping_cost_base=Decimal(str(shipping_cost_base or shipping_cost)),
            skydropx_rate_id=skydropx_rate_id
        )

        for item_data in order_items_to_prepare:
            OrderItem.objects.create(
                order=order,
                product=item_data['product'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )

        frontend_url = settings.FRONTEND_URL
        if tenant.custom_domain:
            base_url = tenant.custom_domain if tenant.custom_domain.startswith(('http://', 'https://')) else f"https://{tenant.custom_domain}"
        else:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(frontend_url)
            if parsed.netloc:
                netloc = f"{tenant.subdomain}.{parsed.netloc}"
                base_url = urlunparse(parsed._replace(netloc=netloc))
            else:
                base_url = f"https://{tenant.subdomain}.nectarlabs.dev"

        success_url = f"{base_url}/shop/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base_url}/shop/cart"

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=email,
                metadata={
                    'order_id': str(order.id),
                    'type': 'shop_purchase'
                }
            )
            
            return Response({
                "checkout_url": checkout_session.url,
                "order_id": order.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import logging
            logging.getLogger("apps").error(f"Error creating Stripe Session for shop checkout: {e}", exc_info=True)
            return Response({"error": "No se pudo procesar la pasarela de pago."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
