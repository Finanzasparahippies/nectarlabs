import os
import base64
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
        pdf.multi_cell(0, 6, f'Este documento formaliza la relación profesional entre Jesus Saul Villegas Cruz (EL DESARROLLADOR) y {contract.full_name} (EL CLIENTE), con fecha de firma {date_str}.')
        pdf.ln(5)

        # Secciones
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

        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '4. CLÁUSULAS PRINCIPALES', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        clauses = [
            "- Infraestructura: Costos de hosting y externos cubiertos por EL CLIENTE.",
            "- Propiedad: Código transferido tras 6 meses de compromiso cumplido.",
            "- Caducidad: Horas mensuales no acumulables.",
            "- Continuidad: Evolución automática a Plan de Optimización ($3,500 MXN/mes)."
        ]
        for clause in clauses:
            pdf.cell(0, 6, clause, new_x="LMARGIN", new_y="NEXT")
        
        # Firma
        pdf.ln(20)
        y_before_sig = pdf.get_y()
        
        # Firma Desarrollador
        pdf.set_xy(10, y_before_sig)
        pdf.line(20, y_before_sig + 25, 80, y_before_sig + 25)
        pdf.set_xy(10, y_before_sig + 26)
        pdf.cell(80, 10, 'Jesus Saul Villegas Cruz', align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.set_xy(10, y_before_sig + 31)
        pdf.cell(80, 10, 'EL DESARROLLADOR', align='C')

        # Firma Cliente
        if contract.signature_base64:
            try:
                # Decodificar firma
                header, encoded = contract.signature_base64.split(",", 1)
                sig_data = base64.b64decode(encoded)
                sig_img = BytesIO(sig_data)
                pdf.image(sig_img, x=120, y=y_before_sig - 10, w=50)
            except Exception as e:
                print(f"Error processing signature image: {e}")

        pdf.set_font('helvetica', '', 10)
        pdf.line(110, y_before_sig + 25, 170, y_before_sig + 25)
        pdf.set_xy(100, y_before_sig + 26)
        pdf.cell(100, 10, contract.full_name, align='C', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 8)
        pdf.set_xy(100, y_before_sig + 31)
        pdf.cell(100, 10, 'EL CLIENTE', align='C')

        # Guardar PDF
        output = pdf.output()
        filename = f"contrato_{contract.id}_{contract.full_name.replace(' ', '_')}.pdf"
        contract.pdf_file.save(filename, ContentFile(output))
        return True
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return False

def send_contract_emails(contract):
    try:
        subject = f"Tu Contrato de Partner Tecnológico - {contract.full_name}"
        message = f"""
Hola {contract.full_name},

¡Bienvenido a Néctar Labs! 

Adjunto encontrarás tu contrato firmado para el plan {contract.plan.name}.
Estamos muy emocionados de trabajar en tu proyecto: "{contract.project_idea}"

Nos pondremos en contacto contigo pronto para agendar nuestra primera sesión de planeación.

Saludos,
Jesus Saul Villegas Cruz
Néctar Labs
        """
        
        email = EmailMessage(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [contract.user.email],
        )
        
        if contract.pdf_file:
            email.attach_file(contract.pdf_file.path)
            
        email.send()

        # Email para el administrador
        admin_subject = f"NUEVO CONTRATO FIRMADO: {contract.full_name}"
        admin_message = f"El cliente {contract.full_name} ha firmado un contrato para el plan {contract.plan.name}.\n\nIdea del proyecto: {contract.project_idea}"
        
        admin_email = EmailMessage(
            admin_subject,
            admin_message,
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL],
        )
        if contract.pdf_file:
            admin_email.attach_file(contract.pdf_file.path)
        admin_email.send()
    except Exception as e:
        print(f"Error sending emails: {e}")
