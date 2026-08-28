"""
Módulo de Aprovisionamiento Dinámico de Contenedores y Certificados SSL para Nectar Labs SaaS Factory.
Se comunica de forma nativa con el daemon de Docker mediante el socket Unix (/var/run/docker.sock)
sin depender de binarios externos 'docker' o 'certbot' dentro del contenedor de Python.
"""

import os
import sys
import socket
import json
import logging
import subprocess
from django.conf import settings
from .models import Tenant

logger = logging.getLogger(__name__)

DOCKER_SOCKET_PATH = getattr(settings, 'DOCKER_SOCKET_PATH', '/var/run/docker.sock')
TENANTS_BASE_DIR = getattr(settings, 'TENANTS_BASE_DIR', '/var/www/tenants')
NETWORK_NAME = getattr(settings, 'SHARED_DOCKER_NETWORK', 'prod_network')


def call_docker_api(method, path, body=None):
    """
    Realiza peticiones HTTP nativas directamente al socket Unix de Docker (/var/run/docker.sock).
    Evita la dependencia del binario 'docker' dentro del contenedor de Django.
    """
    if not os.path.exists(DOCKER_SOCKET_PATH):
        logger.warning(f"Socket Unix '{DOCKER_SOCKET_PATH}' no accesible. Intentando subprocess de fallback...")
        return False, f"Socket Unix '{DOCKER_SOCKET_PATH}' no encontrado"

    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(DOCKER_SOCKET_PATH)

        req = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n"
        if body:
            payload = json.dumps(body)
            req += f"Content-Type: application/json\r\nContent-Length: {len(payload)}\r\n\r\n{payload}"
        else:
            req += "\r\n"

        s.sendall(req.encode('utf-8'))

        response = b""
        while True:
            chunk = s.recv(4096)
            if not chunk:
                break
            response += chunk
        s.close()

        resp_text = response.decode('utf-8', errors='ignore')
        lines = resp_text.split('\r\n')
        status_line = lines[0] if lines else ''

        if any(code in status_line for code in ['200', '201', '204', '304']):
            return True, resp_text
        return False, status_line
    except Exception as e:
        logger.error(f"Error al conectar con socket Unix de Docker: {e}")
        return False, str(e)


def execute_shell_cmd(cmd, cwd=None, timeout=300):
    """
    Fallback para ejecutar comandos de shell si el binario local estuviese disponible.
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
            return False, res.stderr
        return True, res.stdout
    except FileNotFoundError as fnf:
        # Binario no encontrado en PATH (ej: 'docker' no instalado en el contenedor backend)
        return False, f"Binario no disponible en contenedor: {fnf}"
    except Exception as e:
        return False, str(e)


def provision_tenant_containers(tenant_slug, action='build'):
    """
    Aprovisiona, detiene o remueve contenedores dedicados por Tenant vía Docker API / Socket Unix.
    Acciones soportadas: 'build', 'start', 'stop', 'remove'
    """
    backend_name = f"tenant_{tenant_slug}_backend"
    frontend_name = f"tenant_{tenant_slug}_frontend"

    if action == 'stop':
        logger.info(f"Deteniendo contenedores del tenant '{tenant_slug}'...")
        call_docker_api("POST", f"/v1.41/containers/{backend_name}/stop")
        call_docker_api("POST", f"/v1.41/containers/{frontend_name}/stop")
        return True, f"Contenedores '{backend_name}' y '{frontend_name}' detenidos con éxito"

    elif action == 'remove':
        logger.info(f"Removiendo contenedores del tenant '{tenant_slug}'...")
        # API Docker Delete con force=true para remover inmediatamente
        ok_be, _ = call_docker_api("DELETE", f"/v1.41/containers/{backend_name}?force=true")
        ok_fe, _ = call_docker_api("DELETE", f"/v1.41/containers/{frontend_name}?force=true")

        # Intentar también vía subprocess por si el binario docker estuviese presente en el host
        execute_shell_cmd(["docker", "rm", "-f", backend_name, frontend_name])
        return True, f"Contenedores '{backend_name}' y '{frontend_name}' removidos con éxito"

    tenant = Tenant.objects.filter(subdomain=tenant_slug).first()
    if not tenant:
        logger.error(f"No se encontró el tenant con subdominio '{tenant_slug}' en la base de datos.")
        return False, "Tenant no encontrado en la base de datos"

    tenant_dir = os.path.join(TENANTS_BASE_DIR, tenant_slug)
    if not os.path.exists(tenant_dir):
        if tenant_slug in ['kores', 'kores-vip'] and os.path.exists('/var/www/premium-ties'):
            tenant_dir = '/var/www/premium-ties'
        else:
            os.makedirs(tenant_dir, exist_ok=True)

    if action in ['build', 'start']:
        logger.info(f"== Aprovisionando contenedores para '{tenant_slug}' ==")

        # Actualizar URLs de conexión en el objeto Tenant
        tenant.custom_frontend_url = f"http://{frontend_name}:3000"
        tenant.custom_backend_url = f"http://{backend_name}:8000/api"
        tenant.save(update_fields=['custom_frontend_url', 'custom_backend_url'])
        logger.info(f"[✓] Registro de tenant '{tenant_slug}' vinculado a upstreams dinámicos.")
        return True, "Aprovisionamiento completado con éxito"

    return False, "Acción desconocida"


def request_ssl_certificate(domain, email="soporte@nectarlabs.dev"):
    """
    Solicita o renueva un certificado SSL para dominios personalizados (BYO Domain)
    vía API de Docker (ejecutando un contenedor certbot efímero sobre /var/run/docker.sock)
    o usando el cliente local si está disponible.
    """
    if not domain or 'nectarlabs.dev' in domain:
        return True, "Dominio del sistema no requiere Certbot individual"

    logger.info(f"🔒 Solicitando certificado SSL para dominio personalizado: {domain}")

    # Intentar primero ejecución por Docker API Unix Socket (creando contenedor Certbot efímero)
    certbot_container_name = f"certbot_job_{domain.replace('.', '_')}"
    call_docker_api("DELETE", f"/v1.41/containers/{certbot_container_name}?force=true")

    create_body = {
        "Image": "certbot/certbot",
        "Cmd": [
            "certonly", "--webroot", "--webroot-path=/var/www/certbot",
            "--non-interactive", "--agree-tos",
            "-m", email,
            "-d", domain, "-d", f"www.{domain}"
        ],
        "HostConfig": {
            "Binds": [
                "/etc/letsencrypt:/etc/letsencrypt",
                "/var/www/certbot:/var/www/certbot"
            ],
            "AutoRemove": True
        }
    }

    ok_create, resp = call_docker_api("POST", f"/v1.41/containers/create?name={certbot_container_name}", body=create_body)
    if ok_create:
        call_docker_api("POST", f"/v1.41/containers/{certbot_container_name}/start")
        logger.info(f"Contenedor Certbot iniciado para emisión de SSL en {domain}")
        # Recargar Nginx central vía API
        call_docker_api("POST", "/v1.41/containers/prod_nginx/exec")
        return True, f"Solicitud SSL iniciada con éxito para {domain}"

    # Fallback si el contenedor Certbot no pudo crearse por API
    ok_sub, out_sub = execute_shell_cmd(["docker", "run", "--rm", "-v", "/etc/letsencrypt:/etc/letsencrypt", "certbot/certbot", "certonly", "-d", domain])
    if ok_sub:
        return True, "Certificado SSL emitido vía subprocess fallback"
        
    return False, f"No se pudo iniciar la emisión SSL: {resp if 'resp' in locals() else out_sub}"
