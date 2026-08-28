"""
Tareas asíncronas de Celery para la orquestación y el aprovisionamiento no bloqueante de Tenants en Nectar Labs (SaaS Factory).
"""

import logging
try:
    from celery import shared_task
except ImportError:
    # Fallback decorator if celery is not initialized in lightweight mode
    def shared_task(func):
        return func

from .provisioner import provision_tenant_containers, request_ssl_certificate
from .models import Tenant

logger = logging.getLogger(__name__)

@shared_task
def async_provision_tenant_task(tenant_slug, action='build'):
    """
    Tarea asíncrona para construir, levantar o actualizar contenedores de un Tenant
    sin bloquear los hilos HTTP de Gunicorn/Django.
    """
    logger.info(f"⏳ Celery Worker: Iniciando aprovisionamiento asíncrono para '{tenant_slug}' ({action})")
    success, message = provision_tenant_containers(tenant_slug, action=action)
    
    tenant = Tenant.objects.filter(subdomain=tenant_slug).first()
    if tenant:
        if success:
            logger.info(f"✅ Celery Worker: Tenant '{tenant_slug}' aprovisionado con éxito.")
        else:
            logger.error(f"❌ Celery Worker: Falla al aprovisionar tenant '{tenant_slug}': {message}")
            
    return {"status": "success" if success else "error", "message": message}


@shared_task
def async_request_ssl_task(domain, email="soporte@nectarlabs.dev"):
    """
    Tarea asíncrona para emitir certificados SSL con Let's Encrypt para dominios BYO.
    """
    logger.info(f"🔒 Celery Worker: Solicitando certificado SSL para dominio '{domain}'...")
    success, message = request_ssl_certificate(domain, email=email)
    return {"status": "success" if success else "error", "message": message}
