import uuid
from decimal import Decimal
import logging
from django.conf import settings
from django.core.files.base import ContentFile
import requests

logger = logging.getLogger(__name__)

class PACError(Exception):
    """Excepción base para errores de comunicación con el PAC"""
    pass

class LCOSyncError(PACError):
    """Excepción específica cuando el certificado digital aún no se sincroniza en la LCO del SAT"""
    pass


class PACServiceBase:
    def create_organization(self, tax_profile):
        """Crea una organización/contribuyente en el PAC y retorna su ID de PAC"""
        raise NotImplementedError()

    def upload_sello(self, organization_id, cer_file, key_file, password):
        """Sube y resguarda los sellos CSD (.cer, .key) en el portal del PAC"""
        raise NotImplementedError()

    def create_invoice(self, invoice, tax_profile, customer_info, items, is_parent_to_tenant=False):
        """Genera y timbra una factura CFDI 4.0 en el PAC"""
        raise NotImplementedError()

    def cancel_invoice(self, invoice):
        """Solicita la cancelación del CFDI ante el SAT"""
        raise NotImplementedError()

    def check_invoice_status(self, invoice):
        """Verifica el estado actual de la factura (timbrado/cancelado) en el PAC"""
        raise NotImplementedError()


class MockPACService(PACServiceBase):
    """
    PAC de simulación para desarrollo local y ejecución de pruebas unitarias.
    """
    def create_organization(self, tax_profile):
        logger.info(f"[MockPAC] Creando organización para RFC: {tax_profile.rfc}")
        return f"org_mock_{uuid.uuid4().hex[:12]}"

    def upload_sello(self, organization_id, cer_file, key_file, password):
        logger.info(f"[MockPAC] Subiendo sellos para la organización {organization_id}")
        if password == "invalid_sello":
            raise PACError("Clave de CSD incorrecta o certificado dañado.")
        return True

    def create_invoice(self, invoice, tax_profile, customer_info, items, is_parent_to_tenant=False):
        org_id = "parent" if is_parent_to_tenant else (tax_profile.facturapi_organization_id if tax_profile else "unknown")
        logger.info(f"[MockPAC] Generando factura por ${invoice.total} en org {org_id}")
        
        # Simulación del caso de sincronización LCO (sello nuevo)
        # RFC especial para forzar el error de sincronización de sellos (LCO)
        if tax_profile.rfc == "LCO999999AAA":
            raise LCOSyncError("El certificado digital (CSD) no está activo en la LCO del SAT. Tarda de 24 a 72 horas.")

        # Simulación de error de centavos si el redondeo es impreciso
        total_items = Decimal('0.00')
        for item in items:
            total_items += Decimal(str(item['quantity'])) * Decimal(str(item['unit_price']))
        
        if abs(Decimal(str(invoice.total)) - total_items) > Decimal('0.05'):
            raise PACError("Error del SAT: El total no coincide con el desglose de conceptos por discrepancia de centavos.")

        mock_uuid = uuid.uuid4()
        # Generar archivos mock representativos
        xml_content = f"<cfdi:Comprobante Version='4.0' UUID='{mock_uuid}' Total='{invoice.total}'></cfdi:Comprobante>"
        pdf_content = b"PDF Mock Representation"

        return {
            "facturapi_invoice_id": f"inv_mock_{uuid.uuid4().hex[:12]}",
            "uuid_sat": mock_uuid,
            "xml_file": ContentFile(xml_content.encode('utf-8'), name=f"{mock_uuid}.xml"),
            "pdf_file": ContentFile(pdf_content, name=f"{mock_uuid}.pdf"),
        }

    def cancel_invoice(self, invoice):
        logger.info(f"[MockPAC] Solicitando cancelación para CFDI SAT UUID: {invoice.uuid_sat}")
        # Si el total es muy alto, simulamos que requiere aceptación del receptor
        if invoice.total >= Decimal('5000.00'):
            return "CANCEL_REQUESTED"
        return "CANCELLED"

    def check_invoice_status(self, invoice):
        logger.info(f"[MockPAC] Revisando estado del CFDI: {invoice.uuid_sat}")
        if invoice.status == "CANCEL_REQUESTED":
            # Simula aceptación del receptor al consultar status
            return "CANCELLED"
        return "PAID"


class FacturapiPACService(PACServiceBase):
    """
    Integración real de la API REST del PAC Facturapi
    """
    def __init__(self):
        self.api_key = getattr(settings, 'PAC_API_KEY', '')
        self.base_url = "https://www.facturapi.io/v2" 
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def create_organization(self, tax_profile):
        # 1. Crear organización en Facturapi v2 con su nombre comercial/fiscal
        url_create = f"{self.base_url}/organizations"
        create_payload = {
            "name": tax_profile.razon_social
        }
        try:
            response = requests.post(url_create, json=create_payload, headers=self.headers, timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al crear organización en Facturapi: {response.text}")
            org_id = response.json().get("id")
        except Exception as e:
            raise PACError(f"Fallo de conexión al PAC al crear organización: {e}")

        # 2. Configurar datos fiscales/legales vía PUT /organizations/{id}/legal en v2
        url_legal = f"{self.base_url}/organizations/{org_id}/legal"
        legal_payload = {
            "name": tax_profile.razon_social,
            "legal_name": tax_profile.razon_social,
            "tax_system": tax_profile.regimen_fiscal,
            "address": {
                "zip": tax_profile.codigo_postal,
                "country": "MEX"
            }
        }
        try:
            legal_resp = requests.put(url_legal, json=legal_payload, headers=self.headers, timeout=10)
            if legal_resp.status_code not in [200, 201, 204]:
                raise PACError(f"Error al configurar datos legales en Facturapi: {legal_resp.text}")
            return org_id
        except Exception as e:
            raise PACError(f"Fallo de conexión al PAC al configurar datos legales: {e}")

    def upload_sello(self, organization_id, cer_file, key_file, password):
        # En v2 el endpoint cambió de /sello a /certificate
        url = f"{self.base_url}/organizations/{organization_id}/certificate"
        # Facturapi requiere multipart form data para los sellos
        files = {
            "cer": (cer_file.name, cer_file.read(), "application/x-x509-ca-cert"),
            "key": (key_file.name, key_file.read(), "application/octet-stream"),
        }
        data = {"password": password}
        try:
            # Facturapi requiere enviar archivos con Multipart
            response = requests.put(url, files=files, data=data, headers={"Authorization": f"Bearer {self.api_key}"}, timeout=15)
            if response.status_code not in [200, 201, 204]:
                raise PACError(f"Error al subir sellos CSD a Facturapi: {response.text}")
            return True
        except Exception as e:
            raise PACError(f"Fallo de conexión para carga de sellos: {e}")

    def create_invoice(self, invoice, tax_profile, customer_info, items, is_parent_to_tenant=False):
        # Para timbrar a nombre de la organización subordinada, Facturapi requiere el header "Facturapi-Organization"
        headers = self.headers.copy()
        if not is_parent_to_tenant and tax_profile and tax_profile.facturapi_organization_id:
            headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id
        
        url = f"{self.base_url}/invoices"
        
        # Mapeamos los conceptos redondeando rigurosamente a 2 decimales usando aritmética decimal
        desglose_items = []
        for it in items:
            qty = Decimal(str(it['quantity']))
            price = Decimal(str(it['unit_price'])).quantize(Decimal('0.01'))
            desglose_items.append({
                "quantity": int(qty),
                "product": {
                    "description": it['description'],
                    "product_key": "43231500", # Llave SAT por defecto para Software
                    "price": float(price),
                    "taxes": [
                        {
                            "rate": 0.16,
                            "type": "IVA",
                            "factor": "Tasa"
                        }
                    ]
                }
            })

        payload = {
            "customer": {
                "legal_name": customer_info.get("razon_social"),
                "tax_id": customer_info.get("rfc"),
                "tax_system": customer_info.get("regimen_fiscal", "601"),
                "email": customer_info.get("email"),
                "address": {
                    "zip": customer_info.get("codigo_postal")
                }
            },
            "items": desglose_items,
            "payment_form": customer_info.get("payment_form", "04"), # Tarjeta de crédito
            "payment_method": "PUE",
            "use": customer_info.get("use", "G03") # Gastos en general
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            res_data = response.json()
            
            if response.status_code not in [200, 201]:
                error_msg = res_data.get("message", response.text)
                if "LCO" in error_msg or "lista de contribuyentes" in error_msg.lower() or "no activo" in error_msg.lower():
                    raise LCOSyncError(f"Sello digital no sincronizado en LCO: {error_msg}")
                raise PACError(f"Error al timbrar factura en Facturapi: {error_msg}")

            invoice_id = res_data.get("id")
            uuid_sat = res_data.get("uuid")

            # Descargar archivos XML y PDF de Facturapi para almacenarlos localmente/S3
            xml_resp = requests.get(f"{url}/{invoice_id}/xml", headers=headers, timeout=10)
            pdf_resp = requests.get(f"{url}/{invoice_id}/pdf", headers=headers, timeout=10)

            return {
                "facturapi_invoice_id": invoice_id,
                "uuid_sat": uuid_sat,
                "xml_file": ContentFile(xml_resp.content, name=f"{uuid_sat}.xml"),
                "pdf_file": ContentFile(pdf_resp.content, name=f"{uuid_sat}.pdf"),
            }
        except LCOSyncError:
            raise
        except Exception as e:
            raise PACError(f"Error en flujo de timbrado Facturapi: {e}")

    def cancel_invoice(self, invoice):
        # Requiere el header de la organización correspondiente
        headers = self.headers.copy()
        if getattr(invoice, 'is_tenant_to_customer', False):
            tax_profile = getattr(invoice.tenant, 'tax_profile', None)
            if tax_profile and tax_profile.facturapi_organization_id:
                headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id

        url = f"{self.base_url}/invoices/{invoice.facturapi_invoice_id}"
        try:
            # Facturapi requiere DELETE para cancelar facturas
            response = requests.delete(url, headers=headers, timeout=15)
            res_data = response.json()
            if response.status_code != 200:
                raise PACError(f"Error al solicitar cancelación: {res_data.get('message', response.text)}")
            
            sat_status = res_data.get("status")
            if sat_status == "cancelled":
                return "CANCELLED"
            return "CANCEL_REQUESTED"
        except Exception as e:
            raise PACError(f"Fallo al cancelar factura en Facturapi: {e}")

    def check_invoice_status(self, invoice):
        headers = self.headers.copy()
        if getattr(invoice, 'is_tenant_to_customer', False):
            tax_profile = getattr(invoice.tenant, 'tax_profile', None)
            if tax_profile and tax_profile.facturapi_organization_id:
                headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id

        url = f"{self.base_url}/invoices/{invoice.facturapi_invoice_id}"
        try:
            response = requests.get(url, headers=headers, timeout=10)
            res_data = response.json()
            sat_status = res_data.get("status")
            if sat_status == "cancelled":
                return "CANCELLED"
            elif sat_status == "valid":
                return "PAID"
            return "PENDING"
        except Exception as e:
            logger.error(f"Error al verificar estado de la factura en el PAC: {e}")
            return invoice.status


def get_pac_service():
    """Retorna la instancia del PAC service configurado en settings.py"""
    if getattr(settings, 'TESTING', False):
        return MockPACService()
    provider = getattr(settings, 'PAC_PROVIDER', 'mock').lower()
    if provider == 'facturapi':
        return FacturapiPACService()
    return MockPACService()


def issue_invoice_for_installment(installment):
    """
    Intenta emitir y timbrar la factura de forma automática para un abono pagado.
    """
    if installment.cfdi_uuid and installment.cfdi_uuid not in ["LCO_PENDING", "FAILED"]:
        return None  # Ya tiene factura o está en proceso

    from apps.tenants.models import Tenant
    from apps.billing.models import Invoice
    from decimal import Decimal

    user = installment.contract.user
    tenant = Tenant.objects.filter(owner=user).first()
    if not tenant:
        logger.warning(f"No tenant found for user {user.username} during auto-invoice.")
        return None

    profile = getattr(tenant, 'tax_profile', None)
    if not profile:
        logger.warning(f"Tenant {tenant.name} has no tax profile configured.")
        return None

    # El total de la factura incrementa un 16% por el IVA
    invoice_total = (installment.amount * Decimal('1.16')).quantize(Decimal('0.01'))

    invoice = Invoice.objects.create(
        tenant=tenant,
        stripe_invoice_id=installment.stripe_invoice_id or f"manual-{installment.id}",
        total=invoice_total,
        is_tenant_to_customer=False,
        status=Invoice.Status.PENDING
    )

    customer_info = {
        "razon_social": user.get_full_name() or user.username,
        "rfc": profile.rfc,
        "regimen_fiscal": profile.regimen_fiscal,
        "codigo_postal": profile.codigo_postal,
        "email": user.email
    }

    items = [{
        "quantity": 1,
        "unit_price": float(installment.amount),
        "description": f"Abono #{installment.installment_number} - Contrato de Ecosistema Digital ({tenant.name})"
    }]

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

        installment.cfdi_uuid = str(res["uuid_sat"])
        installment.save(update_fields=['cfdi_uuid'])

        try:
            from apps.shop.utils import send_payment_receipt_email
            send_payment_receipt_email(installment)
        except Exception as mail_err:
            logger.error(f"Error al enviar correo de confirmación de CFDI automático: {mail_err}")

        return invoice

    except LCOSyncError as e:
        invoice.status = Invoice.Status.LCO_SYNC_PENDING
        invoice.error_message = str(e)
        invoice.save()

        installment.cfdi_uuid = "LCO_PENDING"
        installment.save(update_fields=['cfdi_uuid'])

        return invoice

    except PACError as e:
        invoice.status = Invoice.Status.FAILED
        invoice.error_message = str(e)
        invoice.save()
        logger.error(f"Error al emitir CFDI automático en el PAC: {e}")
        return invoice

