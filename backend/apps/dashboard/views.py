from rest_framework import viewsets, permissions
from rest_framework.decorators import action

from .models import Project, TimeLog, FAQ
from .serializers import ProjectSerializer, TimeLogSerializer, FAQSerializer

class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer

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
        from django.db.models import Sum, Count
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

