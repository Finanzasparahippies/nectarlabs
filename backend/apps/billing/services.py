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

    def get_certificate_status(self, organization_id):
        """Consulta el estado y vigencia del certificado CSD cargado en el PAC.
        Retorna dict: {has_certificate, valid_from, valid_to, serial}"""
        raise NotImplementedError()

    def create_customer(self, organization_id, customer_data):
        """Crea un receptor/cliente en el PAC para la organización del tenant.
        customer_data: {rfc, legal_name, tax_system, email, zip}
        Retorna el ID del cliente en el PAC."""
        raise NotImplementedError()

    def update_customer(self, organization_id, pac_customer_id, customer_data):
        """Actualiza los datos de un receptor/cliente existente en el PAC."""
        raise NotImplementedError()

    def delete_customer(self, organization_id, pac_customer_id):
        """Elimina un receptor/cliente del catálogo del PAC."""
        raise NotImplementedError()

    def list_customers(self, organization_id):
        """Lista los receptores/clientes del catálogo del PAC para la organización."""
        raise NotImplementedError()

    def create_product(self, organization_id, product_data):
        """Crea un producto en el PAC.
        product_data: {description, price, product_key, unit_key}"""
        raise NotImplementedError()

    def update_product(self, organization_id, pac_product_id, product_data):
        """Actualiza un producto en el PAC."""
        raise NotImplementedError()

    def delete_product(self, organization_id, pac_product_id):
        """Elimina un producto en el PAC."""
        raise NotImplementedError()

    def list_products(self, organization_id):
        """Lista los productos en el PAC."""
        raise NotImplementedError()

    def create_receipt(self, organization_id, receipt_data):
        """Crea un recibo en el PAC.
        receipt_data: {folio_number, payment_form, items}"""
        raise NotImplementedError()

    def list_receipts(self, organization_id):
        """Lista los recibos en el PAC."""
        raise NotImplementedError()

    def retrieve_receipt(self, organization_id, receipt_id):
        """Obtiene un recibo específico del PAC."""
        raise NotImplementedError()

    def create_retention(self, organization_id, retention_data):
        """Crea una retención en el PAC.
        retention_data: {customer, cve_retenc, periodo, totales}"""
        raise NotImplementedError()

    def list_retentions(self, organization_id):
        """Lista las retenciones en el PAC."""
        raise NotImplementedError()

    def create_invoice(self, invoice, tax_profile, customer_info, items, is_parent_to_tenant=False):
        """Genera y timbra una factura CFDI 4.0 en el PAC"""
        raise NotImplementedError()

    def cancel_invoice(self, invoice, motive='02', substitution=None):
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

    def get_certificate_status(self, organization_id):
        logger.info(f"[MockPAC] Consultando estado del certificado para org {organization_id}")
        # Simula que hay un certificado de demo activo
        return {
            "has_certificate": True,
            "valid_from": "2024-01-01T00:00:00.000Z",
            "valid_to": "2028-12-31T23:59:59.000Z",
            "serial": "MOCK-CSD-001",
        }

    def create_customer(self, organization_id, customer_data):
        logger.info(f"[MockPAC] Creando cliente {customer_data.get('rfc')} en org {organization_id}")
        return f"cus_mock_{uuid.uuid4().hex[:12]}"

    def update_customer(self, organization_id, pac_customer_id, customer_data):
        logger.info(f"[MockPAC] Actualizando cliente {pac_customer_id} en org {organization_id}")
        return True

    def delete_customer(self, organization_id, pac_customer_id):
        logger.info(f"[MockPAC] Eliminando cliente {pac_customer_id} de org {organization_id}")
        return True

    def list_customers(self, organization_id):
        logger.info(f"[MockPAC] Listando clientes de org {organization_id}")
        return [
            {"id": "cus_mock_001", "legal_name": "CLIENTE DEMO SA DE CV", "tax_id": "CDM860329AAA",
             "tax_system": "601", "email": "demo@cliente.com", "address": {"zip": "06000"}},
        ]

    def create_product(self, organization_id, product_data):
        logger.info(f"[MockPAC] Creando producto {product_data.get('description')} en org {organization_id}")
        return f"prod_mock_{uuid.uuid4().hex[:12]}"

    def update_product(self, organization_id, pac_product_id, product_data):
        logger.info(f"[MockPAC] Actualizando producto {pac_product_id} en org {organization_id}")
        return True

    def delete_product(self, organization_id, pac_product_id):
        logger.info(f"[MockPAC] Eliminando producto {pac_product_id} de org {organization_id}")
        return True

    def list_products(self, organization_id):
        logger.info(f"[MockPAC] Listando productos de org {organization_id}")
        return [
            {"id": "prod_mock_001", "description": "Noche de hotel, renta de habitación doble", "price": 1234.56, "product_key": "90111800", "unit_key": "DAY"}
        ]

    def create_receipt(self, organization_id, receipt_data):
        logger.info(f"[MockPAC] Creando recibo para org {organization_id}")
        return {
            "id": f"rec_mock_{uuid.uuid4().hex[:12]}",
            "folio_number": receipt_data.get("folio_number"),
            "payment_form": receipt_data.get("payment_form"),
            "total": sum(float(item["product"]["price"]) * float(item["quantity"]) for item in receipt_data.get("items", [])),
            "status": "valid"
        }

    def list_receipts(self, organization_id):
        logger.info(f"[MockPAC] Listando recibos de org {organization_id}")
        return [
            {"id": "rec_mock_001", "folio_number": 123, "payment_form": "08", "total": 1234.56, "status": "valid"}
        ]

    def retrieve_receipt(self, organization_id, receipt_id):
        logger.info(f"[MockPAC] Consultando recibo {receipt_id} de org {organization_id}")
        return {
            "id": receipt_id,
            "folio_number": 123,
            "payment_form": "08",
            "total": 1432.09,
            "status": "valid",
            "items": [
                {
                    "quantity": 1,
                    "product": {
                        "description": "Servicio de Hospedaje en Habitación Doble",
                        "price": 1234.56,
                        "product_key": "90111800",
                        "unit_key": "DAY"
                    }
                }
            ]
        }

    def create_retention(self, organization_id, retention_data):
        logger.info(f"[MockPAC] Creando retención para org {organization_id}")
        return {
            "id": f"ret_mock_{uuid.uuid4().hex[:12]}",
            "customer": retention_data.get("customer"),
            "cve_retenc": retention_data.get("cve_retenc"),
            "status": "valid"
        }

    def list_retentions(self, organization_id):
        logger.info(f"[MockPAC] Listando retenciones de org {organization_id}")
        return [
            {
                "id": "ret_mock_001",
                "customer": {"legal_name": "JOHN DOE", "tax_id": "XAXX010101000"},
                "cve_retenc": "03",
                "status": "valid"
            }
        ]

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
        
        total_items_with_tax = (total_items * Decimal('1.16')).quantize(Decimal('0.01'))
        if abs(Decimal(str(invoice.total)) - total_items) > Decimal('0.05') and abs(Decimal(str(invoice.total)) - total_items_with_tax) > Decimal('0.05'):
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

    def cancel_invoice(self, invoice, motive='02', substitution=None):
        logger.info(f"[MockPAC] Solicitando cancelación para CFDI SAT UUID: {invoice.uuid_sat} con motivo {motive}, sustitución: {substitution}")
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

    def _org_headers(self, organization_id):
        """Headers con el selector de organización subordinada para Facturapi v2."""
        h = self.headers.copy()
        if organization_id:
            h["Facturapi-Organization"] = organization_id
        return h

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
        files = {
            "cer": (cer_file.name, cer_file.read(), "application/x-x509-ca-cert"),
            "key": (key_file.name, key_file.read(), "application/octet-stream"),
        }
        data = {"password": password}
        try:
            response = requests.put(url, files=files, data=data, headers={"Authorization": f"Bearer {self.api_key}"}, timeout=15)
            if response.status_code not in [200, 201, 204]:
                raise PACError(f"Error al subir sellos CSD a Facturapi: {response.text}")
            return True
        except PACError:
            raise 
        except Exception as e:
            raise PACError(f"Fallo de conexión para carga de sellos: {e}")

    def get_certificate_status(self, organization_id):
        url = f"{self.base_url}/organizations/{organization_id}/certificate"
        try:
            response = requests.get(url, headers={"Authorization": f"Bearer {self.api_key}"}, timeout=10)
            if response.status_code == 404:
                return {"has_certificate": False, "valid_from": None, "valid_to": None, "serial": None}
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al consultar certificado en Facturapi: {response.text}")
            data = response.json()
            return {
                "has_certificate": True,
                "valid_from": data.get("valid_from"),
                "valid_to": data.get("valid_to"),
                "serial": data.get("serial_number"),
            }
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al consultar certificado: {e}")

    def create_customer(self, organization_id, customer_data):
        url = f"{self.base_url}/customers"
        payload = {
            "legal_name": customer_data.get("legal_name"),
            "tax_id": customer_data.get("rfc"),
            "tax_system": customer_data.get("tax_system", "601"),
            "email": customer_data.get("email"),
            "phone": customer_data.get("phone", ""),
            "address": {"zip": customer_data.get("zip", "")},
        }
        try:
            response = requests.post(url, json=payload, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al crear cliente en Facturapi: {response.text}")
            return response.json().get("id")
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al crear cliente: {e}")

    def update_customer(self, organization_id, pac_customer_id, customer_data):
        url = f"{self.base_url}/customers/{pac_customer_id}"
        payload = {
            "legal_name": customer_data.get("legal_name"),
            "tax_id": customer_data.get("rfc"),
            "tax_system": customer_data.get("tax_system", "601"),
            "email": customer_data.get("email"),
            "phone": customer_data.get("phone", ""),
            "address": {"zip": customer_data.get("zip", "")},
        }
        try:
            response = requests.put(url, json=payload, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201, 204]:
                raise PACError(f"Error al actualizar cliente en Facturapi: {response.text}")
            return True
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al actualizar cliente: {e}")

    def delete_customer(self, organization_id, pac_customer_id):
        url = f"{self.base_url}/customers/{pac_customer_id}"
        try:
            response = requests.delete(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 204]:
                raise PACError(f"Error al eliminar cliente en Facturapi: {response.text}")
            return True
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al eliminar cliente: {e}")

    def list_customers(self, organization_id):
        url = f"{self.base_url}/customers"
        try:
            response = requests.get(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al listar clientes de Facturapi: {response.text}")
            data = response.json()
            # Facturapi v2 devuelve {data: [...], total_pages: N, page: N}
            return data.get("data", data) if isinstance(data, dict) else data
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al listar clientes: {e}")

    def create_product(self, organization_id, product_data):
        url = f"{self.base_url}/products"
        payload = {
            "description": product_data.get("description"),
            "price": float(product_data.get("price")),
            "product_key": product_data.get("product_key"),
            "unit_key": product_data.get("unit_key", "E48"),
        }
        try:
            response = requests.post(url, json=payload, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al crear producto en Facturapi: {response.text}")
            return response.json().get("id")
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al crear producto: {e}")

    def update_product(self, organization_id, pac_product_id, product_data):
        url = f"{self.base_url}/products/{pac_product_id}"
        payload = {
            "description": product_data.get("description"),
            "price": float(product_data.get("price")),
            "product_key": product_data.get("product_key"),
            "unit_key": product_data.get("unit_key", "E48"),
        }
        try:
            response = requests.put(url, json=payload, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201, 204]:
                raise PACError(f"Error al actualizar producto en Facturapi: {response.text}")
            return True
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al actualizar producto: {e}")

    def delete_product(self, organization_id, pac_product_id):
        url = f"{self.base_url}/products/{pac_product_id}"
        try:
            response = requests.delete(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 204]:
                raise PACError(f"Error al eliminar producto en Facturapi: {response.text}")
            return True
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al eliminar producto: {e}")

    def list_products(self, organization_id):
        url = f"{self.base_url}/products"
        try:
            response = requests.get(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al listar productos en Facturapi: {response.text}")
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al listar productos: {e}")

    def create_receipt(self, organization_id, receipt_data):
        url = f"{self.base_url}/receipts"
        # Mapeamos los conceptos redondeando el precio a 2 decimales
        desglose_items = []
        for item in receipt_data.get("items", []):
            prod = item.get("product", {})
            desglose_items.append({
                "quantity": int(item.get("quantity", 1)),
                "product": {
                    "description": prod.get("description"),
                    "price": float(Decimal(str(prod.get("price"))).quantize(Decimal('0.01'))),
                    "product_key": prod.get("product_key"),
                    "unit_key": prod.get("unit_key", "E48")
                }
            })
        
        payload = {
            "folio_number": receipt_data.get("folio_number"),
            "payment_form": receipt_data.get("payment_form", "01"),
            "items": desglose_items
        }
        try:
            response = requests.post(url, json=payload, headers=self._org_headers(organization_id), timeout=15)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al crear recibo en Facturapi: {response.text}")
            return response.json()
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al crear recibo: {e}")

    def list_receipts(self, organization_id):
        url = f"{self.base_url}/receipts"
        try:
            response = requests.get(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al listar recibos en Facturapi: {response.text}")
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al listar recibos: {e}")

    def retrieve_receipt(self, organization_id, receipt_id):
        url = f"{self.base_url}/receipts/{receipt_id}"
        try:
            response = requests.get(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al obtener recibo en Facturapi: {response.text}")
            return response.json()
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al obtener recibo: {e}")

    def create_retention(self, organization_id, retention_data):
        url = f"{self.base_url}/retentions"
        payload = {
            "customer": {
                "legal_name": retention_data.get("customer", {}).get("legal_name"),
                "tax_id": retention_data.get("customer", {}).get("tax_id"),
                "tax_system": retention_data.get("customer", {}).get("tax_system", "616"),
                "email": retention_data.get("customer", {}).get("email"),
                "address": {
                    "zip": retention_data.get("customer", {}).get("address", {}).get("zip")
                }
            },
            "cve_retenc": retention_data.get("cve_retenc"),
            "periodo": {
                "mes_ini": int(retention_data.get("periodo", {}).get("mes_ini")),
                "mes_fin": int(retention_data.get("periodo", {}).get("mes_fin")),
                "ejerc": int(retention_data.get("periodo", {}).get("ejerc"))
            },
            "totales": {
                "monto_tot_operacion": float(retention_data.get("totales", {}).get("monto_tot_operacion")),
                "monto_tot_exent": float(retention_data.get("totales", {}).get("monto_tot_exent")),
                "imp_retenidos": [
                    {
                        "monto_ret": float(imp.get("monto_ret")),
                        "tipo_pago_ret": imp.get("tipo_pago_ret"),
                        "impuesto": imp.get("impuesto")
                    } for imp in retention_data.get("totales", {}).get("imp_retenidos", [])
                ]
            }
        }
        try:
            response = requests.post(url, json=payload, headers=self._org_headers(organization_id), timeout=15)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al crear retención en Facturapi: {response.text}")
            return response.json()
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al crear retención: {e}")

    def list_retentions(self, organization_id):
        url = f"{self.base_url}/retentions"
        try:
            response = requests.get(url, headers=self._org_headers(organization_id), timeout=10)
            if response.status_code not in [200, 201]:
                raise PACError(f"Error al listar retenciones en Facturapi: {response.text}")
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data
        except PACError:
            raise
        except Exception as e:
            raise PACError(f"Fallo de conexión al listar retenciones: {e}")

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
            
            if is_parent_to_tenant:
                p_key = it.get('product_key') or "43231500"
                u_key = it.get('unit_key') or "E48"
                u_name = it.get('unit_name') or "Unidad de servicio"
            else:
                p_key = it.get('product_key') or (tax_profile.default_product_key if tax_profile else "43231500")
                u_key = it.get('unit_key') or (tax_profile.default_unit_key if tax_profile else "E48")
                u_name = it.get('unit_name') or (tax_profile.default_unit_name if tax_profile else "Unidad de servicio")

            desglose_items.append({
                "quantity": int(qty),
                "product": {
                    "description": it['description'],
                    "product_key": p_key,
                    "unit_key": u_key,
                    "unit_name": u_name,
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

    def cancel_invoice(self, invoice, motive='02', substitution=None):
        # Requiere el header de la organización correspondiente
        headers = self.headers.copy()
        if getattr(invoice, 'is_tenant_to_customer', False):
            tax_profile = getattr(invoice.tenant, 'tax_profile', None)
            if tax_profile and tax_profile.facturapi_organization_id:
                headers["Facturapi-Organization"] = tax_profile.facturapi_organization_id

        # CFDI 4.0 requires motive query param (e.g. 02 - Comprobante emitido con errores sin relación)
        url = f"{self.base_url}/invoices/{invoice.facturapi_invoice_id}?motive={motive}"
        if motive == '01' and substitution:
            url += f"&substitution={substitution.strip()}"
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

