from rest_framework import viewsets, permissions
from .models import Plan, Product, Contract
from .serializers import PlanSerializer, ProductSerializer, ContractSerializer

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer
    permission_classes = [permissions.AllowAny]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Contract.objects.all()
        return Contract.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Obtener IP
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
            
        contract = serializer.save(
            user=self.request.user,
            ip_address=ip
        )
        
        # Generar PDF y Enviar correos
        from .utils import generate_contract_pdf, send_contract_emails
        if generate_contract_pdf(contract):
            send_contract_emails(contract)


