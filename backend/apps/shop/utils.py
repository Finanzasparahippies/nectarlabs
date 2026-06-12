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
        if contract.project_quote:
            quote = contract.project_quote
            pdf.multi_cell(0, 6, f'EL CLIENTE ha contratado el desarrollo del proyecto modular "{quote.project_name}".\n'
                                 f'Este proyecto tiene un tiempo estimado de entrega de {quote.estimated_delivery_weeks} semanas.\n'
                                 f'El costo de inversión total es de ${quote.total_price:,.2f} MXN, dividido en dos exhibiciones obligatorias del 50% cada una (Anticipo contra firma y Liquidación contra entrega).')
            pdf.ln(5)
            
            pdf.set_font('helvetica', 'B', 11)
            pdf.cell(0, 10, 'MÓDULOS INCLUIDOS EN LA PROPUESTA:', new_x="LMARGIN", new_y="NEXT")
            pdf.set_font('helvetica', '', 9)
            for mod in quote.modules:
                name = mod.get('name', 'Módulo')
                desc = mod.get('description', '')
                price = float(mod.get('price', 0))
                pdf.set_font('helvetica', 'B', 9)
                pdf.cell(0, 5, f'- {name} (${price:,.2f} MXN)', new_x="LMARGIN", new_y="NEXT")
                pdf.set_font('helvetica', '', 9)
                if desc:
                    pdf.multi_cell(0, 5, f'  Descripción: {desc}')
                pdf.ln(2)
        elif contract.plan:
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
                sig_data = safe_b64decode(contract.developer_signature)
                if sig_data and is_valid_image(sig_data):
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
                sig_data = safe_b64decode(contract.signature_base64)
                if sig_data and is_valid_image(sig_data):
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


def notify_support_addon_subscription(user, addon, tenant=None):
    """
    Notify the Néctar Labs support team when a client successfully subscribes to an Add-on:
    1. Sends an alert email to settings.EMAIL_SUPPORT (soporte@nectarlabs.dev).
    2. Broadcasts an 'addon_subscription_new' event to all connected ADMIN users via the
       realtime service's internal HTTP endpoint so the admin panel shows a live alert.
    """
    import urllib.request
    import json as _json

    _logger = logging.getLogger('apps.shop.notify')

    addon_name = getattr(addon, 'name', str(addon))
    user_email = getattr(user, 'email', str(user))
    user_name = getattr(user, 'get_full_name', lambda: '')() or getattr(user, 'username', str(user))
    tenant_name = getattr(tenant, 'name', None) if tenant else None
    date_str = timezone.now().strftime('%d/%m/%Y %H:%M')
    monthly_price = getattr(addon, 'monthly_price', None)
    price_str = f"${monthly_price:,.2f} MXN/mes" if monthly_price else "N/A"

    _logger.warning(f"[notify_support] INICIO — addon='{addon_name}' user='{user_email}' tenant='{tenant_name}'")

    # 1. Email notification to support team
    try:
        support_email_raw = settings.EMAIL_SUPPORT
        # Extract plain address from "Name <email>" format
        if '<' in support_email_raw:
            support_address = support_email_raw.split('<')[1].rstrip('>')
        else:
            support_address = support_email_raw

        _logger.warning(f"[notify_support] Enviando email a soporte: {support_address}")

        subject = f"🔔 Nueva Suscripción a Add-on: {addon_name}"
        body_lines = [
            f"Se ha registrado una nueva suscripción a un Add-on en Néctar Labs.",
            "",
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            f"  Add-on     : {addon_name}",
            f"  Precio     : {price_str}",
            f"  Cliente    : {user_name} <{user_email}>",
            f"  Tenant     : {tenant_name or 'Sin tenant asignado aún'}",
            f"  Fecha/Hora : {date_str}",
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "",
            "Entra al panel de administración (Business Commander > Add-ons) para asignar "
            "el tenant y activar el módulo.",
        ]
        body = "\n".join(body_lines)

        email = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=get_platform_sender("Néctar Labs Notificaciones"),
            to=[support_address],
        )
        email.send()
        _logger.warning(f"[notify_support] ✓ Email enviado a {support_address} para addon '{addon_name}'.")
    except Exception as email_err:
        _logger.error(f"[notify_support] ✗ Error enviando email de soporte: {email_err}", exc_info=True)

    # 2. Realtime broadcast to admin frontend
    try:
        realtime_url = getattr(settings, 'REALTIME_INTERNAL_URL', 'http://realtime:4001')
        internal_secret = getattr(settings, 'REALTIME_INTERNAL_SECRET', 'nectar-internal-secret')

        _logger.warning(f"[notify_support] Broadcast realtime → {realtime_url}/internal/broadcast-admin")

        payload = _json.dumps({
            "type": "addon_subscription_new",
            "addon_name": addon_name,
            "user_email": user_email,
            "user_name": user_name,
            "tenant_name": tenant_name,
            "price": price_str,
            "timestamp": timezone.now().isoformat(),
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{realtime_url}/internal/broadcast-admin",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Internal-Secret": internal_secret,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            response_body = resp.read().decode()
            _logger.warning(f"[notify_support] ✓ Realtime broadcast OK: {response_body}")
    except Exception as rt_err:
        _logger.error(f"[notify_support] ✗ Error en broadcast realtime: {rt_err}", exc_info=True)

    _logger.warning(f"[notify_support] FIN — addon='{addon_name}'")





def generate_installments_for_contract(contract):
    """
    Generates payment installments for development and design independently.
    """
    from datetime import date, timedelta
    from django.utils import timezone
    from apps.shop.models import PaymentInstallment
    
    if not contract.plan:
        if contract.project_quote:
            # Clean up previous installments
            contract.installments.all().delete()
            
            from decimal import Decimal
            start_date = contract.signed_at.date() if contract.signed_at else timezone.now().date()
            base_amount_half = Decimal(str(contract.project_quote.total_price)) / Decimal('2')
            
            # Installment 1: Anticipo (50%)
            PaymentInstallment.objects.create(
                contract=contract,
                installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                installment_number=1,
                due_date=start_date,
                base_amount=base_amount_half,
                amount=base_amount_half,
                status=PaymentInstallment.Status.PENDING,
                payment_method=contract.payment_commitment_method
            )
            
            # Installment 2: Liquidación contra entrega (50%)
            delivery_date = start_date + timedelta(weeks=contract.project_quote.estimated_delivery_weeks)
            PaymentInstallment.objects.create(
                contract=contract,
                installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                installment_number=2,
                due_date=delivery_date,
                base_amount=base_amount_half,
                amount=base_amount_half,
                status=PaymentInstallment.Status.PENDING,
                payment_method=contract.payment_commitment_method
            )
        return
        
    plan_price = contract.plan.price
    plan_discount = contract.plan.discount_percentage if contract.plan else 0
    promo = contract.promo_code if (contract.promo_code and contract.promo_code.is_valid()) else None
    
    start_date = contract.signed_at.date() if contract.signed_at else timezone.now().date()
    
    # Clean up previous installments
    contract.installments.all().delete()
    
    installments_to_create = []
    
    # 1. Development Installments
    if contract.payment_day == 'WEEKLY_MONDAY':
        base_inst_amount = plan_price / 4
        days_ahead = 0 - start_date.weekday()
        if days_ahead < 0:
            days_ahead += 7
        first_monday = start_date + timedelta(days=days_ahead)
        
        for i in range(1, 25):
            due_date = first_monday + timedelta(weeks=i - 1)
            is_promo = (i == 1 and promo is not None)
            discount = promo.discount_percentage if is_promo else plan_discount
            promo_obj = promo if is_promo else None
            
            inst_amount = base_inst_amount * (1 - discount / 100)
            
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    base_amount=base_inst_amount,
                    discount_percentage=discount,
                    promo_code=promo_obj,
                    amount=inst_amount,
                    status=PaymentInstallment.Status.PENDING,
                    payment_method=contract.payment_commitment_method
                )
            )
    elif contract.payment_day == 'FORTNIGHTLY_1ST_15TH':
        base_inst_amount = plan_price / 2
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
            is_promo = (i == 1 and promo is not None)
            discount = promo.discount_percentage if is_promo else plan_discount
            promo_obj = promo if is_promo else None
            
            inst_amount = base_inst_amount * (1 - discount / 100)
            
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    base_amount=base_inst_amount,
                    discount_percentage=discount,
                    promo_code=promo_obj,
                    amount=inst_amount,
                    status=PaymentInstallment.Status.PENDING,
                    payment_method=contract.payment_commitment_method
                )
            )
    else:
        # Monthly
        base_inst_amount = plan_price
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
            is_promo = (i == 1 and promo is not None)
            discount = promo.discount_percentage if is_promo else plan_discount
            promo_obj = promo if is_promo else None
            
            inst_amount = base_inst_amount * (1 - discount / 100)
            
            installments_to_create.append(
                PaymentInstallment(
                    contract=contract,
                    installment_type=PaymentInstallment.InstallmentType.DEVELOPMENT,
                    installment_number=i,
                    due_date=due_date,
                    base_amount=base_inst_amount,
                    discount_percentage=discount,
                    promo_code=promo_obj,
                    amount=inst_amount,
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
                        base_amount=design_amount,
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
                        base_amount=design_amount,
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
                        base_amount=design_amount,
                        amount=design_amount,
                        status=PaymentInstallment.Status.PENDING,
                        payment_method=contract.payment_commitment_method
                    )
                )
                
    PaymentInstallment.objects.bulk_create(installments_to_create)


def update_remaining_installments_amounts(contract):
    """
    Recalculates the amount for the next PENDING development installment of a contract
    when a promo code is retroactively applied. Note: only updates the next pending installment.
    """
    if not contract.plan:
        return
        
    next_inst = contract.installments.filter(
        installment_type='DEVELOPMENT', 
        status='PENDING'
    ).order_by('due_date').first()
    
    if next_inst and contract.promo_code:
        next_inst.apply_discount(contract.promo_code.discount_percentage, contract.promo_code)


def send_order_confirmation_email(order):
    """
    Envía un correo de confirmación de pedido al cliente final de la tienda de un tenant.
    Soporta ruteo dinámico usando la conexión SMTP del tenant si está configurada.
    """
    try:
        items = list(order.items.all())
        for item in items:
            item.subtotal = item.price * item.quantity

        tenant_name = order.tenant.name if order.tenant else 'Néctar Labs'
        subject = f"🛒 Confirmación de Pedido #{order.id} - {tenant_name}"
        
        context = {
            'order': order,
            'items': items,
            'subject': subject
        }
        
        html_content = render_to_string('shop/emails/order_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        from apps.tenants.utils import get_tenant_email_connection
        connection, from_email = get_tenant_email_connection(order.tenant)
        if not connection:
            from_email = settings.DEFAULT_FROM_EMAIL

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[order.user_email],
            connection=connection
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        logging.getLogger("apps").info(f"Order confirmation email sent for order {order.id} to {order.user_email}")
        return True
    except Exception as e:
        logging.getLogger("apps").error(f"Error sending order confirmation email for order {order.id}: {e}", exc_info=True)
        return False


def send_autofactura_email(user, invoice):
    """
    Sends an email to the tenant owner with their XML and PDF invoice attached.
    Sent from settings.EMAIL_BILLING (facturacion@nectarlabs.dev).
    """
    try:
        recipient_email = user.email
        name = user.get_full_name() or user.username or "Cliente"
        
        subject = f"Factura de tu Suscripción Add-on - Néctar Labs"
        body_text = (
            f"Hola {name},\n\n"
            f"Adjunto encontrarás el XML y PDF de la factura fiscal correspondiente al pago de tu suscripción o add-on en Néctar Labs.\n\n"
            f"Detalles de la Factura:\n"
            f"- Folio Fiscal (UUID SAT): {invoice.uuid_sat}\n"
            f"- Total: ${invoice.total:,.2f} MXN\n\n"
            f"Agradecemos tu confianza y preferencia.\n\n"
            f"Atentamente,\n"
            f"El equipo de Néctar Labs"
        )
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=body_text,
            from_email=get_platform_sender("Néctar Labs Facturación"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_BILLING],
            bcc=[settings.EMAIL_BILLING]
        )
        
        # Attach files from PAC (Facturapi)
        if invoice.xml_file:
            invoice.xml_file.seek(0)
            email.attach(f"Factura_{invoice.uuid_sat}.xml", invoice.xml_file.read(), 'text/xml')
        if invoice.pdf_file:
            invoice.pdf_file.seek(0)
            email.attach(f"Factura_{invoice.uuid_sat}.pdf", invoice.pdf_file.read(), 'application/pdf')
            
        email.send()
        logging.getLogger("apps").info(f"Autofactura email sent to {recipient_email} for invoice {invoice.id}")
        return True
    except Exception as e:
        logging.getLogger("apps").error(f"Error sending autofactura email: {e}", exc_info=True)
        return False


def send_addon_contracted_email(user, addon, subdomain, is_activated=True):
    """
    Sends a confirmation email to the client when they successfully subscribe/contract an Add-on.
    Tells them their request has been received (and whether it is activated or pending).
    """
    try:
        recipient_email = user.email
        name = user.get_full_name() or user.username or "Cliente"
        subject = f"🚀 ¡Tu Add-on {addon.name} está listo! - Néctar Labs" if is_activated else f"⏳ Solicitud de Add-on recibida - Néctar Labs"
        
        portal_url = f"https://{subdomain}.nectarlabs.dev" if subdomain else None
            
        html_content = render_to_string('shop/emails/addon_contracted.html', {
            'subject': subject,
            'name': name,
            'addon': addon,
            'portal_url': portal_url,
            'is_activated': is_activated,
        })
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs Notificaciones"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_CONTACT]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        logging.getLogger("apps").info(f"Addon contracted email sent to {recipient_email} for addon {addon.id} (activated={is_activated})")
        return True
    except Exception as e:
        logging.getLogger("apps").error(f"Error sending addon contracted email: {e}", exc_info=True)
        return False


def send_addon_activated_email(user, addon, subdomain):
    """
    Sends a confirmation email to the client when an admin manually activates their requested Add-on.
    """
    try:
        recipient_email = user.email
        name = user.get_full_name() or user.username or "Cliente"
        subject = f"🚀 ¡Tu Add-on {addon.name} ha sido Activado! - Néctar Labs"
        
        portal_url = f"https://{subdomain}.nectarlabs.dev" if subdomain else None
            
        html_content = render_to_string('shop/emails/addon_activated.html', {
            'subject': subject,
            'name': name,
            'addon': addon,
            'portal_url': portal_url,
        })
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=get_platform_sender("Néctar Labs Notificaciones"),
            to=[recipient_email],
            reply_to=[settings.EMAIL_CONTACT]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        logging.getLogger("apps").info(f"Addon activated email sent to {recipient_email} for addon {addon.id}")
        return True
    except Exception as e:
        logging.getLogger("apps").error(f"Error sending addon activated email: {e}", exc_info=True)
        return False



