import base64
import logging
from io import BytesIO
from fpdf import FPDF
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.conf import settings

class ContractPDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 16)
        self.cell(0, 10, 'CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS', new_x="LMARGIN", new_y="NEXT", align='C')
        self.set_font('helvetica', 'B', 12)
        self.set_text_color(212, 175, 55) # Dorado Nectar
        self.cell(0, 10, 'NÉCTAR LABS - PARTNER TECNOLÓGICO', new_x="LMARGIN", new_y="NEXT", align='C')

        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Página {self.page_no()} - Generado digitalmente en nectarlabs.dev', align='C')

def generate_contract_pdf(contract):
    try:
        pdf = ContractPDF()
        pdf.add_page()
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(0, 0, 0)

        date_str = contract.signed_at.strftime('%d/%m/%Y')
        
        # Introducción
        pdf.multi_cell(0, 6, f'Este documento formaliza la relación profesional entre Jesus Saul Villegas Cruz (EL DESARROLLADOR) y {contract.full_name} (EL CLIENTE), con fecha de inicio {date_str}.')
        pdf.ln(5)

        # Secciones (1. Declaraciones, 2. Objeto, 3. Idea)
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '1. DECLARACIONES', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.cell(0, 6, f'CLIENTE/EMPRESA: {contract.full_name}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'RFC: {contract.tax_id}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'DOMICILIO: {contract.address}', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '2. OBJETO Y PLAN SELECCIONADO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 6, f'EL CLIENTE ha seleccionado el plan {contract.plan.name}, el cual incluye un máximo de {contract.plan.hours} horas mensuales de desarrollo e ingeniería.')
        pdf.ln(5)

        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '3. IDEA DEL PROYECTO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 10)
        pdf.set_fill_color(249, 249, 249)
        pdf.multi_cell(0, 6, f'"{contract.project_idea}"', border=1, fill=True)
        pdf.ln(5)

        # Cláusulas
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '4. CLÁUSULAS PRINCIPALES', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.multi_cell(0, 6, "1. INFRAESTRUCTURA: EL CLIENTE cubrirá costos de servidores y dominios.\n2. PROPIEDAD: Los derechos se transfieren tras 6 meses de compromiso.\n3. CADUCIDAD: Las horas mensuales no son acumulables.\n4. CONTINUIDAD: Al finalizar la etapa activa, se activará un plan de mantenimiento base.")
        pdf.ln(10)

        # Área de Firmas
        pdf.ln(10)
        y_before_sig = pdf.get_y()
        
        # Firma Desarrollador (Jesus Saul)
        if contract.developer_signature:
            try:
                header, encoded = contract.developer_signature.split(",", 1)
                sig_data = base64.b64decode(encoded)
                sig_img = BytesIO(sig_data)
                pdf.image(sig_img, x=25, y=y_before_sig - 10, w=50)
                if contract.developer_signed_at:
                    pdf.set_xy(10, y_before_sig + 15)
                    pdf.set_font('helvetica', 'I', 7)
                    pdf.cell(80, 5, f'Firmado el: {contract.developer_signed_at.strftime("%d/%m/%Y %H:%M")}', align='C')
            except Exception as e:
                logging.error(f"Error drawing dev signature on PDF: {e}")

        pdf.set_font('helvetica', 'B', 10)
        pdf.line(20, y_before_sig + 15, 80, y_before_sig + 15)
        pdf.set_xy(10, y_before_sig + 16)
        pdf.cell(80, 8, 'Jesus Saul Villegas Cruz', align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(80, 5, 'EL DESARROLLADOR (NÉCTAR LABS)', align='C')

        # Firma Cliente
        if contract.signature_base64:
            try:
                header, encoded = contract.signature_base64.split(",", 1)
                sig_data = base64.b64decode(encoded)
                sig_img = BytesIO(sig_data)
                pdf.image(sig_img, x=125, y=y_before_sig - 10, w=50)
                pdf.set_xy(110, y_before_sig + 15)
                pdf.set_font('helvetica', 'I', 7)
                pdf.cell(80, 5, f'Firmado el: {contract.signed_at.strftime("%d/%m/%Y %H:%M")}', align='C')
            except Exception as e:
                logging.error(f"Error drawing client signature on PDF: {e}")

        pdf.set_font('helvetica', 'B', 10)
        pdf.line(120, y_before_sig + 15, 180, y_before_sig + 15)
        pdf.set_xy(110, y_before_sig + 16)
        pdf.cell(80, 8, contract.full_name, align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(80, 5, 'EL CLIENTE', align='C')

        # Guardar PDF
        output = pdf.output()
        filename = f"contrato_{contract.id}_{'FINAL' if contract.is_fully_signed else 'PARCIAL'}.pdf"
        contract.pdf_file.save(filename, ContentFile(output), save=True)
        return True
    except Exception as e:
        logging.error(f"Failed to generate contract PDF: {e}")
        return False

def send_contract_emails(contract):
    try:
        if not contract.is_fully_signed:
            # FLUJO 1: El cliente acaba de firmar, avisar al dev para que firme
            dev_subject = f"⚠️ ACCIÓN REQUERIDA: Firmar Contrato - {contract.full_name}"
            dev_sign_url = f"{settings.FRONTEND_URL}/contract/dev-sign/{contract.id}"
            dev_message = f"El cliente {contract.full_name} ha firmado el contrato.\n\nPor favor, accede aquí para estampar tu firma y activar el proyecto:\n{dev_sign_url}\n\nIdea: {contract.project_idea}"
            
            email_dev = EmailMessage(dev_subject, dev_message, settings.DEFAULT_FROM_EMAIL, [settings.DEFAULT_FROM_EMAIL])
            email_dev.send()

            # Confirmación al cliente
            client_subject = "Contrato recibido - Néctar Labs"
            client_message = f"Hola {contract.full_name}, hemos recibido tu contrato firmado. En breve será validado y firmado por nuestro equipo para iniciar tu proyecto."
            email_client = EmailMessage(client_subject, client_message, settings.DEFAULT_FROM_EMAIL, [contract.user.email])
            email_client.send()
        else:
            # FLUJO 2: Ambos firmaron, enviar copia final certificada
            final_subject = f"✅ Contrato Certificado y Proyecto Activado - {contract.full_name}"
            final_message = f"¡Enhorabuena {contract.full_name}!\n\nEl contrato ha sido firmado por ambas partes. Adjunto encontrarás la copia final certificada.\n\nBienvenido oficialmente a Néctar Labs."
            
            emails = [contract.user.email, settings.DEFAULT_FROM_EMAIL]
            for dest in emails:
                email = EmailMessage(final_subject, final_message, settings.DEFAULT_FROM_EMAIL, [dest])
                if contract.pdf_file:
                    contract.pdf_file.seek(0)
                    email.attach(f"Contrato_Nectar_{contract.id}_FINAL.pdf", contract.pdf_file.read(), 'application/pdf')
                email.send()
    except Exception as e:
        logging.error(f"Failed to send contract emails for contract {contract.id}: {e}", exc_info=True)
