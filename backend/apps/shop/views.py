from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Plan, Product, Contract
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer
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
            print(f"ERROR: {e}")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def dev_sign(self, request, pk=None):
        contract = self.get_object()
        signature = request.data.get('signature')
        
        if not signature:
            return Response({'error': 'Firma del desarrollador requerida'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Registrar firma del socio tecnológico
        contract.developer_signature = signature
        contract.developer_signed_at = timezone.now()
        contract.is_fully_signed = True
        contract.save()
        
        # Regenerar PDF FINAL y enviar copias certificadas
        try:
            if generate_contract_pdf(contract):
                send_contract_emails(contract)
                return Response({'message': 'Contrato cerrado y enviado con éxito'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'error': 'Error al procesar el cierre'}, status=status.HTTP_400_BAD_REQUEST)
