"""
Utilidades de resolución multi-tenant, invalidación de caché Redis y enrutamiento SMTP en Nectar-Labs.
"""

import uuid
import logging
from django.core.cache import cache
from django.conf import settings
from django.core.mail import get_connection

logger = logging.getLogger(__name__)

def get_platform_sender(sender_name="Néctar Labs"):
    """
    Retorna el remitente formateado para la plataforma matriz de Nectar Labs.
    """
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "soporte@nectarlabs.dev")
    if "<" in default_from:
        email_addr = default_from.split("<")[1].replace(">", "").strip()
    else:
        email_addr = default_from.strip()
    return f"{sender_name} <{email_addr}>"


def get_tenant_email_connection(tenant):
    """
    Obtiene la conexión SMTP y la dirección de envío (from_email) correspondiente al Tenant.
    1. Si el Tenant configuró su propio servidor SMTP (BYO SMTP), usa sus credenciales.
    2. Si el Tenant tiene contrato activo de pago, enruta vía Amazon SES.
    3. Para usuarios gratuitos/trial, usa la infraestructura de Brevo.
    4. Fallback a la conexión del sistema si no hay credenciales disponibles.
    """
    smtp_backend = "django.core.mail.backends.smtp.EmailBackend"

    # 1. BYO SMTP
    if tenant and tenant.custom_smtp_host and tenant.custom_smtp_username and tenant.custom_smtp_password:
        from_email = tenant.custom_smtp_from_email or f"{tenant.name} <{tenant.custom_smtp_username}>"
        connection = get_connection(
            backend=smtp_backend,
            host=tenant.custom_smtp_host,
            port=tenant.custom_smtp_port or 587,
            username=tenant.custom_smtp_username,
            password=tenant.custom_smtp_password,
            use_tls=tenant.custom_smtp_use_tls,
        )
        return connection, from_email

    # 2. Contrato de pago -> Amazon SES
    if tenant and tenant.has_active_plan_contract:
        ses_user = getattr(settings, "SES_EMAIL_HOST_USER", "")
        ses_pass = getattr(settings, "SES_EMAIL_HOST_PASSWORD", "")
        ses_host = getattr(settings, "SES_EMAIL_HOST", "")
        ses_port = getattr(settings, "SES_EMAIL_PORT", 587)
        ses_use_tls = getattr(settings, "SES_EMAIL_USE_TLS", True)
        from_email = getattr(settings, "SES_DEFAULT_FROM_EMAIL", f"{tenant.name} <notificaciones@nectarlabs.dev>")

        if ses_user and ses_pass and ses_host:
            connection = get_connection(
                backend=smtp_backend,
                host=ses_host,
                port=ses_port,
                username=ses_user,
                password=ses_pass,
                use_tls=ses_use_tls,
            )
            return connection, from_email

    # 3. Brevo fallback
    brevo_user = getattr(settings, "BREVO_EMAIL_HOST_USER", "")
    brevo_pass = getattr(settings, "BREVO_EMAIL_HOST_PASSWORD", "")
    brevo_host = getattr(settings, "BREVO_EMAIL_HOST", "")
    brevo_port = getattr(settings, "BREVO_EMAIL_PORT", 587)
    brevo_use_tls = getattr(settings, "BREVO_EMAIL_USE_TLS", True)
    from_email = getattr(settings, "BREVO_DEFAULT_FROM_EMAIL", f"{tenant.name if tenant else 'Néctar Labs'} <notificaciones@nectarlabs.dev>")

    if brevo_user and brevo_pass and brevo_host:
        connection = get_connection(
            backend=smtp_backend,
            host=brevo_host,
            port=brevo_port,
            username=brevo_user,
            password=brevo_pass,
            use_tls=brevo_use_tls,
        )
        return connection, from_email

    # 4. Fallback final si faltan credenciales
    return None, f"{tenant.name if tenant else 'Néctar Labs'} <soporte@nectarlabs.dev>"



def get_tenant_from_request(request):
    """
    Resuelve la instancia del Inquilino (Tenant) a partir de la petición HTTP.
    Inspecciona en orden:
    1. Query/Body `tenant_id` (UUID)
    2. Query/Body `api_key` (UUID)
    3. Query `subdomain`
    4. Query/Header `host` / `Host` / `X-Forwarded-Host` (subdominio o dominio personalizado)
    5. Header `HTTP_REFERER`
    """
    from .models import Tenant

    tenant_id = request.query_params.get('tenant_id') or getattr(request, 'data', {}).get('tenant_id')
    api_key = request.query_params.get('api_key') or getattr(request, 'data', {}).get('api_key')
    subdomain = request.query_params.get('subdomain')
    host_param = request.query_params.get('host')
    
    # 1. Búsqueda por tenant_id (UUID)
    if tenant_id:
        try:
            tenant = Tenant.objects.filter(id=uuid.UUID(str(tenant_id)), is_active=True).first()
            if tenant:
                return tenant
        except (ValueError, TypeError):
            pass

    # 2. Búsqueda por api_key (UUID)
    if api_key:
        try:
            tenant = Tenant.objects.filter(api_key=uuid.UUID(str(api_key)), is_active=True).first()
            if tenant:
                return tenant
        except (ValueError, TypeError):
            pass

    # 3. Búsqueda por parámetro subdomain
    if subdomain:
        clean_subdomain = str(subdomain).lower().strip()
        tenant = Tenant.objects.filter(subdomain__iexact=clean_subdomain, is_active=True).first()
        if tenant:
            return tenant

    # 4. Resolución por host (parámetro query u Host header)
    raw_host = host_param or request.META.get('HTTP_X_FORWARDED_HOST') or request.META.get('HTTP_HOST') or ''
    if raw_host:
        host = raw_host.split(',')[0].strip().lower()
        clean_host = host.replace('http://', '').replace('https://', '').rstrip('/')
        clean_host_no_port = clean_host.split(':')[0]

        # Ignorar peticiones directas dirigidas a dominios raíz del sistema (www, api, admin, staging, testserver)
        system_hosts = {
            'testserver', 'localhost', '127.0.0.1', 'frontend', 'frontend-staging',
            'www.nectarlabs.dev', 'api.nectarlabs.dev', 'admin.nectarlabs.dev', 'staging.nectarlabs.dev',
            'nectarlabs.dev', 'www.nectarlabs.localhost', 'nectarlabs.localhost'
        }
        
        if clean_host_no_port not in system_hosts:
            # 4a. Búsqueda por subdominio slug directo
            tenant = Tenant.objects.filter(subdomain__iexact=clean_host_no_port, is_active=True).first()
            if tenant:
                return tenant

            # 4b. Búsqueda por dominio personalizado exacto
            tenant = Tenant.objects.filter(custom_domain__iexact=clean_host_no_port, is_active=True).first()
            if tenant:
                return tenant

            # 4c. Si viene prefijo staging (ej: staging.kores.vip -> kores.vip)
            if clean_host_no_port.startswith('staging.'):
                bare_domain = clean_host_no_port[8:]
                tenant = Tenant.objects.filter(custom_domain__iexact=bare_domain, is_active=True).first()
                if tenant:
                    return tenant

            # 4d. Extraer primer token relevante si es subdominio (ej: tenanta.nectarlabs.dev -> tenanta)
            if '.' in clean_host_no_port:
                parts = clean_host_no_port.split('.')
                ignored_tokens = {'www', 'api', 'admin', 'staging', 'nectarlabs', 'dev', 'localhost', 'com', 'vip', 'mx', 'org', 'net'}
                for part in parts:
                    if part and part not in ignored_tokens:
                        tenant = Tenant.objects.filter(subdomain__iexact=part, is_active=True).first()
                        if tenant:
                            return tenant
                        tenant = Tenant.objects.filter(custom_domain__icontains=part, is_active=True).first()
                        if tenant:
                            return tenant


    # 4. Fallback por Referer
    referer = request.META.get('HTTP_REFERER')
    if referer:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            ref_host = parsed.netloc.split(':')[0].lower()
            if ref_host.startswith('www.'):
                ref_host = ref_host[4:]
            tenant = Tenant.objects.filter(custom_domain__iexact=ref_host, is_active=True).first()
            if not tenant:
                first_part = ref_host.split('.')[0]
                if first_part not in {'localhost', 'staging', 'www', 'nectarlabs'}:
                    tenant = Tenant.objects.filter(subdomain__iexact=first_part, is_active=True).first()
            if tenant:
                return tenant
        except Exception:
            pass

    return None


def invalidate_tenant_cache(tenant):
    """
    Invalida las claves de caché en Redis para el inquilino especificado.
    Se ejecuta automáticamente vía señales post_save / post_delete al actualizar páginas o configuración.
    """
    if not tenant:
        return
        
    try:
        keys_to_delete = []
        identifiers = [
            str(tenant.id).lower(),
            str(tenant.subdomain).lower(),
        ]
        if tenant.custom_domain:
            identifiers.append(str(tenant.custom_domain).lower())
            
        for ident in identifiers:
            keys_to_delete.extend([
                f"tenant_pubcfg_{ident}_none_none_none",
                f"tenant_pubcfg_none_{ident}_none_none",
                f"tenant_pubcfg_{ident}_*",
                f"tenant_pages_{ident}",
            ])
            
        if hasattr(cache, 'delete_pattern'):
            for ident in identifiers:
                cache.delete_pattern(f"*tenant_pubcfg_{ident}*")
                cache.delete_pattern(f"*tenant_pages_{ident}*")
        else:
            for k in keys_to_delete:
                cache.delete(k)
                
        logger.info(f"Caché de Redis invalidada correctamente para el tenant '{tenant.subdomain}'")
    except Exception as e:
        logger.warning(f"Falla al invalidar caché para tenant {tenant.subdomain}: {e}")
