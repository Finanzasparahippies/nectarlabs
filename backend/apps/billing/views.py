from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied

from apps.tenants.models import Tenant
from .models import TaxProfile, Invoice
from .serializers import TaxProfileSerializer, InvoiceSerializer
from .services import get_pac_service, PACError, LCOSyncError

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


from rest_framework.views import APIView

class TaxProfileView(BillingTenantMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

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


class InvoiceViewSet(BillingTenantMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        tenant = self.get_tenant()
        return Invoice.objects.filter(tenant=tenant)

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

        profile = getattr(invoice.tenant, 'tax_profile', None)
        if not profile or not profile.facturapi_organization_id:
            return Response({"error": "No se puede facturar; el perfil fiscal del inquilino no está configurado."}, status=400)

        pac = get_pac_service()
        user = invoice.tenant.owner
        
        # Payload de facturación con datos del receptor y emisor
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
            "description": f"Suscripción de Ecosistema Digital - {invoice.tenant.name}"
        }]

        try:
            res = pac.create_invoice(invoice, profile, customer_info, items)
            invoice.facturapi_invoice_id = res["facturapi_invoice_id"]
            invoice.uuid_sat = res["uuid_sat"]
            
            # Asignar archivos descargados del PAC
            invoice.xml_file.save(res["xml_file"].name, res["xml_file"], save=False)
            invoice.pdf_file.save(res["pdf_file"].name, res["pdf_file"], save=False)
            
            invoice.status = Invoice.Status.PAID
            invoice.error_message = None
            invoice.save()

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
            return Response({"error": f"Sello no activo (SAT LCO). Reintentando más tarde automáticamente: {e}"}, status=400)
            
        except PACError as e:
            invoice.status = Invoice.Status.FAILED
            invoice.error_message = str(e)
            invoice.save(update_fields=['status', 'error_message'])
            return Response({"error": f"Fallo de timbrado en el PAC: {e}"}, status=400)
