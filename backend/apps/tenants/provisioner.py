"""
Módulo de Aprovisionamiento Dinámico de Contenedores y Certificados SSL para Nectar Labs SaaS Factory.
Permite orquestar contenedores dedicados por tenant (BYO Stack) en la red 'prod_network'
e interactúa de forma asíncrona y segura con la API de Docker y Certbot/Cloudflare.
"""

import os
import sys
import subprocess
import logging
import urllib.request
import json
from django.conf import settings
from .models import Tenant

logger = logging.getLogger(__name__)

DOCKER_SOCKET_PATH = getattr(settings, 'DOCKER_SOCKET_PATH', '/var/run/docker.sock')
TENANTS_BASE_DIR = getattr(settings, 'TENANTS_BASE_DIR', '/var/www/tenants')
NETWORK_NAME = getattr(settings, 'SHARED_DOCKER_NETWORK', 'prod_network')


def execute_shell_cmd(cmd, cwd=None, timeout=300):
    """
    Ejecuta un comando de shell de manera segura y retorna la salida o lanza una excepción.
    """
    logger.info(f"Ejecutando comando PaaS: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        res = subprocess.run(
            cmd,
            cwd=cwd,
            shell=isinstance(cmd, str),
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if res.returncode != 0:
            logger.error(f"Falla en comando shell ({res.returncode}): {res.stderr}")
            return False, res.stderr
        return True, res.stdout
    except Exception as e:
        logger.error(f"Excepción al ejecutar comando shell: {e}")
        return False, str(e)


def provision_tenant_containers(tenant_slug, action='build'):
    """
    Aprovisiona contenedores de Frontend y Backend dedicados para un Tenant en /var/www/tenants/{slug}/
    o en la ubicación configurada.
    Acciones soportadas: 'build', 'start', 'stop', 'remove'
    """
    backend_name = f"tenant_{tenant_slug}_backend"
    frontend_name = f"tenant_{tenant_slug}_frontend"
    backend_img = f"tenant-{tenant_slug}-backend:latest"
    frontend_img = f"tenant-{tenant_slug}-frontend:latest"

    if action == 'stop':
        logger.info(f"Deteniendo contenedores del tenant '{tenant_slug}'...")
        execute_shell_cmd(["docker", "stop", backend_name, frontend_name])
        return True, "Contenedores detenidos"

    elif action == 'remove':
        logger.info(f"Removiendo contenedores del tenant '{tenant_slug}'...")
        execute_shell_cmd(["docker", "rm", "-f", backend_name, frontend_name])
        return True, f"Contenedores '{backend_name}' y '{frontend_name}' removidos con éxito"

    tenant = Tenant.objects.filter(subdomain=tenant_slug).first()
    if not tenant:
        logger.error(f"No se encontró el tenant con subdominio '{tenant_slug}' en la base de datos.")
        return False, "Tenant no encontrado en la base de datos"

    tenant_dir = os.path.join(TENANTS_BASE_DIR, tenant_slug)
    if not os.path.exists(tenant_dir):
        # Fallback al directorio del proyecto legacy si aplica
        if tenant_slug in ['kores', 'kores-vip'] and os.path.exists('/var/www/premium-ties'):
            tenant_dir = '/var/www/premium-ties'
        else:
            logger.warning(f"Directorio de tenant '{tenant_dir}' no existe. Se creará la estructura base.")
            os.makedirs(tenant_dir, exist_ok=True)

    if action in ['build', 'start']:
        logger.info(f"== Iniciando aprovisionamiento dinámico de contenedores para '{tenant_slug}' ==")

        # 1. Construcción e inicio del Backend del Tenant (si existe Dockerfile en backend/)
        be_path = os.path.join(tenant_dir, 'backend')
        if os.path.exists(os.path.join(be_path, 'Dockerfile')):
            build_be_cmd = ["docker", "build", "-t", backend_img, be_path]
            ok_be_build, out_be = execute_shell_cmd(build_be_cmd)
            if not ok_be_build:
                return False, f"Error al construir imagen de backend: {out_be}"

            # Run backend container
            run_be_cmd = [
                "docker", "run", "-d",
                "--name", backend_name,
                "--network", NETWORK_NAME,
                "--restart", "always",
                backend_img
            ]
            # Detener y remover previo si existe
            subprocess.run(["docker", "rm", "-f", backend_name], capture_output=True)
            ok_be_run, out_be_run = execute_shell_cmd(run_be_cmd)
            if not ok_be_run:
                return False, f"Error al arrancar contenedor de backend: {out_be_run}"

        # 2. Construcción e inicio del Frontend del Tenant (si existe Dockerfile en frontend/)
        fe_path = os.path.join(tenant_dir, 'frontend')
        if os.path.exists(os.path.join(fe_path, 'Dockerfile')):
            build_fe_cmd = ["docker", "build", "-t", frontend_img, fe_path]
            ok_fe_build, out_fe = execute_shell_cmd(build_fe_cmd)
            if not ok_fe_build:
                return False, f"Error al construir imagen de frontend: {out_fe}"

            # Run frontend container
            run_fe_cmd = [
                "docker", "run", "-d",
                "--name", frontend_name,
                "--network", NETWORK_NAME,
                "--restart", "always",
                frontend_img
            ]
            subprocess.run(["docker", "rm", "-f", frontend_name], capture_output=True)
            ok_fe_run, out_fe_run = execute_shell_cmd(run_fe_cmd)
            if not ok_fe_run:
                return False, f"Error al arrancar contenedor de frontend: {out_fe_run}"

        # Actualizar URLs de conexión en el Tenant
        tenant.custom_frontend_url = f"http://{frontend_name}:3000"
        tenant.custom_backend_url = f"http://{backend_name}:8000/api"
        tenant.save(update_fields=['custom_frontend_url', 'custom_backend_url'])
        logger.info(f"[✓] Contenedores aprovisionados e integrados para tenant '{tenant_slug}'")
        return True, "Aprovisionamiento completado con éxito"

    return False, "Acción desconocida"


def request_ssl_certificate(domain, email="soporte@nectarlabs.dev"):
    """
    Solicita o renueva un certificado SSL dinámico con Let's Encrypt / Certbot
    para dominios personalizados de Tenants (BYO Domain).
    Utiliza el binario 'certbot' si está presente, o ejecuta el contenedor certbot/certbot vía Docker.
    """
    if not domain or 'nectarlabs.dev' in domain:
        return True, "Dominio del sistema no requiere Certbot individual"

    logger.info(f"🔒 Solicitando certificado SSL para dominio personalizado: {domain}")

    # Verificar si certbot binario local existe
    import shutil
    if shutil.which("certbot"):
        certbot_cmd = [
            "certbot", "certonly", "--nginx",
            "--non-interactive", "--agree-tos",
            "-m", email,
            "-d", domain,
            "-d", f"www.{domain}"
        ]
    else:
        # Fallback ejecutando contenedor certbot/certbot vía Docker socket
        certbot_cmd = [
            "docker", "run", "--rm",
            "-v", "/etc/letsencrypt:/etc/letsencrypt",
            "-v", "/var/www/certbot:/var/www/certbot",
            "certbot/certbot", "certonly",
            "--webroot", "--webroot-path=/var/www/certbot",
            "--non-interactive", "--agree-tos",
            "-m", email,
            "-d", domain,
            "-d", f"www.{domain}"
        ]

    ok, out = execute_shell_cmd(certbot_cmd)
    if ok:
        logger.info(f"Certificado SSL emitido e instalado con éxito para {domain}")
        # Recargar Nginx central
        subprocess.run(["docker", "exec", "prod_nginx", "nginx", "-s", "reload"], capture_output=True)
        return True, "Certificado SSL emitido correctamente"
    else:
        logger.warning(f"Falla al solicitar certificado SSL para {domain}: {out}")
        return False, out
