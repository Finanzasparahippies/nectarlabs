from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from apps.tenants.permissions import HasAddOnPermission
from .models import BookingInquiry, BookingContract, BookingConfig, CustomContractTemplate, CustomContract, CustomContractSignatory
from .serializers import (
    BookingInquirySerializer, 
    BookingContractSerializer, 
    CustomContractTemplateSerializer, 
    CustomContractSerializer, 
    CustomContractSignatorySerializer
)
from .utils import (
    generate_booking_contract_pdf, 
    send_booking_contract_emails, 
    generate_custom_contract_pdf, 
    send_custom_contract_emails
)

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
            send_booking_contract_emails(contract, request=self.request)

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
            send_booking_contract_emails(contract, request=request)
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
            send_booking_contract_emails(contract, request=request)
            return Response({'message': 'Contrato cerrado y certificado enviado con éxito.'})

        return Response({'error': 'Error al finalizar el contrato'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomContractTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = CustomContractTemplateSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    addon_slug = 'booking-signature'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CustomContractTemplate.objects.none()
        
        # El CEO (ADMIN o staff) puede ver todo, incluyendo plantillas globales
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return CustomContractTemplate.objects.all().order_by('-created_at')
        
        # El dueño del Tenant solo puede ver las globales (tenant=None) y las de su propia colmena
        if getattr(user, 'role', None) == 'BUSINESS':
            owned_tenants = user.owned_tenants.all()
            return CustomContractTemplate.objects.filter(
                models.Q(tenant__in=owned_tenants) | models.Q(tenant__isnull=True)
            ).order_by('-created_at')
            
        return CustomContractTemplate.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        # Si es BUSINESS, forzamos el tenant a su propiedad
        if getattr(user, 'role', None) == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if not tenant:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"detail": "No se encontró una colmena asociada a tu cuenta empresarial."})
            serializer.save(tenant=tenant)
        else:
            # CEO puede elegir si es global o asociarlo a un tenant específico
            serializer.save()

    def perform_update(self, serializer):
        # Impedimos que usuarios sin tenant o dueños de colmenas editen plantillas globales (tenant=None)
        instance = self.get_object()
        user = self.request.user
        if not (user.is_staff or getattr(user, 'role', None) == 'ADMIN'):
            if instance.tenant is None:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes permisos para modificar plantillas globales de Néctar Labs.")
            
            # Verificar propiedad
            if not user.owned_tenants.filter(id=instance.tenant.id).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes permisos para modificar esta plantilla.")
        
        serializer.save()


class CustomContractViewSet(viewsets.ModelViewSet):
    serializer_class = CustomContractSerializer

    def get_permissions(self):
        # Permitir a firmantes obtener y firmar contratos usando su token público
        if self.action in ['by_token', 'sign_by_token']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), HasAddOnPermission()]

    addon_slug = 'booking-signature'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CustomContract.objects.none()
        
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            return CustomContract.objects.all().order_by('-created_at')
            
        if getattr(user, 'role', None) == 'BUSINESS':
            owned_tenants = user.owned_tenants.all()
            return CustomContract.objects.filter(tenant__in=owned_tenants).order_by('-created_at')
            
        return CustomContract.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        tenant = None
        if getattr(user, 'role', None) == 'BUSINESS':
            tenant = user.owned_tenants.first()
            if not tenant:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"detail": "No se encontró una colmena asociada a tu cuenta."})
        
        # Guardamos el contrato
        contract = serializer.save(tenant=tenant)
        
        # Si se subió un PDF, lo copiamos inicialmente a pdf_file de manera limpia
        if contract.uploaded_pdf:
            import os
            from django.core.files.base import ContentFile
            try:
                contract.uploaded_pdf.seek(0)
                orig_pdf_bytes = contract.uploaded_pdf.read()
                filename = os.path.basename(contract.uploaded_pdf.name)
                contract.pdf_file.save(filename, ContentFile(orig_pdf_bytes), save=False)
                contract.save(update_fields=['pdf_file'])
            except Exception as e:
                logger.error(f"Error copying uploaded_pdf to pdf_file on create: {e}", exc_info=True)
        else:
            # Generar primer PDF (sin firmas) desde texto
            generate_custom_contract_pdf(contract)
        
        # Enviar correos de invitación a TODOS los firmantes al mismo tiempo (firma en paralelo)
        for sig in contract.signatories.all():
            send_custom_contract_emails(contract, signatory_to_notify=sig, request=self.request)

    @action(detail=False, methods=['get'], url_path='by_token')
    def by_token(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Token requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            signatory = CustomContractSignatory.objects.get(token=token)
        except (CustomContractSignatory.DoesNotExist, ValueError):
            return Response({'error': 'Enlace de firma no válido o expirado'}, status=status.HTTP_404_NOT_FOUND)
        
        contract = signatory.contract
        serializer = self.get_serializer(contract)
        
        # Añadimos datos del firmante actual para el frontend
        data = serializer.data
        data['current_signatory'] = {
            'id': str(signatory.id),
            'name': signatory.name,
            'email': signatory.email,
            'role': signatory.role,
            'has_signed': bool(signatory.signature_base64),
            'sig_page': signatory.sig_page,
            'sig_x': signatory.sig_x,
            'sig_y': signatory.sig_y,
            'sig_w': signatory.sig_w,
            'sig_h': signatory.sig_h,
        }
        return Response(data)

    @action(detail=False, methods=['post'], url_path='sign_by_token')
    def sign_by_token(self, request):
        token = request.data.get('token')
        signature = request.data.get('signature')
        
        if not token or not signature:
            return Response({'error': 'Token y Firma (base64) son campos obligatorios'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            signatory = CustomContractSignatory.objects.get(token=token)
        except (CustomContractSignatory.DoesNotExist, ValueError):
            return Response({'error': 'Enlace de firma no válido'}, status=status.HTTP_404_NOT_FOUND)
            
        if signatory.signature_base64:
            return Response({'error': 'Ya has firmado este contrato anteriormente'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Registrar firma
        signatory.signature_base64 = signature
        signatory.signed_at = timezone.now()
        
        # Guardar IP del firmante
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        signatory.ip_address = ip
        signatory.save()
        
        contract = signatory.contract
        
        # Validar si faltan firmantes por firmar
        pending_signatories = contract.signatories.filter(signature_base64__isnull=True)
        if not pending_signatories.exists():
            contract.is_fully_signed = True
            contract.save()
            
            # Generar PDF final y notificar a todos los firmantes
            if generate_custom_contract_pdf(contract):
                send_custom_contract_emails(contract, request=request)
        else:
            # Generar PDF parcial con las firmas recopiladas hasta ahora
            generate_custom_contract_pdf(contract)
                
        return Response({'message': 'Contrato firmado con éxito. Copia guardada.'})

    @action(detail=True, methods=['post'], url_path='resend-email')
    def resend_email(self, request, pk=None):
        contract = self.get_object()
        if contract.is_fully_signed:
            send_custom_contract_emails(contract, request=request)
            return Response({'message': 'Contrato completamente firmado. Copia certificada reenviada a todos los firmantes.'})
        
        pending_signatories = contract.signatories.filter(signature_base64__isnull=True)
        if not pending_signatories.exists():
            return Response({'error': 'No hay firmantes pendientes para este contrato.'}, status=status.HTTP_400_BAD_REQUEST)
        
        for sig in pending_signatories:
            send_custom_contract_emails(contract, signatory_to_notify=sig, request=request)
            
        emails_list = ", ".join([sig.email for sig in pending_signatories])
        return Response({'message': f'Correos de invitación reenviados con éxito a: {emails_list}.'})

