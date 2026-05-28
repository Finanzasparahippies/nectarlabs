import base64
import logging
from io import BytesIO
from fpdf import FPDF
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone

class QuotePDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 16)
        self.set_text_color(30, 30, 30) # Charcoal Dark
        self.cell(0, 10, 'PROPUESTA DE SERVICIOS TECNOLÓGICOS', new_x="LMARGIN", new_y="NEXT", align='C')
        self.set_font('helvetica', 'B', 12)
        self.set_text_color(198, 138, 30) # Nectar Gold (#C68A1E)
        self.cell(0, 10, 'NÉCTAR LABS - COTIZACIÓN DE PROYECTO', new_x="LMARGIN", new_y="NEXT", align='C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Página {self.page_no()} - Cotización generada digitalmente en nectarlabs.dev', align='C')

def generate_quote_pdf(quote):
    try:
        pdf = QuotePDF()
        pdf.add_page()
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(40, 40, 40)

        date_str = quote.created_at.strftime('%d/%m/%Y') if quote.created_at else timezone.now().strftime('%d/%m/%Y')
        
        # Introducción
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'INFORMACIÓN GENERAL', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        pdf.cell(0, 6, f'Cliente / Empresa: {quote.client_name}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'Email de Contacto: {quote.client_email}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'Fecha de Emisión: {date_str}', new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, f'Validez de la Propuesta: 30 días naturales', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Nombre y descripción del proyecto
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, f'PROYECTO: {quote.project_name}', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 10)
        if quote.description:
            pdf.multi_cell(0, 6, quote.description)
        else:
            pdf.multi_cell(0, 6, 'Desarrollo de software a la medida según requerimientos técnicos del cliente.')
        pdf.ln(5)

        # Módulos cotizados
        pdf.set_font('helvetica', 'B', 11)
        pdf.set_text_color(198, 138, 30) # Dorado Nectar
        pdf.cell(0, 10, 'MÓDULOS DE FUNCIONALIDAD COTIZADOS', new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(40, 40, 40)
        pdf.ln(2)

        modules = quote.modules or []
        for idx, mod in enumerate(modules, 1):
            name = mod.get('name', f'Módulo {idx}')
            desc = mod.get('description', '')
            price = mod.get('price', 0.0)
            
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(140, 6, f'{idx}. {name}')
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(40, 6, f'${float(price):,.2f} MXN', align='R', new_x="LMARGIN", new_y="NEXT")
            
            if desc:
                pdf.set_font('helvetica', '', 9)
                pdf.set_text_color(80, 80, 80)
                pdf.multi_cell(0, 5, desc)
                pdf.set_text_color(40, 40, 40)
            
            pdf.ln(4)

        pdf.ln(5)
        pdf.set_draw_color(198, 138, 30)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(5)

        # Resumen Financiero y Tiempos
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 8, 'RESUMEN DE TIEMPOS Y COSTOS', new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font('helvetica', '', 10)
        pdf.cell(120, 6, 'Tiempo Estimado de Entrega:')
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(60, 6, f'{quote.estimated_delivery_weeks} semanas', align='R', new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font('helvetica', '', 10)
        pdf.cell(120, 6, 'Subtotal:')
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(60, 6, f'${float(quote.total_price):,.2f} MXN', align='R', new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(10)

        # Notas / Condiciones
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, 'CONDICIONES DE DESARROLLO Y SOPORTE', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(0, 5, 
            "1. FORMA DE PAGO: 50% de anticipo al inicio y 50% contra entrega de la fase final en Staging.\n"
            "2. INFRAESTRUCTURA: El cliente cubrirá costos de servidores y dominios requeridos para producción.\n"
            "3. GARANTÍA: Incluye 60 días de garantía post-entrega contra errores y fallas de funcionamiento.\n"
            "4. PROPIEDAD INTELECTUAL: Los derechos del código fuente se transfieren al cliente tras liquidar el 100% de la cotización."
        )

        # Save to quote.pdf_file
        filename = f"cotizacion_{quote.id}.pdf"
        buffer = BytesIO()
        pdf.output(buffer)
        buffer.seek(0)
        
        quote.pdf_file.save(filename, ContentFile(buffer.read()), save=False)
        quote.save(update_fields=['pdf_file'])
        return True
    except Exception as e:
        logging.error(f"Error generating quote PDF: {e}", exc_info=True)
        return False


def send_quote_email(quote):
    try:
        from django.core.mail import EmailMultiAlternatives
        from apps.tenants.utils import get_platform_sender
        from django.conf import settings
        
        subject = f"📋 Tu Propuesta Tecnológica de Néctar Labs - {quote.project_name}"
        
        # Build a beautiful, styled HTML email
        html_content = f"""
        <html>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e1e1e; background-color: #f9f9f9; padding: 30px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                <div style="background-color: #0F1B15; padding: 30px; text-align: center; border-bottom: 4px solid #C68A1E;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">Néctar Labs</h1>
                    <p style="color: #C68A1E; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase;">Partner Tecnológico</p>
                </div>
                <div style="padding: 40px 30px;">
                    <h2 style="font-size: 20px; font-weight: 800; color: #0F1B15; margin-top: 0; margin-bottom: 20px; text-transform: uppercase;">Propuesta Comercial</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
                        Hola <strong>{quote.client_name}</strong>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
                        Hemos generado la propuesta formal de servicios de desarrollo de software para el proyecto <strong>"{quote.project_name}"</strong>. 
                        Adjunto a este correo encontrarás el PDF formalizado con el desglose de los módulos cotizados, tiempos de entrega y condiciones de soporte.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                        <table style="width: 100%; font-size: 13px; color: #4b5563;">
                            <tr>
                                <td style="padding-bottom: 10px; font-weight: bold;">Proyecto:</td>
                                <td style="padding-bottom: 10px; text-align: right; color: #0f172a; font-weight: bold;">{quote.project_name}</td>
                            </tr>
                            <tr>
                                <td style="padding-bottom: 10px; font-weight: bold;">Inversión Total:</td>
                                <td style="padding-bottom: 10px; text-align: right; color: #C68A1E; font-weight: bold; font-size: 15px;">${float(quote.total_price):,.2f} MXN</td>
                            </tr>
                            <tr>
                                <td style="font-weight: bold;">Tiempo Estimado:</td>
                                <td style="text-align: right; color: #0f172a; font-weight: bold;">{quote.estimated_delivery_weeks} semanas</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
                        Si estás de acuerdo con la propuesta, por favor responde a este correo para proceder con la firma del contrato y el aprovisionamiento de tu ecosistema.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                        <a href="{quote.pdf_file.url if quote.pdf_file else '#'}" style="background-color: #C68A1E; color: #ffffff; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Ver Propuesta en Línea</a>
                    </div>
                </div>
                <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
                    Este es un correo automático enviado por la consola de ventas de Néctar Labs.<br>
                    Si tienes dudas contáctanos a soporte@nectarlabs.dev
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"Propuesta Comercial Néctar Labs para {quote.client_name}. Proyecto: {quote.project_name}. Inversión: ${float(quote.total_price):,.2f} MXN."
        
        from_email = get_platform_sender("Néctar Labs Propuestas")
        recipients = [quote.client_email, 'soporte@nectarlabs.dev']
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=recipients,
            reply_to=['soporte@nectarlabs.dev']
        )
        email.attach_alternative(html_content, "text/html")
        
        if quote.pdf_file:
            quote.pdf_file.open('rb')
            email.attach(f"Cotizacion_Nectar_{quote.id}.pdf", quote.pdf_file.read(), 'application/pdf')
            quote.pdf_file.close()
            
        email.send()
        return True
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error sending quote email: {e}", exc_info=True)
        return False

