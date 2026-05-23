from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import stripe
from .models import Plan, Product, Contract, PaymentInstallment, AddOn
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer, PaymentInstallmentSerializer, AddOnSerializer
from .utils import generate_contract_pdf, send_contract_emails

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

        # Generar automáticamente 6 mensualidades obligatorias (solo si hay plan contratado)
        if contract.plan:
            plan_price = contract.plan.price
            monthly_amount = plan_price + (contract.brand_design_price or 0)
            start_date = contract.signed_at.date() if contract.signed_at else timezone.now().date()
            
            # Eliminar mensualidades previas si existían por re-firma para evitar duplicados
            contract.installments.all().delete()
            
            installments_to_create = []
            for i in range(1, 7):
                due_date = start_date + timedelta(days=30 * (i - 1))
                installments_to_create.append(
                    PaymentInstallment(
                        contract=contract,
                        installment_number=i,
                        due_date=due_date,
                        amount=monthly_amount,
                        status=PaymentInstallment.Status.PENDING,
                        payment_method=contract.payment_commitment_method
                    )
                )
            PaymentInstallment.objects.bulk_create(installments_to_create)
        else:
            # Si no hay plan (adquisición individual de add-ons), no generamos las 6 mensualidades fijas.
            # En su lugar, el cliente se suscribirá de forma recurrente en Stripe.
            pass
        
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

class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Auto-healer: generate missing installments for already signed contracts (only if they have a plan)
        for contract in Contract.objects.filter(is_fully_signed=True, plan__isnull=False):
            if contract.installments.count() == 0:
                plan_price = contract.plan.price
                monthly_amount = plan_price + (contract.brand_design_price or 0)
                start_date = contract.signed_at.date() if contract.signed_at else timezone.now().date()
                
                installments_to_create = []
                for i in range(1, 7):
                    due_date = start_date + timedelta(days=30 * (i - 1))
                    installments_to_create.append(
                        PaymentInstallment(
                            contract=contract,
                            installment_number=i,
                            due_date=due_date,
                            amount=monthly_amount,
                            status=PaymentInstallment.Status.PENDING,
                            payment_method=contract.payment_commitment_method
                        )
                    )
                PaymentInstallment.objects.bulk_create(installments_to_create)

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
            except PaymentInstallment.DoesNotExist:
                pass

        # Caso 2: Suscripción a un Add-on individual
        elif session.get('metadata', {}).get('type') == 'addon_subscription':
            user_id = session.get('metadata', {}).get('user_id')
            addon_id = session.get('metadata', {}).get('addon_id')
            comments = session.get('metadata', {}).get('comments', '')
            if user_id and addon_id:
                try:
                    # Buscar el contrato activo del usuario para agregarle el addon
                    contract = Contract.objects.filter(user_id=user_id, is_active=True).first()
                    if not contract:
                        # Si no tiene contrato activo, crear uno básico
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        user = User.objects.get(id=user_id)
                        contract = Contract.objects.create(
                            user=user,
                            full_name=user.get_full_name() or user.username,
                            is_fully_signed=True,
                            payment_commitment_method='STRIPE'
                        )
                    contract.addons.add(addon_id)
                    
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
                            tenant=contract.user.tenant,
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
