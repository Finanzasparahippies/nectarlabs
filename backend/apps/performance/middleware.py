import time
from django.db import connection
from .models import ServerRequestLog

class PerformanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # We don't want to log performance requests themselves or static files
        if request.path.startswith('/api/performance/') or request.path.startswith('/static/'):
            return self.get_response(request)

        start_time = time.time()
        initial_queries = len(connection.queries)

        response = self.get_response(request)

        duration = time.time() - start_time
        final_queries = len(connection.queries)
        query_count = final_queries - initial_queries

        # Determine if the tenant has 'analytics-apm' addon active
        has_apm = False
        try:
            tenant = None
            # 1. Resolve tenant from authenticated user
            if hasattr(request, 'user') and request.user and request.user.is_authenticated:
                if getattr(request.user, 'tenant', None):
                    tenant = request.user.tenant
                elif getattr(request.user, 'role', None) == 'BUSINESS':
                    tenant = request.user.owned_tenants.first()

            # 2. Resolve tenant from host header
            if not tenant:
                host = request.get_host().lower()
                host_parts = host.split('.')
                if len(host_parts) >= 3:
                    potential_sub = host_parts[0]
                    if potential_sub not in ['www', 'api', 'admin', 'staging']:
                        from apps.tenants.models import Tenant
                        tenant = Tenant.objects.filter(subdomain=potential_sub, is_active=True).first()

            # 3. Resolve from query parameters
            if not tenant:
                tenant_id = request.GET.get('tenant_id')
                subdomain = request.GET.get('subdomain')
                from apps.tenants.models import Tenant
                import uuid
                if tenant_id:
                    try:
                        tenant = Tenant.objects.filter(id=uuid.UUID(str(tenant_id)), is_active=True).first()
                    except (ValueError, TypeError):
                        pass
                elif subdomain:
                    tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()

            if tenant and 'analytics-apm' in tenant.active_addons:
                has_apm = True
        except Exception:
            has_apm = False

        if not has_apm:
            return response

        # Save the log if APM is active for the tenant
        try:
            ServerRequestLog.objects.create(
                path=request.path,
                method=request.method,
                status_code=response.status_code,
                response_time=round(duration, 4),
                query_count=query_count
            )
        except Exception:
            # Avoid breaking the site if logging fails
            pass

        return response

