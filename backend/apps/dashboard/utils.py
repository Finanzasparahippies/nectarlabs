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
