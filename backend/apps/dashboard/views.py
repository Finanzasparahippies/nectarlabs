from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone

from .models import Project, TimeLog, FAQ, ServerCost, BusinessExpense
from apps.shop.models import Contract, Order
from .serializers import ProjectSerializer, TimeLogSerializer, FAQSerializer

class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Project.objects.all()
        return Project.objects.filter(client=user)

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

class TimeLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return TimeLog.objects.all()
        return TimeLog.objects.filter(project__client=user)

class BusinessStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        # 1. Ventas Totales (MRR de contratos activos + extras + total de órdenes pagadas)
        active_contracts = Contract.objects.filter(is_active=True)
        contracts_mrr = 0
        for contract in active_contracts:
            contracts_mrr += contract.plan.price
            contracts_mrr += contract.brand_design_price
        
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

        # 3. Utilidad Neta y Margen
        net_profit = gross_sales - total_costs
        margin = (net_profit / gross_sales * 100) if gross_sales > 0 else 0

        # 4. Calendario de Cashflow (Cobros a clientes y servidores)
        client_billing = []
        for contract in Contract.objects.filter(is_active=True):
            if contract.next_payment_date:
                days_left = (contract.next_payment_date - timezone.now().date()).days
                status_label = "overdue" if days_left < 0 else ("upcoming" if days_left <= 7 else "paid")
                client_billing.append({
                    "id": contract.id,
                    "client": contract.full_name,
                    "plan": contract.plan.name,
                    "amount": float(contract.plan.price + contract.brand_design_price),
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
            
        # 5. Tendencia mensual simulada de ingresos
        monthly_trend = [
            {"month": "Ene", "sales": gross_sales * 0.85, "costs": total_costs * 0.90, "profit": (gross_sales * 0.85) - (total_costs * 0.90)},
            {"month": "Feb", "sales": gross_sales * 0.90, "costs": total_costs * 0.92, "profit": (gross_sales * 0.90) - (total_costs * 0.92)},
            {"month": "Mar", "sales": gross_sales * 0.95, "costs": total_costs * 0.95, "profit": (gross_sales * 0.95) - (total_costs * 0.95)},
            {"month": "Abr", "sales": gross_sales, "costs": total_costs, "profit": net_profit},
        ]

        return Response({
            "financials": {
                "gross_sales": gross_sales,
                "total_costs": total_costs,
                "net_profit": net_profit,
                "margin": margin
            },
            "client_billing": client_billing,
            "server_billing": server_billing,
            "monthly_trend": monthly_trend
        })

