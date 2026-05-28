import base64
import logging
from io import BytesIO
from fpdf import FPDF
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from apps.tenants.utils import get_tenant_email_connection

logger = logging.getLogger("apps")

def safe_b64decode(b64_string):
    if not b64_string:
        return None
    # Handle base64 headers if present
    if "," in b64_string:
        _, b64_string = b64_string.split(",", 1)
    
    b64_string = b64_string.strip()
    
    # Fix padding
    missing_padding = len(b64_string) % 4
    if missing_padding:
        b64_string += '=' * (4 - missing_padding)
        
    try:
        return base64.b64decode(b64_string)
    except Exception:
        return None

class BookingContractPDF(FPDF):
    def __init__(self, tenant, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tenant = tenant

    def header(self):
        self.set_fill_color(6, 7, 11) # Midnight black
        self.set_font('helvetica', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, f'CONTRATO DE PRESENTACIÓN ARTÍSTICA - {self.tenant.name.upper()}', new_x="LMARGIN", new_y="NEXT", align='C')
        
        self.set_font('helvetica', 'B', 11)
        self.set_text_color(198, 138, 30) # Nectar Gold (#C68A1E)
        self.cell(0, 8, f'{self.tenant.name.upper()} - ACUERDO DE BOOKING OFICIAL', new_x="LMARGIN", new_y="NEXT", align='C')
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(120, 120, 120)
        domain = self.tenant.custom_domain or f"{self.tenant.subdomain}.nectarlabs.dev"
        self.cell(0, 10, f'Página {self.page_no()} | Generado digitalmente en {domain}', align='C')

def generate_booking_contract_pdf(contract):
    try:
        tenant = contract.inquiry.tenant
        pdf = BookingContractPDF(tenant)
        pdf.add_page()
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(50, 50, 50)

        inquiry = contract.inquiry
        date_str = inquiry.date.strftime('%d/%m/%Y') if inquiry.date else 'Fecha por definir'
        created_str = contract.created_at.strftime('%d/%m/%Y')

        # Intro
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'DATOS DEL COMPROMISO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.cell(0, 6, f'ORGANIZADOR / COMPAÑÍA: {inquiry.name} ({inquiry.company or "Particular"})', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'EMAIL: {inquiry.email} | TELÉFONO: {inquiry.phone}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'FECHA DE PRESENTACIÓN: {date_str}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'TIPO DE FORO: {inquiry.get_venue_type_display()}', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Fee
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'HONORARIOS Y PAGOS', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 6, f'Se acuerda un honorario total de ${contract.fee} MXN por la presentación artística de {tenant.name}. El organizador se compromete a liquidar el 50% para reservar la fecha y el 50% restante antes de subir al escenario.')
        pdf.ln(4)

        # Clauses
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'TÉRMINOS Y CLÁUSULAS DEL CONTRATO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        
        try:
            from .models import BookingConfig
            config, _ = BookingConfig.objects.get_or_create(tenant=tenant)
            template_text = config.contract_template
        except Exception:
            template_text = (
                "1. OBJETO: El prestador brindará sus servicios oficiales el día {{event_date}}.\n"
                "2. HONORARIOS: Se establece una tarifa de ${{fee}} MXN.\n"
                "3. CONDICIONES: Liquidación del 50% anticipado y 50% restante antes del evento."
            )

        rendered_clauses = template_text
        replacements = {
            "{{tenant_name}}": tenant.name,
            "{{client_name}}": inquiry.name,
            "{{event_date}}": date_str,
            "{{fee}}": f"{contract.fee}",
            "{{venue_type}}": inquiry.get_venue_type_display(),
        }
        for key, val in replacements.items():
            rendered_clauses = rendered_clauses.replace(key, val)

        pdf.multi_cell(0, 6, rendered_clauses)
        pdf.ln(8)

        # Signatures Area
        y_before_sig = pdf.get_y()
        
        # Draw Client Signature
        if contract.signature_base64:
            try:
                sig_data = safe_b64decode(contract.signature_base64)
                if sig_data:
                    sig_img = BytesIO(sig_data)
                    pdf.image(sig_img, x=25, y=y_before_sig, w=45)
                if contract.signed_at:
                    pdf.set_xy(10, y_before_sig + 15)
                    pdf.set_font('helvetica', 'I', 7)
                    pdf.cell(80, 5, f'Firmado: {contract.signed_at.strftime("%d/%m/%Y %H:%M")}', align='C')
            except Exception as e:
                logger.error(f"Error drawing client signature on PDF: {e}")

        pdf.set_font('helvetica', 'B', 10)
        pdf.line(20, y_before_sig + 15, 80, y_before_sig + 15)
        pdf.set_xy(10, y_before_sig + 16)
        pdf.cell(80, 8, inquiry.name, align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(80, 5, 'EL ORGANIZADOR (CLIENTE)', align='C')

        # Draw Manager Signature
        if contract.manager_signature:
            try:
                sig_data = safe_b64decode(contract.manager_signature)
                if sig_data:
                    sig_img = BytesIO(sig_data)
                    pdf.image(sig_img, x=125, y=y_before_sig, w=45)
                if contract.manager_signed_at:
                    pdf.set_xy(110, y_before_sig + 15)
                    pdf.set_font('helvetica', 'I', 7)
                    pdf.cell(80, 5, f'Firmado: {contract.manager_signed_at.strftime("%d/%m/%Y %H:%M")}', align='C')
            except Exception as e:
                logger.error(f"Error drawing manager signature on PDF: {e}")

        pdf.set_font('helvetica', 'B', 10)
        pdf.line(120, y_before_sig + 15, 180, y_before_sig + 15)
        pdf.set_xy(110, y_before_sig + 16)
        pdf.cell(80, 8, 'Representante Autorizado', align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(80, 5, f'REPRESENTANTE ({tenant.name.upper()})', align='C')

        # Save PDF
        output = pdf.output()
        filename = f"contrato_booking_{contract.id}_{'FINAL' if contract.is_fully_signed else 'PROPUESTA'}.pdf"
        contract.pdf_file.save(filename, ContentFile(output), save=True)
        return True
    except Exception as e:
        logger.error(f"Failed to generate booking contract PDF: {e}", exc_info=True)
        return False

def send_booking_contract_emails(contract):
    try:
        inquiry = contract.inquiry
        tenant = inquiry.tenant
        
        # Get dynamic SMTP connection for the tenant
        connection, from_email = get_tenant_email_connection(tenant)
        
        theme_color = getattr(tenant, "theme_color", "#C68A1E")
        tenant_name = tenant.name
        
        if not contract.is_fully_signed:
            # Stage 1: Proposal sent to Client, notify Manager to track it
            client_subject = f"✨ Propuesta de Contrato de Booking - {tenant.name}"
            # Sign URL on frontend
            sign_url = f"{settings.FRONTEND_URL}/bookings/sign/{contract.id}"
            if tenant.custom_domain:
                sign_url = f"http://{tenant.custom_domain}/bookings/sign/{contract.id}"
            
            client_context = {
                'inquiry': inquiry,
                'contract': contract,
                'sign_url': sign_url,
                'theme_color': theme_color,
                'tenant_name': tenant_name,
            }
            client_html = render_to_string('bookings/emails/booking_proposal.html', client_context)
            client_text = (
                f"Hola {inquiry.name},\n\n"
                f"Hemos recibido tu solicitud de booking para la fecha {inquiry.date} en un {inquiry.get_venue_type_display()}.\n\n"
                f"Hemos elaborado una propuesta de contrato artístico digital con los honorarios base de ${contract.fee} MXN.\n"
                f"Puedes revisar y estampar tu firma de conformidad en el siguiente enlace:\n"
                f"{sign_url}\n\n"
                f"Saludos cordiales,\n{tenant.name} Management"
            )
            
            # Send proposal email to client
            email_client = EmailMultiAlternatives(
                client_subject, client_text, from_email, [inquiry.email], connection=connection
            )
            email_client.attach_alternative(client_html, "text/html")
            if contract.pdf_file:
                contract.pdf_file.seek(0)
                email_client.attach(f"Propuesta_Contrato_Booking_{contract.id}.pdf", contract.pdf_file.read(), 'application/pdf')
            email_client.send()
            
            # Send notification to Manager/Agent (business owner email)
            manager_email = tenant.owner.email
            manager_subject = f"🔔 Nuevo Booking Recibido: {inquiry.name} ({inquiry.date})"
            manager_context = {
                'inquiry': inquiry,
                'contract': contract,
                'theme_color': theme_color,
                'tenant_name': tenant_name,
            }
            manager_html = render_to_string('bookings/emails/booking_notification.html', manager_context)
            manager_text = (
                f"Se ha registrado una nueva solicitud de booking en el sitio web:\n\n"
                f"Organizador: {inquiry.name}\n"
                f"Email: {inquiry.email} | Teléfono: {inquiry.phone}\n"
                f"Fecha propuesta: {inquiry.date}\n"
                f"Mensaje: {inquiry.message}\n\n"
                f"Se generó la propuesta #{contract.id} con honorarios de ${contract.fee} MXN. Firma del cliente pendiente."
            )
            email_manager = EmailMultiAlternatives(
                manager_subject, manager_text, from_email, [manager_email], connection=connection
            )
            email_manager.attach_alternative(manager_html, "text/html")
            email_manager.send()
            
        else:
            # Stage 2: Fully Signed Contract copies sent to client and manager
            final_subject = f"✅ Contrato de Booking Certificado - {inquiry.name} ({inquiry.date})"
            
            final_context = {
                'inquiry': inquiry,
                'contract': contract,
                'theme_color': theme_color,
                'tenant_name': tenant_name,
            }
            final_html = render_to_string('bookings/emails/booking_certified.html', final_context)
            final_text = (
                f"¡Felicidades {inquiry.name}!\n\n"
                f"El contrato de presentación artística ha sido firmado por ambas partes. Adjunto encontrarás el documento final certificado en formato PDF.\n\n"
                f"Nos vemos pronto en el escenario.\n\n"
                f"{tenant.name} Management"
            )
            
            recipients = [inquiry.email, tenant.owner.email]
            for dest in recipients:
                email = EmailMultiAlternatives(final_subject, final_text, from_email, [dest], connection=connection)
                email.attach_alternative(final_html, "text/html")
                if contract.pdf_file:
                    contract.pdf_file.seek(0)
                    email.attach(f"Contrato_Booking_{tenant.name}_{contract.id}_FINAL.pdf", contract.pdf_file.read(), 'application/pdf')
                email.send()
                
    except Exception as e:
        logger.error(f"Failed to send booking contract emails: {e}", exc_info=True)
