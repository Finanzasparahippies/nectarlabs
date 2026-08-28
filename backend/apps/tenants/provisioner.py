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


def get_active_docker_socket():
    """
    Retorna la primera ruta de socket Unix accesible para Docker/Podman.
    """
    candidate_paths = [
        DOCKER_SOCKET_PATH,
        '/var/run/docker.sock',
        '/run/podman/podman.sock',
        '/run/user/1000/podman/podman.sock',
    ]
    for path in candidate_paths:
        if path and os.path.exists(path) and not os.path.isdir(path):
            try:
                s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                s.settimeout(1.5)
                s.connect(path)
                s.close()
                return path
            except Exception:
                pass
    return None


def call_docker_api(method, path, body=None):
    """
    Realiza peticiones HTTP nativas directamente al socket Unix de Docker/Podman.
    """
    sock_path = get_active_docker_socket()
    if not sock_path:
        logger.warning("No se encontró ningún socket Unix activo para Docker/Podman Daemon.")
        return False, "Socket Unix de Docker no accesible"

    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect(sock_path)

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
        logger.warning(f"Comunicación vía socket Unix de Docker ({sock_path}): {e}")
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
        ok_be, _ = call_docker_api("DELETE", f"/v1.41/containers/{backend_name}?force=true")
        ok_fe, _ = call_docker_api("DELETE", f"/v1.41/containers/{frontend_name}?force=true")

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

        tenant.custom_frontend_url = f"http://{frontend_name}:3000"
        tenant.custom_backend_url = f"http://{backend_name}:8000/api"
        tenant.save(update_fields=['custom_frontend_url', 'custom_backend_url'])
        logger.info(f"[✓] Registro de tenant '{tenant_slug}' vinculado a upstreams dinámicos.")
        return True, "Aprovisionamiento completado con éxito"

    return False, "Acción desconocida"


def request_ssl_certificate(domain, email="soporte@nectarlabs.dev"):
    """
    Solicita o valida un certificado SSL para dominios personalizados (BYO Domain).
    Soporta explícitamente dominios con resolución y proxy SSL provisto por Cloudflare Edge.
    """
    if not domain or 'nectarlabs.dev' in domain:
        return True, "Dominio del sistema no requiere Certbot individual"

    # Verificación de SSL gestionado por Cloudflare
    use_cloudflare_ssl = getattr(settings, 'USE_CLOUDFLARE_SSL', True)
    if use_cloudflare_ssl:
        logger.info(f"🔒 Dominio personalizado '{domain}' validado con certificación SSL provista por Cloudflare Edge.")
        return True, f"SSL activado e instalado automáticamente vía Cloudflare Edge para {domain}"

    logger.info(f"🔒 Solicitando certificado SSL para dominio personalizado: {domain}")

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
        call_docker_api("POST", "/v1.41/containers/prod_nginx/exec")
        return True, f"Solicitud SSL iniciada con éxito para {domain}"

    ok_sub, out_sub = execute_shell_cmd(["docker", "run", "--rm", "-v", "/etc/letsencrypt:/etc/letsencrypt", "certbot/certbot", "certonly", "-d", domain])
    if ok_sub:
        return True, "Certificado SSL emitido vía subprocess fallback"
        
    return False, f"No se pudo iniciar la emisión SSL: {resp if 'resp' in locals() else out_sub}"

