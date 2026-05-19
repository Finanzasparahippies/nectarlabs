from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django.db.models import Avg, Max, Count
from .models import PerformanceMetric, ServerRequestLog
from .serializers import PerformanceMetricSerializer

class PerformanceViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action == 'get_summary':
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=False, methods=['post'], url_path='vitals')
    def report_vitals(self, request):
        """Endpoint for the frontend to report Web Vitals."""
        serializer = PerformanceMetricSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user_agent=request.META.get('HTTP_USER_AGENT', ''))
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='summary')
    def get_summary(self, request):
        """Returns a summary of performance metrics for the admin dashboard."""
        server_summary = ServerRequestLog.objects.aggregate(
            avg_response_time=Avg('response_time'),
            max_response_time=Max('response_time'),
            avg_queries=Avg('query_count'),
            total_requests=Count('id')
        )
        
        vitals_summary = PerformanceMetric.objects.values('name').annotate(
            avg_value=Avg('value'),
            count=Count('id')
        )

        slowest_endpoints = ServerRequestLog.objects.values('path').annotate(
            avg_time=Avg('response_time')
        ).order_by('-avg_time')[:10]

        return Response({
            'server': {
                'avg_response_time': server_summary['avg_response_time'] or 0,
                'max_response_time': server_summary['max_response_time'] or 0,
                'avg_queries': server_summary['avg_queries'] or 0,
                'total_requests': server_summary['total_requests'] or 0
            },
            'vitals': vitals_summary,
            'slowest_endpoints': slowest_endpoints
        })
