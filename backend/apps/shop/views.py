from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Plan, Product, Contract, PaymentInstallment
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer, PaymentInstallmentSerializer
from .utils import generate_contract_pdf, send_contract_emails

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

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

        # Generar automáticamente 6 mensualidades obligatorias
        plan_price = contract.plan.price if contract.plan else 0
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
        
        # --- AUTO-CREATE PROJECT ---
        try:
            from apps.dashboard.models import Project
            if not Project.objects.filter(client=contract.user).exists():
                Project.objects.create(
                    client=contract.user,
                    plan=contract.plan,
                    name=f"Ecosistema - {contract.full_name}",
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
        # Auto-healer: generate missing installments for already signed contracts
        for contract in Contract.objects.filter(is_fully_signed=True):
            if contract.installments.count() == 0:
                plan_price = contract.plan.price if contract.plan else 0
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
