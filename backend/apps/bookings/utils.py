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

def is_valid_image(image_bytes):
    if not image_bytes:
        return False
    try:
        from PIL import Image
        img = Image.open(BytesIO(image_bytes))
        img.verify()
        return True
    except Exception:
        return False

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
        domain = (self.tenant.custom_domain if self.tenant.use_custom_domain else None) or f"{self.tenant.subdomain}.nectarlabs.dev"
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
                if sig_data and is_valid_image(sig_data):
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
                if sig_data and is_valid_image(sig_data):
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
            if tenant.use_custom_domain and tenant.custom_domain:
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


class CustomContractPDF(FPDF):
    def __init__(self, contract, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.contract = contract

    def header(self):
        # Logo
        if self.contract.logo:
            try:
                self.image(self.contract.logo.path, x=10, y=10, w=28)
            except Exception as e:
                logger.error(f"Error drawing logo on CustomContract PDF: {e}")
        
        # Header title
        self.set_font('helvetica', 'B', 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 10, self.contract.title.upper(), new_x="LMARGIN", new_y="NEXT", align='R')
        
        # Decorative line
        tenant_color = "#C68A1E"
        if self.contract.tenant:
            tenant_color = getattr(self.contract.tenant, "theme_color", "#C68A1E")
        
        # Parse hex color
        r, g, b = 198, 138, 30 # fallback gold
        if tenant_color.startswith('#') and len(tenant_color) == 7:
            try:
                r = int(tenant_color[1:3], 16)
                g = int(tenant_color[3:5], 16)
                b = int(tenant_color[5:7], 16)
            except ValueError:
                pass
        
        self.set_draw_color(r, g, b)
        self.set_line_width(1)
        self.line(10, 25, 200, 25)
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(120, 120, 120)
        tenant_name = self.contract.tenant.name if self.contract.tenant else "Néctar Labs"
        self.cell(0, 10, f'Página {self.page_no()} | Documento de Certificación Legal - {tenant_name}', align='C')


def generate_custom_contract_pdf(contract):
    """
    Genera el PDF del contrato personalizado con la estructura de proemio, declaraciones, cláusulas
    y el área dinámica de firmas para todos los firmantes.
    """
    try:
        pdf = CustomContractPDF(contract)
        pdf.add_page()
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(50, 50, 50)

        # 1. Proemio
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 8, 'PROEMIO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 5.5, contract.proemio)
        pdf.ln(6)

        # 2. Declaraciones
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 8, 'DECLARACIONES', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 5.5, contract.declarations)
        pdf.ln(6)

        # 3. Cláusulas
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 8, 'CLÁUSULAS', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 5.5, contract.clauses)
        pdf.ln(10)

        # 4. Signatures Area
        signatories = list(contract.signatories.all())
        
        # We dynamic render signatures in rows of 2
        col_width = 80
        col_gap = 20
        start_x = 15
        
        y_pos = pdf.get_y()
        
        for i, sig in enumerate(signatories):
            # If we exceed the bottom margin, add a page
            if y_pos > 230:
                pdf.add_page()
                y_pos = 40
            
            # Determine column (0 or 1)
            col = i % 2
            if col == 0 and i > 0:
                y_pos += 45 # row height
            
            x_pos = start_x + (col * (col_width + col_gap))
            
            # Draw signature image if present
            if sig.signature_base64:
                try:
                    sig_data = safe_b64decode(sig.signature_base64)
                    if sig_data and is_valid_image(sig_data):
                        sig_img = BytesIO(sig_data)
                        pdf.image(sig_img, x=x_pos + 17, y=y_pos, w=40, h=15)
                except Exception as e:
                    logger.error(f"Error drawing signatory {sig.name} signature: {e}")
            
            # Draw line and labels
            pdf.set_draw_color(180, 180, 180)
            pdf.set_line_width(0.5)
            pdf.line(x_pos, y_pos + 16, x_pos + col_width, y_pos + 16)
            
            pdf.set_xy(x_pos, y_pos + 18)
            pdf.set_font('helvetica', 'B', 9)
            pdf.cell(col_width, 4, sig.name, align='C', new_x="LMARGIN", new_y="NEXT")
            
            pdf.set_xy(x_pos, y_pos + 22)
            pdf.set_font('helvetica', 'I', 8)
            pdf.cell(col_width, 4, sig.role.upper(), align='C', new_x="LMARGIN", new_y="NEXT")
            
            if sig.signed_at:
                pdf.set_xy(x_pos, y_pos + 26)
                pdf.set_font('helvetica', 'I', 6)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(col_width, 3, f'IP: {sig.ip_address or "N/A"}', align='C', new_x="LMARGIN", new_y="NEXT")
                pdf.set_xy(x_pos, y_pos + 29)
                pdf.cell(col_width, 3, f'Fecha: {sig.signed_at.strftime("%d/%m/%Y %H:%M")}', align='C')
                pdf.set_text_color(50, 50, 50)

        # Save PDF
        output = pdf.output()
        # Acortamos el nombre para que no repita el UUID y quepa en el límite varchar(100) / varchar(255)
        filename = f"contrato_{'final' if contract.is_fully_signed else 'proceso'}.pdf"
        contract.pdf_file.save(filename, ContentFile(output), save=True)
        return True

    except Exception as e:
        logger.error(f"Failed to generate custom contract PDF: {e}", exc_info=True)
        return False


def send_custom_contract_emails(contract, signatory_to_notify=None):
    """
    Envía notificaciones de firma por correo.
    - Si se especifica signatory_to_notify, se envía la invitación de firma a ese destinatario.
    - Si no, y el contrato está completado (is_fully_signed=True), se envía la copia certificada a todos.
    """
    try:
        tenant = contract.tenant
        connection, from_email = get_tenant_email_connection(tenant)
        
        theme_color = getattr(tenant, "theme_color", "#C68A1E") if tenant else "#C68A1E"
        tenant_name = tenant.name if tenant else "Néctar Labs"
        
        if signatory_to_notify:
            # Construcción dinámica y adaptativa del enlace según el entorno (Local, Staging, Producción)
            frontend_base = settings.FRONTEND_URL.rstrip('/')
            if tenant:
                if tenant.use_custom_domain and tenant.custom_domain:
                    proto = "https" if "https" in frontend_base else "http"
                    sign_url = f"{proto}://{tenant.custom_domain}/contract/sign-custom/{signatory_to_notify.token}"
                else:
                    if "staging.nectarlabs.dev" in frontend_base:
                        sign_url = f"https://{tenant.subdomain}.staging.nectarlabs.dev/contract/sign-custom/{signatory_to_notify.token}"
                    elif "nectarlabs.dev" in frontend_base:
                        sign_url = f"https://{tenant.subdomain}.nectarlabs.dev/contract/sign-custom/{signatory_to_notify.token}"
                    elif "localhost" in frontend_base:
                        sign_url = f"http://{tenant.subdomain}.localhost:3000/contract/sign-custom/{signatory_to_notify.token}"
                    else:
                        sign_url = f"{frontend_base}/contract/sign-custom/{signatory_to_notify.token}"
            else:
                sign_url = f"{frontend_base}/contract/sign-custom/{signatory_to_notify.token}"

            
            subject = f"⚠️ ACCIÓN REQUERIDA: Firmar Contrato Digital - {contract.title}"
            
            html_context = {
                'signatory': signatory_to_notify,
                'contract': contract,
                'sign_url': sign_url,
                'theme_color': theme_color,
                'tenant_name': tenant_name,
            }
            
            # Intento de renderizar plantilla HTML, con fallback robusto en texto para evitar excepciones
            try:
                html_content = render_to_string('bookings/emails/custom_contract_invitation.html', html_context)
            except Exception:
                html_content = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1a231d; background: #050a06; color: #fff; border-radius: 20px;">
                    <h2 style="color: {theme_color};">Firmar Contrato Digital</h2>
                    <p>Hola <strong>{signatory_to_notify.name}</strong>,</p>
                    <p>Se te solicita firmar el contrato digital: <strong>{contract.title}</strong>.</p>
                    <p>Tu rol asignado es: <strong>{signatory_to_notify.role}</strong>.</p>
                    <p style="margin: 30px 0; text-align: center;">
                        <a href="{sign_url}" style="background-color: {theme_color}; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Firmar Contrato</a>
                    </p>
                    <p style="font-size: 11px; color: #666;">Enviado de forma segura por {tenant_name} a través de Néctar Labs.</p>
                </div>
                """
                
            text_content = (
                f"Hola {signatory_to_notify.name},\n\n"
                f"Se te ha solicitado firmar el contrato digital '{contract.title}' por parte de {tenant_name}.\n"
                f"Tu rol designado es: {signatory_to_notify.role}.\n\n"
                f"Por favor accede al siguiente enlace seguro para estampar tu firma de conformidad:\n"
                f"{sign_url}\n\n"
                f"Atentamente,\n"
                f"{tenant_name}"
            )
            
            email = EmailMultiAlternatives(
                subject, text_content, from_email, [signatory_to_notify.email], connection=connection
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            logger.info(f"Custom contract invitation sent to {signatory_to_notify.email} for token {signatory_to_notify.token}")
            
        elif contract.is_fully_signed:
            # Enviar copia final certificada a todos los firmantes
            subject = f"✅ Contrato Digital Certificado - {contract.title}"
            recipients = [sig.email for sig in contract.signatories.all()]
            
            html_context = {
                'contract': contract,
                'theme_color': theme_color,
                'tenant_name': tenant_name,
            }
            
            try:
                html_content = render_to_string('bookings/emails/custom_contract_certified.html', html_context)
            except Exception:
                html_content = f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1a231d; background: #050a06; color: #fff; border-radius: 20px;">
                    <h2 style="color: {theme_color};">Contrato Certificado</h2>
                    <p>Estimados firmantes,</p>
                    <p>El contrato digital <strong>{contract.title}</strong> ha sido completamente firmado por todas las partes.</p>
                    <p>Adjunto a este correo electrónico encontrarán la copia oficial certificada en formato PDF.</p>
                    <p style="font-size: 11px; color: #666;">Enviado de forma segura por {tenant_name} a través de Néctar Labs.</p>
                </div>
                """
                
            text_content = (
                f"Estimados firmantes,\n\n"
                f"El contrato digital '{contract.title}' ha sido completamente firmado por todas las partes involucradas.\n"
                f"Adjunto a este correo encontrarán la copia final certificada en formato PDF.\n\n"
                f"Atentamente,\n"
                f"{tenant_name}"
            )
            
            for dest in recipients:
                email = EmailMultiAlternatives(subject, text_content, from_email, [dest], connection=connection)
                email.attach_alternative(html_content, "text/html")
                if contract.pdf_file:
                    contract.pdf_file.seek(0)
                    email.attach(f"Contrato_Certificado_{contract.id}.pdf", contract.pdf_file.read(), 'application/pdf')
                email.send()
                logger.info(f"Custom contract certified PDF sent to {dest}")
                
    except Exception as e:
        logger.error(f"Failed to send custom contract emails: {e}", exc_info=True)

