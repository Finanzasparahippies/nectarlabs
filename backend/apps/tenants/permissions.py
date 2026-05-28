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
        tenant_id = request.query_params.get('tenant_id') or request.data.get('tenant_id')
        subdomain = request.query_params.get('subdomain') or request.data.get('subdomain')
        
        from apps.tenants.models import Tenant
        import uuid
        
        if tenant_id:
            try:
                tenant = Tenant.objects.filter(id=uuid.UUID(str(tenant_id))).first()
            except (ValueError, TypeError):
                pass
        elif subdomain:
            tenant = Tenant.objects.filter(subdomain=subdomain.lower()).first()

        if not tenant and request.user and request.user.is_authenticated:
            if getattr(request.user, 'tenant', None):
                tenant = request.user.tenant
            elif getattr(request.user, 'role', None) == 'BUSINESS':
                tenant = request.user.owned_tenants.first()

        # If no tenant could be resolved from parameters or user context, allow access for the main platform
        if not tenant_id and not subdomain and not tenant:
            return True

        # Si no se puede resolver un inquilino válido (pero se especificó uno), denegar acceso
        if not tenant:
            return False

        # Gated access: If tenant is inactive, raise PermissionDenied with descriptive message
        if not tenant.is_active:
            raise PermissionDenied(
                "Tu portal se encuentra en estado 'Reservado'. El acceso estará suspendido hasta verificar el pago del plan correspondiente."
            )

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
