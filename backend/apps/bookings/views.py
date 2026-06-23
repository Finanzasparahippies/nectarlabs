from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from apps.tenants.permissions import HasAddOnPermission
from .models import BookingInquiry, BookingContract, BookingConfig
from .serializers import BookingInquirySerializer, BookingContractSerializer
from .utils import generate_booking_contract_pdf, send_booking_contract_emails

class BookingInquiryViewSet(viewsets.ModelViewSet):
    serializer_class = BookingInquirySerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    addon_slug = 'booking-signature'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return BookingInquiry.objects.none()
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return BookingInquiry.objects.all().order_by('-created_at')
        elif getattr(user, 'role', None) == 'BUSINESS':
            return BookingInquiry.objects.filter(tenant__owner=user).order_by('-created_at')
        elif getattr(user, 'role', None) == 'CUSTOMER' and user.tenant:
            return BookingInquiry.objects.filter(tenant=user.tenant, email=user.email).order_by('-created_at')
        return BookingInquiry.objects.none()

    def perform_create(self, serializer):
        # Resolve Tenant context
        tenant = None
        user = self.request.user
        if user and user.is_authenticated:
            if getattr(user, 'tenant', None):
                tenant = user.tenant
            elif getattr(user, 'role', None) == 'BUSINESS':
                tenant = user.owned_tenants.first()
        
        if not tenant:
            tenant_id = self.request.data.get('tenant_id') or self.request.query_params.get('tenant_id')
            subdomain = self.request.data.get('subdomain') or self.request.query_params.get('subdomain')
            from apps.tenants.models import Tenant
            if tenant_id:
                try:
                    tenant = Tenant.objects.filter(id=tenant_id, is_active=True).first()
                except Exception:
                    pass
            elif subdomain:
                tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()

        if not tenant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"tenant_id": "Se requiere especificar un tenant válido para esta consulta."})

        if tenant.is_in_trial:
            existing_inquiries = BookingInquiry.objects.filter(tenant=tenant).count()
            if existing_inquiries >= 10:
                from rest_framework import serializers as api_serializers
                raise api_serializers.ValidationError({
                    "detail": "El período de prueba está limitado a un máximo de 10 consultas de reserva. Por favor, actualiza tu plan para recibir más reservas."
                })

        inquiry = serializer.save(tenant=tenant)
        
        # Fetch dynamic configuration or fallback
        fee = 25000.00
        try:
            config, _ = BookingConfig.objects.get_or_create(tenant=tenant)
            fee = config.default_fee
        except Exception:
            pass

        # Automatically generate a booking contract proposal
        contract = BookingContract.objects.create(
            inquiry=inquiry,
            fee=fee
        )
        
        # Generate proposal PDF and send out emails
        if generate_booking_contract_pdf(contract):
            send_booking_contract_emails(contract)

class BookingContractViewSet(viewsets.ModelViewSet):
    serializer_class = BookingContractSerializer

    def get_permissions(self):
        if self.action in ['sign', 'retrieve']:
            return [permissions.AllowAny(), HasAddOnPermission()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    addon_slug = 'booking-signature'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            # For retrieve or sign of contract by unauthenticated users, we handle it but queryset needs to include all
            if self.action in ['retrieve', 'sign']:
                return BookingContract.objects.all().order_by('-created_at')
            return BookingContract.objects.none()
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return BookingContract.objects.all().order_by('-created_at')
        elif getattr(user, 'role', None) == 'BUSINESS':
            return BookingContract.objects.filter(inquiry__tenant__owner=user).order_by('-created_at')
        elif getattr(user, 'role', None) == 'CUSTOMER' and user.tenant:
            return BookingContract.objects.filter(inquiry__tenant=user.tenant, inquiry__email=user.email).order_by('-created_at')
        return BookingContract.objects.none()

    @action(detail=True, methods=['post'], url_path='sign')
    def sign(self, request, pk=None):
        contract = self.get_object()
        if contract.is_fully_signed:
            return Response({'error': 'Este contrato ya está completamente firmado'}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.data.get('signature')
        if not signature:
            return Response({'error': 'Firma del organizador requerida'}, status=status.HTTP_400_BAD_REQUEST)

        contract.signature_base64 = signature
        contract.signed_at = timezone.now()
        contract.save()

        # Update contract PDF with client signature and notify manager
        if generate_booking_contract_pdf(contract):
            send_booking_contract_emails(contract)
            return Response({'message': 'Contrato firmado por el organizador con éxito. Pendiente de firma de management.'})
        
        return Response({'error': 'Error al actualizar el PDF del contrato'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='manager_sign')
    def manager_sign(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated or not (user.is_staff or getattr(user, 'role', None) in ['ADMIN', 'BUSINESS']):
            return Response({'error': 'No tienes permisos para firmar como representante.'}, status=status.HTTP_403_FORBIDDEN)

        contract = self.get_object()
        if not contract.signature_base64:
            return Response({'error': 'El organizador debe firmar antes del representante'}, status=status.HTTP_400_BAD_REQUEST)
        
        signature = request.data.get('signature')
        if not signature:
            return Response({'error': 'Firma del representante requerida'}, status=status.HTTP_400_BAD_REQUEST)

        contract.manager_signature = signature
        contract.manager_signed_at = timezone.now()
        contract.is_fully_signed = True
        contract.save()

        # Generate FINAL certified PDF and email to both
        if generate_booking_contract_pdf(contract):
            send_booking_contract_emails(contract)
            return Response({'message': 'Contrato cerrado y certificado enviado con éxito.'})

        return Response({'error': 'Error al finalizar el contrato'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
