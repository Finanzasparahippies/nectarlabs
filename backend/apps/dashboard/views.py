from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone

from .models import Project, TimeLog, FAQ, ServerCost, BusinessExpense, ProjectAdvance
from apps.shop.models import Contract, Order
from .serializers import ProjectSerializer, TimeLogSerializer, FAQSerializer

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
        if user.role == 'DESIGNER':
            return Project.objects.filter(designer=user)
        if user.is_staff or user.role in ['ADMIN', 'DEVELOPER']:
            return Project.objects.all()
        return Project.objects.filter(client=user)

    def check_permissions(self, request):
        super().check_permissions(request)
        user = request.user
        is_staff_or_dev_or_des = user.is_staff or user.role in ['ADMIN', 'DEVELOPER', 'DESIGNER']
        
        if self.action in ['create', 'update', 'partial_update', 'destroy'] and not is_staff_or_dev_or_des:
            self.permission_denied(request, message="No tienes permisos para crear o modificar proyectos.")

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
        if user.role == 'DESIGNER':
            return TimeLog.objects.filter(project__designer=user)
        if user.is_staff:
            return TimeLog.objects.all()
        return TimeLog.objects.filter(project__client=user)

class BusinessStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        # 1. Ventas Totales (MRR de contratos activos + total de órdenes pagadas, EXCLUYE diseño de marca transitorio)
        active_contracts = Contract.objects.filter(is_active=True)
        contracts_mrr = 0
        designer_fees = 0
        for contract in active_contracts:
            plan_price = contract.plan.price if contract.plan else sum(addon.monthly_price for addon in contract.addons.all())
            contracts_mrr += plan_price
            designer_fees += contract.brand_design_price
        
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
        for contract in Contract.objects.filter(is_active=True):
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

            # Ventas de contratos activos firmados hasta este mes (solo precio del plan, excluye diseño de marca transitorio)
            month_contracts = Contract.objects.filter(
                is_active=True,
                signed_at__lte=end_of_month_dt
            )
            
            month_sales = 0
            for contract in month_contracts:
                plan_price = contract.plan.price if contract.plan else sum(addon.monthly_price for addon in contract.addons.all())
                month_sales += plan_price
            
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

        return Response({
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
        })

