from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone

from .models import Project, TimeLog, FAQ, ServerCost, BusinessExpense, ProjectAdvance, ProjectQuote, Lead, LeadAppointment
from apps.shop.models import Contract, Order
from .serializers import ProjectSerializer, TimeLogSerializer, FAQSerializer, ProjectQuoteSerializer, LeadSerializer, LeadAppointmentSerializer


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    # (FAQ code remains unchanged)
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Project.objects.select_related(
            'client', 'designer', 'plan', 'designer_plan'
        ).prefetch_related(
            'logs', 'logs__user', 'advances', 'advances__delivered_by'
        )
        if user.role == 'DESIGNER':
            return base_queryset.filter(designer=user)
        if user.is_staff or user.role in ['ADMIN', 'DEVELOPER']:
            return base_queryset.all()
        return base_queryset.filter(client=user)

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        is_admin = user.is_staff or user.role == 'ADMIN'
        is_admin_or_business = is_admin or user.role == 'BUSINESS'
        
        if self.action == 'destroy' and not is_admin:
            self.permission_denied(request, message="No tienes permisos para eliminar proyectos.")
            
        if self.action in ['create', 'update', 'partial_update']:
            is_allowed = is_admin_or_business or (user.role == 'DESIGNER' and self.action in ['update', 'partial_update'])
            if not is_allowed:
                self.permission_denied(request, message="No tienes permisos para realizar esta acción sobre proyectos.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'DESIGNER':
            serializer.save(
                designer=user,
                plan=None,
                designer_plan=None
            )
        else:
            serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == 'DESIGNER':
            original_project = self.get_object()
            serializer.save(
                designer=user,
                plan=original_project.plan,
                designer_plan=original_project.designer_plan
            )
        else:
            serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def business_metrics(self, request):
        total_projects = Project.objects.count()
        active_projects = Project.objects.filter(is_active=True).count()
        total_hours = TimeLog.objects.aggregate(Sum('hours'))['hours__sum'] or 0
        
        return Response({
            'total_projects': total_projects,
            'active_projects': active_projects,
            'total_billable_hours': total_hours,
        })

    @action(detail=True, methods=['post'])
    def start_activity(self, request, pk=None):
        project = self.get_object()
        if not (request.user.is_staff or request.user.role in ['ADMIN', 'DEVELOPER', 'DESIGNER']):
            return Response({"error": "No tienes permiso para registrar actividades."}, status=status.HTTP_403_FORBIDDEN)
        
        if project.current_activity_start:
            return Response({"error": "Ya hay una actividad activa en este proyecto."}, status=status.HTTP_400_BAD_REQUEST)
        
        description = request.data.get('description', '')
        project.current_activity_start = timezone.now()
        project.current_activity_description = description
        project.save()
        
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def stop_activity(self, request, pk=None):
        project = self.get_object()
        if not (request.user.is_staff or request.user.role in ['ADMIN', 'DEVELOPER', 'DESIGNER']):
            return Response({"error": "No tienes permiso para registrar actividades."}, status=status.HTTP_403_FORBIDDEN)
        
        if not project.current_activity_start:
            return Response({"error": "No hay ninguna actividad activa en este proyecto."}, status=status.HTTP_400_BAD_REQUEST)
        
        start_time = project.current_activity_start
        end_time = timezone.now()
        elapsed_seconds = (end_time - start_time).total_seconds()
        hours = max(0.01, round(elapsed_seconds / 3600.0, 2))
        
        description = project.current_activity_description or "Desarrollo y soporte"
        
        # Create TimeLog
        TimeLog.objects.create(
            project=project,
            user=request.user,
            date=end_time.date(),
            hours=hours,
            description=description
        )
        
        # Reset activity
        project.current_activity_start = None
        project.current_activity_description = None
        project.save()
        
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def deliver_advance(self, request, pk=None):
        project = self.get_object()
        if not (request.user.is_staff or request.user.role in ['ADMIN', 'DEVELOPER', 'DESIGNER']):
            return Response({"error": "No tienes permiso para registrar avances."}, status=status.HTTP_403_FORBIDDEN)
        
        milestone = request.data.get('milestone')
        title = request.data.get('title')
        description = request.data.get('description')
        
        if not milestone or not title or not description:
            return Response({"error": "Milestone, title y description son campos obligatorios."}, status=status.HTTP_400_BAD_REQUEST)
            
        unlocked = project.unlocked_milestones
        if milestone not in unlocked:
            return Response({"error": f"El avance del {milestone}% no está disponible para entregar en este momento."}, status=status.HTTP_400_BAD_REQUEST)
            
        ProjectAdvance.objects.create(
            project=project,
            milestone=milestone,
            title=title,
            description=description,
            delivered_by=request.user
        )
        
        return Response(ProjectSerializer(project).data)


class TimeLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = TimeLog.objects.select_related('user', 'project')
        if user.role == 'DESIGNER':
            return base_queryset.filter(project__designer=user)
        if user.is_staff:
            return base_queryset.all()
        return base_queryset.filter(project__client=user)

class BusinessStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache_key = 'business_stats_data'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # 1. Ventas Totales (MRR de contratos activos + total de órdenes pagadas + suscripciones activas de addons, EXCLUYE diseño de marca transitorio)
        from apps.shop.models import AddOnSubscription
        active_contracts = Contract.objects.filter(is_active=True).select_related('plan').prefetch_related('addons')
        contracts_mrr = 0
        designer_fees = 0
        counted_user_addons = set()

        for contract in active_contracts:
            if contract.plan:
                plan_price = contract.plan.price
            else:
                plan_price = 0
                for addon in contract.addons.all():
                    plan_price += addon.monthly_price
                    counted_user_addons.add((contract.user_id, addon.id))
            contracts_mrr += plan_price
            designer_fees += contract.brand_design_price

        # Sumar suscripciones de Add-ons activas/trialing que no hayan sido contadas en un contrato sin plan
        addon_subs = AddOnSubscription.objects.filter(status__in=['active', 'trialing']).select_related('addon')
        for sub in addon_subs:
            if (sub.user_id, sub.addon_id) not in counted_user_addons:
                mrr_contribution = sub.price_paid
                if sub.billing_cycle == 'yearly':
                    mrr_contribution = sub.price_paid / 12
                contracts_mrr += mrr_contribution
                counted_user_addons.add((sub.user_id, sub.addon_id))
        
        paid_orders_total = Order.objects.filter(status='PAID').aggregate(Sum('total'))['total__sum'] or 0
        gross_sales = float(contracts_mrr) + float(paid_orders_total)

        # 2. Costos de Infraestructura (Servidores + Gastos)
        active_servers = ServerCost.objects.filter(is_active=True)
        servers_total = 0
        for server in active_servers:
            if server.billing_cycle == 'Yearly':
                servers_total += server.cost / 12
            else:
                servers_total += server.cost
                
        active_expenses = BusinessExpense.objects.filter(is_active=True)
        expenses_total = 0
        for exp in active_expenses:
            if exp.billing_cycle == 'Yearly':
                expenses_total += exp.cost / 12
            else:
                expenses_total += exp.cost

        total_costs = float(servers_total) + float(expenses_total)

        # 3. Utilidad Neta y Margen (Basado exclusivamente en ingresos reales de Néctar Labs)
        net_profit = gross_sales - total_costs
        margin = (net_profit / gross_sales * 100) if gross_sales > 0 else 0

        # 4. Calendario de Cashflow (Cobros a clientes y servidores)
        client_billing = []
        for contract in Contract.objects.filter(is_active=True).select_related('plan').prefetch_related('addons'):
            if contract.next_payment_date:
                days_left = (contract.next_payment_date - timezone.now().date()).days
                status_label = "overdue" if days_left < 0 else ("upcoming" if days_left <= 7 else "paid")
                plan_name = contract.plan.name if contract.plan else 'Módulos/Add-ons'
                plan_price = contract.plan.price if contract.plan else sum(addon.monthly_price for addon in contract.addons.all())
                client_billing.append({
                    "id": contract.id,
                    "client": contract.full_name,
                    "plan": plan_name,
                    "amount": float(plan_price + contract.brand_design_price),
                    "next_payment_date": str(contract.next_payment_date),
                    "days_remaining": days_left,
                    "status": status_label
                })

        # Proyectar fecha de siguiente pago para AddOnSubscriptions y agregarlas al calendario
        import calendar
        import datetime
        today = timezone.now().date()
        for sub in addon_subs:
            created_at = sub.created_at
            if not created_at:
                created_at = timezone.now()
            created_date = created_at.date()
            
            if sub.billing_cycle == 'yearly':
                try:
                    next_payment_date = datetime.date(today.year, created_date.month, created_date.day)
                except ValueError:
                    next_payment_date = datetime.date(today.year, created_date.month, 28)
                if next_payment_date < today:
                    try:
                        next_payment_date = datetime.date(today.year + 1, created_date.month, created_date.day)
                    except ValueError:
                        next_payment_date = datetime.date(today.year + 1, created_date.month, 28)
            else: # monthly
                day = created_date.day
                _, last_day = calendar.monthrange(today.year, today.month)
                candidate_day = min(day, last_day)
                next_payment_date = datetime.date(today.year, today.month, candidate_day)
                if next_payment_date < today:
                    next_m = today.month + 1
                    next_y = today.year
                    if next_m > 12:
                        next_m = 1
                        next_y += 1
                    _, last_day_next = calendar.monthrange(next_y, next_m)
                    candidate_day = min(day, last_day_next)
                    next_payment_date = datetime.date(next_y, next_m, candidate_day)
            
            days_left = (next_payment_date - today).days
            status_label = "overdue" if days_left < 0 else ("upcoming" if days_left <= 7 else "paid")
            client_name = sub.user.get_full_name() or sub.user.username
            client_billing.append({
                "id": f"addon-{sub.id}",
                "client": client_name,
                "plan": f"Complemento: {sub.addon.name}",
                "amount": float(sub.price_paid),
                "next_payment_date": str(next_payment_date),
                "days_remaining": days_left,
                "status": status_label
            })

        server_billing = []
        for server in ServerCost.objects.filter(is_active=True):
            days_left = (server.next_payment_date - timezone.now().date()).days
            status_label = "overdue" if days_left < 0 else ("upcoming" if days_left <= 7 else "paid")
            server_billing.append({
                "id": server.id,
                "provider": server.get_provider_display(),
                "name": server.name,
                "amount": float(server.cost),
                "next_payment_date": str(server.next_payment_date),
                "days_remaining": days_left,
                "status": status_label
            })
            
        # 5. Tendencia mensual real de ingresos y costos basada en base de datos (EXCLUYE diseño transitorio)
        import datetime
        from django.utils.timezone import make_aware

        today = timezone.now().date()
        months = []
        # Generar los últimos 5 meses (desde hace 4 meses hasta el mes actual)
        for i in range(4, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            months.append(datetime.date(y, m, 1))

        monthly_trend = []
        month_names = {
            1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
            7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
        }

        for m_date in months:
            m_year = m_date.year
            m_month = m_date.month
            
            # Fin de mes para límites de fecha
            if m_month == 12:
                next_month = datetime.date(m_year + 1, 1, 1)
            else:
                next_month = datetime.date(m_year, m_month + 1, 1)
            end_of_month = next_month - datetime.timedelta(days=1)
            end_of_month_dt = make_aware(datetime.datetime.combine(end_of_month, datetime.time.max))

            # Ventas de contratos activos firmados hasta este mes (solo precio del plan + addons, excluye diseño de marca transitorio)
            month_contracts = Contract.objects.filter(
                is_active=True,
                signed_at__lte=end_of_month_dt
            ).select_related('plan').prefetch_related('addons')
            
            month_sales = 0
            month_counted = set()
            for contract in month_contracts:
                if contract.plan:
                    plan_price = contract.plan.price
                else:
                    plan_price = 0
                    for addon in contract.addons.all():
                        plan_price += addon.monthly_price
                        month_counted.add((contract.user_id, addon.id))
                month_sales += plan_price

            month_addon_subs = AddOnSubscription.objects.filter(
                status__in=['active', 'trialing'],
                created_at__lte=end_of_month_dt
            ).select_related('addon')
            for sub in month_addon_subs:
                if (sub.user_id, sub.addon_id) not in month_counted:
                    mrr_contribution = sub.price_paid
                    if sub.billing_cycle == 'yearly':
                        mrr_contribution = sub.price_paid / 12
                    month_sales += mrr_contribution
                    month_counted.add((sub.user_id, sub.addon_id))
            
            # Ventas de la tienda en este mes
            month_orders = Order.objects.filter(
                status='PAID',
                created_at__year=m_year,
                created_at__month=m_month
            ).aggregate(Sum('total'))['total__sum'] or 0
            
            total_month_sales = float(month_sales) + float(month_orders)

            # Costos de servidores creados hasta este mes
            month_servers = ServerCost.objects.filter(
                is_active=True,
                created_at__lte=end_of_month_dt
            )
            month_servers_cost = 0
            for server in month_servers:
                if server.billing_cycle == 'Yearly':
                    month_servers_cost += server.cost / 12
                else:
                    month_servers_cost += server.cost

            # Gastos SaaS creados hasta este mes
            month_expenses = BusinessExpense.objects.filter(
                is_active=True,
                created_at__lte=end_of_month_dt
            )
            month_expenses_cost = 0
            for exp in month_expenses:
                if exp.billing_cycle == 'Yearly':
                    month_expenses_cost += exp.cost / 12
                else:
                    month_expenses_cost += exp.cost

            total_month_costs = float(month_servers_cost) + float(month_expenses_cost)
            month_profit = total_month_sales - total_month_costs

            monthly_trend.append({
                "month": month_names[m_month],
                "sales": total_month_sales,
                "costs": total_month_costs,
                "profit": month_profit
            })

        response_data = {
            "financials": {
                "gross_sales": gross_sales,
                "contracts_mrr": float(contracts_mrr),
                "paid_orders_total": float(paid_orders_total),
                "designer_fees": float(designer_fees),
                "total_costs": total_costs,
                "servers_total": float(servers_total),
                "expenses_total": float(expenses_total),
                "net_profit": net_profit,
                "margin": margin
            },
            "client_billing": client_billing,
            "server_billing": server_billing,
            "monthly_trend": monthly_trend
        }

        # Cache data for 1 hour (3600 seconds)
        cache.set(cache_key, response_data, 3600)
        return Response(response_data)

class ProjectQuoteViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectQuoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return ProjectQuote.objects.all().order_by('-created_at')
        if user.role == 'SALES':
            return ProjectQuote.objects.filter(salesperson=user).order_by('-created_at')
        return ProjectQuote.objects.filter(client=user).order_by('-created_at')

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        is_authenticated = user and user.is_authenticated
        is_admin_or_staff = is_authenticated and (user.is_staff or getattr(user, 'role', '') == 'ADMIN')
        is_sales = is_authenticated and getattr(user, 'role', '') == 'SALES'
        
        if self.action in ['create', 'update', 'partial_update', 'destroy'] and not (is_admin_or_staff or is_sales):
            self.permission_denied(request, message="No tienes permisos para gestionar cotizaciones.")

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if getattr(user, 'role', '') == 'SALES' and obj.salesperson != user:
            self.permission_denied(request, message="No tienes acceso a esta cotización.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'SALES':
            serializer.save(salesperson=user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def regenerate_pdf(self, request, pk=None):
        quote = self.get_object()
        from .utils import generate_quote_pdf
        success = generate_quote_pdf(quote)
        if success:
            return Response({'detail': 'PDF regenerado con éxito.', 'pdf_url': quote.pdf_file.url if quote.pdf_file else None})
        return Response({'error': 'Error al generar el PDF.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        quote = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ProjectQuote.Status.values:
            return Response({'error': 'Estado no válido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        quote.status = new_status
        quote.save(update_fields=['status'])

        # Logical contract generation if APPROVED
        if new_status == ProjectQuote.Status.APPROVED:
            from apps.shop.models import Contract
            if not Contract.objects.filter(project_quote=quote).exists():
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = quote.client
                if not user:
                    user = User.objects.filter(email=quote.client_email).first()
                if not user:
                    # Create user account for the client
                    username = quote.client_email.split('@')[0]
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1
                    user = User.objects.create_user(
                        email=quote.client_email,
                        username=username,
                        password=User.objects.make_random_password(),
                        role=User.Role.BUSINESS
                    )
                
                if user.role == User.Role.CUSTOMER:
                    user.role = User.Role.BUSINESS
                    user.save()

                # Create the contract
                contract = Contract.objects.create(
                    user=user,
                    full_name=quote.client_name,
                    project_quote=quote,
                    project_idea=quote.description or f"Desarrollo de proyecto modular: {quote.project_name}",
                    is_fully_signed=False,  # Needs client signature!
                    payment_commitment_method='SPEI'
                )

                # Generate contract PDF and notify client
                from apps.shop.utils import generate_contract_pdf, send_contract_emails
                if generate_contract_pdf(contract):
                    try:
                        send_contract_emails(contract)
                    except Exception as email_err:
                        import logging
                        logging.getLogger(__name__).error(f"Error sending contract emails: {email_err}", exc_info=True)

        return Response({'detail': f'Estado de cotización actualizado a {new_status}.', 'status': quote.status})

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view_pdf(self, request, pk=None):
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    validated_token = JWTAuthentication().get_validated_token(token)
                    user = JWTAuthentication().get_user(validated_token)
                    request.user = user
                    self.request.user = user
                except Exception:
                    from django.http import HttpResponse
                    return HttpResponse("Token no válido o expirado.", status=401)
        
        if not user or not user.is_authenticated:
            from django.http import HttpResponse
            return HttpResponse("No autorizado.", status=401)

        from django.shortcuts import get_object_or_404
        quote = get_object_or_404(ProjectQuote, pk=pk)
        
        is_admin_or_staff = user.is_staff or user.role == 'ADMIN'
        is_sales = user.role == 'SALES'
        
        if user.role == 'SALES' and quote.salesperson != user:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a esta cotización.", status=403)
        elif not is_admin_or_staff and not is_sales and quote.client != user and quote.client_email != user.email:
            from django.http import HttpResponse
            return HttpResponse("No tienes acceso a esta cotización.", status=403)

        if not quote.pdf_file:
            from django.http import HttpResponse
            return HttpResponse("PDF no generado para esta cotización.", status=404)
        
        from django.http import HttpResponse
        try:
            quote.pdf_file.open('rb')
            pdf_content = quote.pdf_file.read()
            quote.pdf_file.close()
            django_response = HttpResponse(pdf_content, content_type='application/pdf')
            django_response['Content-Disposition'] = f'inline; filename="Cotizacion_{quote.id}.pdf"'
            return django_response
        except Exception as e:
            return HttpResponse(f"Error al recuperar el archivo PDF: {e}", status=500)



class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return Lead.objects.all().order_by('-created_at')
        if user.role == 'SALES':
            return Lead.objects.filter(salesperson=user).order_by('-created_at')
        return Lead.objects.none()

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        if not (user.is_staff or user.role in ['ADMIN', 'SALES']):
            self.permission_denied(request, message="No tienes permisos para gestionar prospectos.")

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if user.role == 'SALES' and obj.salesperson != user:
            self.permission_denied(request, message="No tienes acceso a este prospecto.")

    def perform_create(self, serializer):
        if self.request.user.is_staff or self.request.user.role == 'ADMIN':
            salesperson = serializer.validated_data.get('salesperson') or self.request.user
            serializer.save(salesperson=salesperson)
        else:
            serializer.save(salesperson=self.request.user)


from rest_framework import filters
from django.shortcuts import redirect
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.conf import settings
from .utils import send_lead_appointment_email

class LeadAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = LeadAppointmentSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'time']

    def get_permissions(self):
        if self.action in ['create', 'confirm', 'availability']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return LeadAppointment.objects.none()
        if user.is_staff or user.role == 'ADMIN':
            return LeadAppointment.objects.all().order_by('-date', '-time')
        if user.role == 'SALES':
            return LeadAppointment.objects.filter(salesperson=user).order_by('-date', '-time')
        return LeadAppointment.objects.none()

    def perform_create(self, serializer):
        from django.contrib.auth import get_user_model
        from apps.shop.models import AddOn
        from rest_framework.exceptions import ValidationError
        User = get_user_model()

        client_name = self.request.data.get('client_name')
        client_email = self.request.data.get('client_email')
        client_phone = self.request.data.get('client_phone', '')
        addon_slug = self.request.data.get('addon_slug', '')
        addon_slugs = self.request.data.get('addon_slugs', [])
        if isinstance(addon_slugs, str):
            import json
            try:
                addon_slugs = json.loads(addon_slugs)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Error parsing addon_slugs JSON, falling back to string list: {e}")
                addon_slugs = [addon_slugs]
        consulting_type = self.request.data.get('consulting_type', 'general')
        interview_answers = self.request.data.get('interview_answers', {})
        if isinstance(interview_answers, str):
            import json
            try:
                interview_answers = json.loads(interview_answers)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error parsing interview_answers JSON: {e}")
                interview_answers = {}
        notes = self.request.data.get('notes', '')
        date = self.request.data.get('date')
        time = self.request.data.get('time')

        if not client_name or not client_email:
            raise ValidationError({"client_name": "Nombre y email del cliente son requeridos."})

        # 1. Asignar o buscar vendedor
        salesperson = User.objects.filter(role=User.Role.SALES).first()
        if not salesperson:
            salesperson = User.objects.filter(role=User.Role.ADMIN).first()
        if not salesperson:
            salesperson = User.objects.filter(is_staff=True).first()
        if not salesperson:
            salesperson = User.objects.first()

        if not salesperson:
            raise ValidationError({"salesperson": "No hay agentes de ventas registrados para atender la consulta."})

        # Evitar colisión de horario
        if LeadAppointment.objects.filter(salesperson=salesperson, date=date, time=time).exclude(status='CANCELLED').exists():
            other_salespeople = User.objects.filter(role=User.Role.SALES).exclude(id=salesperson.id)
            assigned_new = False
            for os in other_salespeople:
                if not LeadAppointment.objects.filter(salesperson=os, date=date, time=time).exclude(status='CANCELLED').exists():
                    salesperson = os
                    assigned_new = True
                    break
            if not assigned_new:
                raise ValidationError({"time": "Este horario ya no está disponible con nuestros agentes. Por favor selecciona otra hora."})

        # 2. Buscar o crear el Lead
        lead = Lead.objects.filter(email=client_email).first()
        if not lead:
            lead = Lead.objects.create(
                name=client_name,
                email=client_email,
                phone=client_phone,
                project_idea=notes,
                salesperson=salesperson,
                status=Lead.Status.PROSPECT
            )
        else:
            if not lead.phone:
                lead.phone = client_phone
            if not lead.project_idea:
                lead.project_idea = notes
            lead.save()

        # 3. Buscar addon de interés
        addon = None
        if addon_slugs:
            addon = AddOn.objects.filter(slug=addon_slugs[0]).first()
        elif addon_slug:
            addon = AddOn.objects.filter(slug=addon_slug).first()

        # Guardar cita
        appointment = serializer.save(
            lead=lead,
            salesperson=salesperson,
            addon=addon,
            is_confirmed_by_client=False, # Requiere confirmación por correo
            consulting_type=consulting_type,
            interview_answers=interview_answers
        )

        if addon_slugs:
            addons_qs = AddOn.objects.filter(slug__in=addon_slugs)
            appointment.addons.set(addons_qs)
        elif addon:
            appointment.addons.set([addon])

        # Enviar correo de creación / verificación
        send_lead_appointment_email(appointment, email_type='creation')

    @action(detail=False, methods=['get'])
    def confirm(self, request):
        token = request.query_params.get('token')
        if not token:
            return redirect(f"{settings.FRONTEND_URL}/?confirmed=false&reason=missing_token")
        
        signer = TimestampSigner()
        try:
            appointment_id = signer.unsign(token, max_age=86400)
            appointment = LeadAppointment.objects.get(id=appointment_id)
            appointment.is_confirmed_by_client = True
            appointment.status = 'CONFIRMED'
            appointment.save()

            # Activar lead a contactado
            lead = appointment.lead
            if lead.status == Lead.Status.PROSPECT:
                lead.status = Lead.Status.CONTACTED
                lead.save()

            # Enviar correo de confirmación de agenda
            send_lead_appointment_email(appointment, email_type='confirmation')

            return redirect(f"{settings.FRONTEND_URL}/?confirmed=true")
        except (BadSignature, SignatureExpired, LeadAppointment.DoesNotExist):
            return redirect(f"{settings.FRONTEND_URL}/?confirmed=false&reason=invalid_or_expired")

    @action(detail=False, methods=['get'])
    def availability(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import Count
        User = get_user_model()
        salespeople_count = User.objects.filter(role=User.Role.SALES).count()
        if salespeople_count == 0:
            salespeople_count = 1

        busy_slots = LeadAppointment.objects.filter(
            date__gte=timezone.now().date()
        ).exclude(status='CANCELLED').values('date', 'time').annotate(
            num_appointments=Count('id')
        ).filter(num_appointments__gte=salespeople_count)

        return Response(busy_slots)



