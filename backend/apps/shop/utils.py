import base64
import logging
from io import BytesIO
from fpdf import FPDF
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.conf import settings
from apps.tenants.utils import get_platform_sender
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

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
        if contract.plan:
            pay_day_label = contract.get_payment_day_display()
            pdf.multi_cell(0, 6, f'EL CLIENTE ha seleccionado el plan {contract.plan.name}, el cual incluye un máximo de {contract.plan.hours} horas mensuales de desarrollo e ingeniería. El esquema de abonos periódicos elegido es: {pay_day_label}.')
        else:
            pdf.multi_cell(0, 6, 'EL CLIENTE ha contratado la integración y licenciamiento de módulos y Add-ons del ecosistema Néctar Labs sin un plan de desarrollo de 6 meses.')
        pdf.ln(5)

        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '3. IDEA DEL PROYECTO', new_x="LMARGIN", new_y="NEXT")
        pdf.set_font('helvetica', 'I', 10)
        pdf.set_fill_color(249, 249, 249)
        pdf.multi_cell(0, 6, f'"{contract.project_idea}"', border=1, fill=True)
        pdf.ln(5)

        # Complemento Diseño de Marca
        if contract.brand_design_tier != 'NONE':
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 10, '4. COMPLEMENTO: DISEÑO DE MARCA', new_x="LMARGIN", new_y="NEXT")
            pdf.set_font('helvetica', '', 10)
            tier_label = contract.get_brand_design_tier_display()
            pdf.multi_cell(0, 6, f'EL CLIENTE ha optado por el servicio de {tier_label}. Este servicio incluye el diseño de identidad visual y activos digitales con un costo adicional de ${contract.brand_design_price} MXN mensuales.')
            pdf.ln(5)

        # Cláusulas
        pdf.set_font('helvetica', 'B', 11)
        pdf.cell(0, 10, '5. CLÁUSULAS PRINCIPALES', new_x="LMARGIN", new_y="NEXT")
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
            
            # HTML render
            dev_html = render_to_string('shop/emails/dev_action.html', {
                'subject': dev_subject,
                'contract': contract,
                'dev_sign_url': dev_sign_url,
            })
            dev_text = strip_tags(dev_html)
            
            from_email = get_platform_sender("Néctar Labs Contrataciones")
            reply_to = [settings.EMAIL_CONTACT]

            email_dev = EmailMultiAlternatives(
                subject=dev_subject,
                body=dev_text,
                from_email=from_email,
                to=[settings.EMAIL_HOST_USER],
                reply_to=reply_to
            )
            email_dev.attach_alternative(dev_html, "text/html")
            email_dev.send()

            # Confirmación al cliente
            client_subject = "Contrato recibido - Néctar Labs"
            client_html = render_to_string('shop/emails/client_confirmation.html', {
                'subject': client_subject,
                'contract': contract,
            })
            client_text = strip_tags(client_html)
            
            email_client = EmailMultiAlternatives(
                subject=client_subject,
                body=client_text,
                from_email=from_email,
                to=[contract.user.email],
                reply_to=reply_to
            )
            email_client.attach_alternative(client_html, "text/html")
            email_client.send()
        else:
            # FLUJO 2: Ambos firmaron, enviar copia final certificada
            final_subject = f"✅ Contrato Certificado y Proyecto Activado - {contract.full_name}"
            
            final_html = render_to_string('shop/emails/final_contract.html', {
                'subject': final_subject,
                'contract': contract,
            })
            final_text = strip_tags(final_html)
            
            from_email = get_platform_sender("Néctar Labs Contrataciones")
            reply_to = [settings.EMAIL_CONTACT]

            emails = [contract.user.email, settings.EMAIL_HOST_USER]
            for dest in emails:
                email = EmailMultiAlternatives(
                    subject=final_subject,
                    body=final_text,
                    from_email=from_email,
                    to=[dest],
                    reply_to=reply_to
                )
                email.attach_alternative(final_html, "text/html")
                if contract.pdf_file:
                    contract.pdf_file.seek(0)
                    email.attach(f"Contrato_Nectar_{contract.id}_FINAL.pdf", contract.pdf_file.read(), 'application/pdf')
                email.send()
    except Exception as e:
        logging.error(f"Failed to send contract emails for contract {contract.id}: {e}", exc_info=True)


def send_payment_receipt_email(installment):
    """
    Sends a billing confirmation/receipt email to the client when a payment installment is paid.
    Sent from settings.EMAIL_BILLING (facturacion@nectarlabs.dev).
    """
    try:
        user = installment.contract.user
        recipient_email = user.email
        name = installment.contract.full_name
        
        subject = f"Confirmación de Pago: Mensualidad {installment.installment_number}/6 - Néctar Labs"
        description = f"Mensualidad {installment.installment_number}/6 para el contrato #{installment.contract.id}"
        amount = f"{installment.amount:,.2f}"
        reference = installment.stripe_invoice_id or f"INSTALLMENT-{installment.id}"
        date_str = timezone.localtime(installment.paid_at if installment.paid_at else timezone.now()).strftime('%d/%m/%Y %H:%M')
        
        html_content = render_to_string('shop/emails/payment_receipt.html', {
            'subject': subject,
            'name': name,
            'description': description,
            'amount': amount,
            'reference': reference,
            'date': date_str,
        })
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs Facturación"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_BILLING],
            bcc=[settings.EMAIL_BILLING]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
    except Exception as e:
        logging.error(f"Error sending payment receipt email for installment {installment.id}: {e}", exc_info=True)


def send_addon_payment_receipt_email(user, addon, session):
    """
    Sends a billing confirmation/receipt email to the client when subscribing to an individual Add-on.
    Sent from settings.EMAIL_BILLING (facturacion@nectarlabs.dev).
    """
    try:
        recipient_email = user.email
        name = user.get_full_name() or user.username or "Cliente"
        
        subject = f"Confirmación de Pago: Suscripción a Add-on {addon.name} - Néctar Labs"
        description = f"Suscripción mensual al módulo/Add-on: {addon.name}"
        
        # Stripe session amount_total is in cents
        amount_total = session.get('amount_total', 0)
        amount = f"{amount_total / 100:,.2f}" if amount_total else f"{addon.monthly_price:,.2f}"
        
        reference = session.get('id') or f"ADDON-SUB-{addon.id}"
        date_str = timezone.now().strftime('%d/%m/%Y %H:%M')
        
        html_content = render_to_string('shop/emails/payment_receipt.html', {
            'subject': subject,
            'name': name,
            'description': description,
            'amount': amount,
            'reference': reference,
            'date': date_str,
        })
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs Facturación"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_BILLING],
            bcc=[settings.EMAIL_BILLING]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
    except Exception as e:
        logging.error(f"Error sending addon payment receipt email for addon {addon.id} and user {user.id}: {e}", exc_info=True)


def generate_installments_for_contract(contract):
    """
    Generates payment installments for development and design independently.
    """
    from datetime import date, timedelta
    from django.utils import timezone
    from apps.shop.models import PaymentInstallment
    
    if not contract.plan:
        return
        
    plan_price = contract.plan.price
    if contract.discount_percentage > 0:
        plan_price = plan_price * (1 - contract.discount_percentage / 100)
        
    start_date = contract.signed_at.date() if contract.signed_at else timezone.now().date()
    
    # Clean up previous installments
    contract.installments.all().delete()
    
    installments_to_create = []
    
    # 1. Development Installments
    if contract.payment_day == 'WEEKLY_MONDAY':
        weekly_amount = plan_price / 4
        days_ahead = 0 - start_date.weekday()
        if days_ahead < 0:
            days_ahead += 7
        first_monday = start_date + timedelta(days=days_ahead)
        
        for i in range(1, 25):
            due_date = first_monday + timedelta(weeks=i - 1)
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    amount=weekly_amount,
                    status=PaymentInstallment.Status.PENDING,
                    payment_method=contract.payment_commitment_method
                )
            )
    elif contract.payment_day == 'FORTNIGHTLY_1ST_15TH':
        fortnightly_amount = plan_price / 2
        due_dates = []
        candidate_m = start_date.month
        candidate_y = start_date.year
        
        while len(due_dates) < 12:
            d1 = date(candidate_y, candidate_m, 1)
            d15 = date(candidate_y, candidate_m, 15)
            if d1 >= start_date:
                due_dates.append(d1)
            if len(due_dates) < 12 and d15 >= start_date:
                due_dates.append(d15)
            
            candidate_m += 1
            if candidate_m > 12:
                candidate_m = 1
                candidate_y += 1
        
        for i, due_date in enumerate(due_dates, 1):
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    amount=fortnightly_amount,
                    status=PaymentInstallment.Status.PENDING,
                    payment_method=contract.payment_commitment_method
                )
            )
    else:
        due_dates = []
        candidate_m = start_date.month
        candidate_y = start_date.year
        
        while len(due_dates) < 6:
            d1 = date(candidate_y, candidate_m, 1)
            if d1 >= start_date:
                due_dates.append(d1)
            
            candidate_m += 1
            if candidate_m > 12:
                candidate_m = 1
                candidate_y += 1
        
        for i, due_date in enumerate(due_dates, 1):
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    amount=plan_price,
                    status=PaymentInstallment.Status.PENDING,
                    payment_method=contract.payment_commitment_method
                )
            )

    # 2. Design Installments
    if contract.brand_design_tier != 'NONE' and contract.brand_design_price > 0:
        if contract.brand_design_tier == 'WEEKLY':
            design_amount = 500
            days_ahead = 0 - start_date.weekday()
            if days_ahead < 0:
                days_ahead += 7
            first_monday = start_date + timedelta(days=days_ahead)
            
            for i in range(1, 25):
                due_date = first_monday + timedelta(weeks=i - 1)
                installments_to_create.append(
                    PaymentInstallment(
                        contract=contract,
                        installment_type=PaymentInstallment.InstallmentType.DESIGN,
                        installment_number=i,
                        due_date=due_date,
                        amount=design_amount,
                        status=PaymentInstallment.Status.PENDING,
                        payment_method=contract.payment_commitment_method
                    )
                )
        elif contract.brand_design_tier == 'BIWEEKLY':
            design_amount = 900
            due_dates = []
            candidate_m = start_date.month
            candidate_y = start_date.year
            
            while len(due_dates) < 12:
                d1 = date(candidate_y, candidate_m, 1)
                d15 = date(candidate_y, candidate_m, 15)
                if d1 >= start_date:
                    due_dates.append(d1)
                if len(due_dates) < 12 and d15 >= start_date:
                    due_dates.append(d15)
                
                candidate_m += 1
                if candidate_m > 12:
                    candidate_m = 1
                    candidate_y += 1
            
            for i, due_date in enumerate(due_dates, 1):
                installments_to_create.append(
                    PaymentInstallment(
                        contract=contract,
                        installment_type=PaymentInstallment.InstallmentType.DESIGN,
                        installment_number=i,
                        due_date=due_date,
                        amount=design_amount,
                        status=PaymentInstallment.Status.PENDING,
                        payment_method=contract.payment_commitment_method
                    )
                )
        elif contract.brand_design_tier == 'MONTHLY':
            design_amount = 1600
            due_dates = []
            candidate_m = start_date.month
            candidate_y = start_date.year
            
            while len(due_dates) < 6:
                d1 = date(candidate_y, candidate_m, 1)
                if d1 >= start_date:
                    due_dates.append(d1)
                
                candidate_m += 1
                if candidate_m > 12:
                    candidate_m = 1
                    candidate_y += 1
            
            for i, due_date in enumerate(due_dates, 1):
                installments_to_create.append(
                    PaymentInstallment(
                        contract=contract,
                        installment_type=PaymentInstallment.InstallmentType.DESIGN,
                        installment_number=i,
                        due_date=due_date,
                        amount=design_amount,
                        status=PaymentInstallment.Status.PENDING,
                        payment_method=contract.payment_commitment_method
                    )
                )
                
    PaymentInstallment.objects.bulk_create(installments_to_create)

