from rest_framework import permissions
from django.core.exceptions import PermissionDenied

class HasAddOnPermission(permissions.BasePermission):
    """
    Permiso para restringir endpoints de APIs a tenants que tengan contratado el Add-on correspondiente.
    """
    def has_permission(self, request, view):
        # Permitir acceso incondicional a administradores del sistema (staff)
        if request.user and (request.user.is_staff or getattr(request.user, 'role', None) == 'ADMIN'):
            return True

        # Determinar el contexto del Tenant actual
        tenant = None
        if request.user and request.user.is_authenticated:
            if getattr(request.user, 'tenant', None):
                tenant = request.user.tenant
            elif getattr(request.user, 'role', None) == 'BUSINESS':
                # Si el dueño del negocio realiza la petición
                tenant = request.user.owned_tenants.first()

        # Si no se pudo obtener del usuario (por ejemplo, en vistas públicas y anónimas),
        # intentar extraer de los parámetros de la consulta o del cuerpo de la petición.
        if not tenant:
            tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')
            subdomain = request.query_params.get('subdomain') or request.data.get('subdomain')
            from apps.tenants.models import Tenant
            import uuid
            if tenant_id:
                try:
                    tenant = Tenant.objects.filter(id=uuid.UUID(str(tenant_id)), is_active=True).first()
                except (ValueError, TypeError):
                    pass
            elif subdomain:
                tenant = Tenant.objects.filter(subdomain=subdomain.lower(), is_active=True).first()
            else:
                # No tenant parameters supplied; allow access for the main/host platform
                return True

        # Si no se puede resolver un inquilino válido (pero se especificó uno), denegar acceso
        if not tenant:
            return False

        # Obtener el slug del add-on requerido para esta vista
        addon_slug = getattr(view, 'addon_slug', None)
        if not addon_slug:
            return True  # Vista no requiere add-on específico

        # Verificar si el add-on está activo en el contrato del tenant
        if addon_slug not in tenant.active_addons:
            raise PermissionDenied(
                f"El módulo/add-on '{addon_slug}' no está habilitado para tu portal. "
                "Por favor solicítalo en la sección de Catálogo de Add-ons."
            )

        return True
