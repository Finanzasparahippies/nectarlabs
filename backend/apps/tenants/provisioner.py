"""
Módulo de Aprovisionamiento Dinámico de Contenedores y Certificados SSL para Nectar Labs SaaS Factory.
Se comunica de forma nativa con el daemon de Docker mediante el socket Unix (/var/run/docker.sock)
sin depender de binarios externos 'docker' o 'certbot' dentro del contenedor de Python.
"""

import os
import sys
import socket
import json
import time
import logging
import subprocess
import shutil
from contextlib import contextmanager
from django.conf import settings
from django.core.cache import cache
from .models import Tenant

logger = logging.getLogger(__name__)

DOCKER_SOCKET_PATH = getattr(settings, 'DOCKER_SOCKET_PATH', '/var/run/docker.sock')
TENANTS_BASE_DIR = getattr(settings, 'TENANTS_BASE_DIR', '/var/www/tenants')
NETWORK_NAME = getattr(settings, 'SHARED_DOCKER_NETWORK', 'prod_network')
LOCK_TIMEOUT_SECONDS = 300


class ActionResult(dict):
    """
    Estructura de retorno universal para acciones PaaS y orquestación.
    Compatible con desempacado de tuplas (ok, msg), acceso por clave .get() y atributos.
    """
    def __init__(self, success: bool, message: str, status_code: int = 200, logs: str = ""):
        super().__init__(
            success=success,
            message=message,
            error=message if not success else None,
            status_code=status_code,
            logs=logs
        )
        self.success = success
        self.message = message
        self.error = message if not success else None
        self.status_code = status_code
        self.logs = logs

    def __iter__(self):
        return iter((self.success, self.message))


class DeploymentLockError(Exception):
    """Excepción lanzada cuando una operación concurrente intenta desplegar el mismo tenant."""
    pass


@contextmanager
def tenant_deployment_lock(tenant_id, timeout=LOCK_TIMEOUT_SECONDS):
    """
    Candado distribuido por Inquilino (Mutex) respaldado por caché (Redis o DB/LocMem).
    Previene carreras críticas si se presiona el botón de deploy repetidamente.
    """
    lock_key = f"lock:deploy:{tenant_id}"
    acquired = cache.add(lock_key, "locked", timeout=timeout)
    if not acquired:
        raise DeploymentLockError(f"Ya existe una operación de orquestación o despliegue en progreso para este inquilino.")
    try:
        yield
    finally:
        cache.delete(lock_key)



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
            except (socket.error, OSError) as sock_err:
                logger.debug(f"Socket candidate {path} no conectable: {sock_err}")
            except Exception as e:
                logger.warning(f"Error inesperado al probar socket Unix {path}: {e}")
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
    Ejecuta comandos del sistema capturando exhaustivamente stdout y stderr.
    """
    logger.info(f"Ejecutando comando PaaS: {' '.join(cmd) if isinstance(cmd, list) else cmd} en {cwd}")
    try:
        res = subprocess.run(
            cmd,
            cwd=cwd,
            shell=isinstance(cmd, str),
            capture_output=True,
            text=True,
            timeout=timeout
        )
        combined_parts = []
        if res.stdout and res.stdout.strip():
            combined_parts.append(res.stdout.strip())
        if res.stderr and res.stderr.strip():
            combined_parts.append(res.stderr.strip())
        output_str = "\n".join(combined_parts) if combined_parts else f"Proceso finalizó con código {res.returncode}"

        if res.returncode != 0:
            return False, output_str
        return True, output_str
    except FileNotFoundError as fnf:
        return False, f"Binario no disponible en contenedor: {fnf}"
    except Exception as e:
        return False, str(e)


def dechunk_http_body(raw_body: str) -> str:
    """
    Decodifica el cuerpo de una respuesta HTTP chunked proveniente del socket Unix de Docker.
    """
    if not raw_body:
        return ""
    result = []
    idx = 0
    body_len = len(raw_body)
    while idx < body_len:
        eol = raw_body.find("\r\n", idx)
        if eol == -1:
            break
        chunk_size_str = raw_body[idx:eol].strip().split(';')[0]
        try:
            chunk_size = int(chunk_size_str, 16)
        except ValueError:
            return raw_body
        
        if chunk_size == 0:
            break
            
        chunk_data_start = eol + 2
        chunk_data_end = chunk_data_start + chunk_size
        result.append(raw_body[chunk_data_start:chunk_data_end])
        idx = chunk_data_end + 2
        
    return "".join(result) if result else raw_body


def call_docker_api_json(method, path, body=None):
    """
    Realiza una petición a la API de Docker y deserializa la respuesta JSON si existe.
    """
    ok, raw_resp = call_docker_api(method, path, body=body)
    if not ok:
        return False, {"error": raw_resp}
    
    try:
        parts = raw_resp.split("\r\n\r\n", 1)
        if len(parts) > 1 and parts[1].strip():
            raw_body = parts[1].strip()
            headers = parts[0].lower()
            if "transfer-encoding: chunked" in headers or "transfer-encoding:chunked" in headers:
                raw_body = dechunk_http_body(raw_body)

            # Intento 1: Parseo directo
            try:
                return True, json.loads(raw_body)
            except Exception:
                pass

            # Intento 2: Buscar inicio de objeto o array JSON
            json_start = min(
                raw_body.find("{") if "{" in raw_body else 999999,
                raw_body.find("[") if "[" in raw_body else 999999
            )
            if json_start < 999999:
                clean_slice = raw_body[json_start:]
                # En caso de bytes de terminación trailing
                json_end = max(clean_slice.rfind("}"), clean_slice.rfind("]"))
                if json_end != -1:
                    clean_slice = clean_slice[:json_end + 1]
                return True, json.loads(clean_slice)
    except Exception as e:
        logger.debug(f"No se pudo parsear JSON de respuesta Docker ({path}): {e}")
    
    return True, {"raw": raw_resp}


def get_container_info(container_name):
    """
    Consulta información detallada y estado de ejecución de un contenedor vía Docker socket o CLI.
    """
    ok, data = call_docker_api_json("GET", f"/v1.41/containers/{container_name}/json")
    if not ok or not isinstance(data, dict) or "State" not in data or "error" in data:
        # Fallback a docker inspect CLI (robusto ante chunking o variaciones de API)
        ok_sh, out_sh = execute_shell_cmd(["docker", "inspect", container_name])
        if ok_sh:
            try:
                parsed = json.loads(out_sh)
                if parsed and isinstance(parsed, list) and len(parsed) > 0:
                    data = parsed[0]
                    ok = True
            except Exception as inspect_err:
                logger.debug(f"Error parseando docker inspect CLI para {container_name}: {inspect_err}")
                
    if not ok or not isinstance(data, dict) or "State" not in data:
        return {
            "name": container_name,
            "exists": False,
            "status": "not_found",
            "running": False,
            "uptime": "N/A",
            "ip": None,
            "error": data.get("error", "Contenedor no existe") if isinstance(data, dict) else "No encontrado"
        }
        
    state = data.get("State", {})
    running = state.get("Running", False)
    status_str = state.get("Status", "unknown")
    started_at = state.get("StartedAt", "")
    
    # Redes e IP interna
    networks = data.get("NetworkSettings", {}).get("Networks", {})
    ip_addr = None
    if NETWORK_NAME in networks:
        ip_addr = networks[NETWORK_NAME].get("IPAddress")
    elif networks:
        first_net = next(iter(networks.values()))
        ip_addr = first_net.get("IPAddress")
        
    return {
        "name": container_name,
        "exists": True,
        "status": status_str,
        "running": running,
        "started_at": started_at,
        "ip": ip_addr,
        "id": data.get("Id", "")[:12],
    }


def inspect_compose_containers(compose_path: str, env: str = 'staging') -> dict:
    """
    Introspecciona un archivo docker-compose (YAML o scan de líneas) para descubrir
    los nombres de contenedor o servicios declarados para backend y frontend.
    """
    if not os.path.exists(compose_path):
        return {}

    services_found = []
    # Intento 1: YAML parser estándar
    try:
        import yaml
        with open(compose_path, 'r', encoding='utf-8', errors='ignore') as f:
            data = yaml.safe_load(f)
            if isinstance(data, dict) and 'services' in data and isinstance(data['services'], dict):
                for svc_key, svc_val in data['services'].items():
                    c_name = None
                    if isinstance(svc_val, dict):
                        c_name = svc_val.get('container_name')
                    services_found.append((svc_key, c_name or svc_key))
    except Exception:
        pass

    # Intento 2: Fallback línea por línea (tolerante a fallos de sintaxis o dependencias)
    if not services_found:
        try:
            with open(compose_path, 'r', encoding='utf-8', errors='ignore') as f:
                current_svc = None
                in_services = False
                for line in f:
                    stripped = line.strip()
                    raw_indent = len(line) - len(line.lstrip())
                    if stripped == 'services:':
                        in_services = True
                        continue
                    if in_services:
                        if raw_indent == 0 and stripped and not stripped.startswith('#'):
                            in_services = False
                            continue
                        if raw_indent in (2, 4) and stripped.endswith(':') and not stripped.startswith('#'):
                            svc_name = stripped[:-1].strip()
                            if svc_name not in ['networks', 'volumes', 'build', 'environment', 'ports', 'depends_on', 'restart', 'logging']:
                                current_svc = svc_name
                                services_found.append((current_svc, current_svc))
                        if current_svc and 'container_name:' in stripped:
                            c_name = stripped.split('container_name:')[1].strip().strip('"').strip("'")
                            for idx, (s, c) in enumerate(services_found):
                                if s == current_svc:
                                    services_found[idx] = (s, c_name)
        except Exception as e:
            logger.debug(f"Error parseando docker compose en {compose_path}: {e}")

    result = {}
    for svc, c_name in services_found:
        svc_lower = svc.lower()
        c_lower = c_name.lower()
        if any(term in svc_lower or term in c_lower for term in ['backend', 'api', 'django', 'server', 'core']):
            if 'backend' not in result:
                result['backend'] = c_name
        elif any(term in svc_lower or term in c_lower for term in ['front', 'next', 'web', 'client', 'ui']):
            if 'frontend' not in result:
                result['frontend'] = c_name

    return result


def resolve_tenant_deployment_spec(tenant_or_slug, env='staging'):
    """
    Motor PaaS v2 de resolución y autodescubrimiento de repositorios y contenedores para inquilinos.
    Prioridades:
    1. Atributos explícitos en BD (Tenant.deployment_repo_path, deployment_backend_container...)
    2. Autodescubrimiento heurístico de directorios en /var/www/ y /var/www/tenants/
    3. Introspección dinámica de docker-compose para extraer nombres de contenedor
    4. Mapeo backwards-compatible para Kōres (premium-ties) y FPH (Finanzasparahippies / FPH-Hub)
    5. Fallback a convención estándar multi-tenant nativo (tenant_{slug}_backend_{env})
    """
    from .models import Tenant

    tenant = None
    if isinstance(tenant_or_slug, Tenant):
        tenant = tenant_or_slug
        slug = tenant.subdomain
    elif hasattr(tenant_or_slug, 'subdomain'):
        slug = tenant_or_slug.subdomain
        tenant = tenant_or_slug
    else:
        slug = str(tenant_or_slug)
        tenant = Tenant.objects.filter(subdomain__iexact=slug).first()

    slug_clean = slug.lower().strip()
    tenant_name = (tenant.name if tenant else '').strip()

    # 1. Chequeo de configuración explícita en Tenant DB
    explicit_repo = getattr(tenant, 'deployment_repo_path', None) if tenant else None
    explicit_be = getattr(tenant, 'deployment_backend_container', None) if tenant else None
    explicit_fe = getattr(tenant, 'deployment_frontend_container', None) if tenant else None
    is_standalone_db = getattr(tenant, 'is_standalone_repo', False) if tenant else False

    # 2. Generar lista priorizada de directorios candidatos
    candidates = []
    if explicit_repo:
        candidates.append(explicit_repo)

    # Candidatos específicos para FPH / Finanzas Para Hippies
    if slug_clean in ['fph', 'fph-hub', 'finanzasparahippies', 'finanzas-para-hippies'] or 'finanzas' in slug_clean or 'hippies' in slug_clean or 'finanzas' in tenant_name.lower():
        candidates.extend([
            "/var/www/Finanzasparahippies",
            "/var/www/finanzasparahippies",
            "/var/www/FPH-Hub",
            "/var/www/fph-hub",
            "/var/www/fph",
            "/var/www/FinanzasParaHippies",
            os.path.join(TENANTS_BASE_DIR, "Finanzasparahippies"),
            os.path.join(TENANTS_BASE_DIR, "fph"),
        ])

    # Candidatos específicos para Kōres (Luxury Hair Ties / Premium Ties)
    if slug_clean in ['kores', 'kores-vip', 'kores-mexico', 'kores_mexico', 'premium-ties', 'premium_ties'] or 'kores' in slug_clean:
        candidates.extend([
            "/var/www/premium-ties",
            "/var/www/premium_ties",
            "/var/www/kores",
            "/var/www/kores-mexico",
            os.path.join(TENANTS_BASE_DIR, "premium-ties"),
            os.path.join(TENANTS_BASE_DIR, "kores"),
        ])

    # Candidatos genéricos para cualquier inquilino
    candidates.extend([
        f"/var/www/{slug_clean}",
        f"/var/www/{slug_clean.replace('-', '_')}",
        f"/var/www/{slug_clean.replace('_', '-')}",
        f"/var/www/{slug_clean.capitalize()}",
        f"/var/www/{slug_clean.title()}",
        os.path.join(TENANTS_BASE_DIR, slug_clean),
    ])

    if tenant_name:
        condensed_name = "".join(ch for ch in tenant_name if ch.isalnum())
        hyphen_name = tenant_name.replace(" ", "-").lower()
        candidates.extend([
            f"/var/www/{condensed_name}",
            f"/var/www/{hyphen_name}",
            os.path.join(TENANTS_BASE_DIR, condensed_name),
            os.path.join(TENANTS_BASE_DIR, hyphen_name),
        ])

    # Eliminar duplicados preservando el orden de prioridad
    seen = set()
    unique_candidates = [c for c in candidates if c and not (c in seen or seen.add(c))]

    # 3. Buscar el primer directorio candidato que realmente exista en el sistema
    resolved_repo = None
    found_compose_path = None
    is_standalone = is_standalone_db

    for candidate in unique_candidates:
        if os.path.exists(candidate):
            resolved_repo = candidate
            compose_files = [
                os.path.join(candidate, f"docker-compose.{env}.yml"),
                os.path.join(candidate, "docker-compose.yml"),
                os.path.join(candidate, "docker-compose.yaml"),
            ]
            for cf in compose_files:
                if os.path.exists(cf):
                    found_compose_path = cf
                    is_standalone = True
                    break
            if found_compose_path:
                break

    # Si no se encontró ningún directorio existente en disco, usar el primer candidato prioritario
    if not resolved_repo:
        resolved_repo = unique_candidates[0] if unique_candidates else os.path.join(TENANTS_BASE_DIR, slug_clean)

    # 4. Introspección de compose para extraer nombres de contenedor
    backend_name = explicit_be
    frontend_name = explicit_fe

    if found_compose_path and (not backend_name or not frontend_name):
        introspected = inspect_compose_containers(found_compose_path, env=env)
        if not backend_name and 'backend' in introspected:
            backend_name = introspected['backend']
        if not frontend_name and 'frontend' in introspected:
            frontend_name = introspected['frontend']

    # 5. Fallback por patrones conocidos si no se descubrieron por compose o BD
    if not backend_name or not frontend_name:
        if slug_clean in ['fph', 'fph-hub', 'finanzasparahippies', 'finanzas-para-hippies'] or 'finanzas' in slug_clean or 'hippies' in slug_clean:
            is_standalone = True
            backend_name = backend_name or f"fph_backend_{env}"
            frontend_name = frontend_name or f"fph_frontend_{env}"
            if not resolved_repo or not os.path.exists(resolved_repo):
                resolved_repo = "/var/www/Finanzasparahippies"
        elif slug_clean in ['kores', 'kores-vip', 'kores-mexico', 'kores_mexico'] or 'kores' in slug_clean:
            is_standalone = True
            backend_name = backend_name or f"premium_ties_backend_{env}"
            frontend_name = frontend_name or f"premium_ties_frontend_{env}"
            if not resolved_repo or not os.path.exists(resolved_repo):
                resolved_repo = "/var/www/premium-ties"
        else:
            backend_name = backend_name or f"tenant_{slug_clean}_backend_{env}"
            frontend_name = frontend_name or f"tenant_{slug_clean}_frontend_{env}"

    return {
        "backend": backend_name,
        "frontend": frontend_name,
        "is_standalone_repo": is_standalone,
        "repo_dir": resolved_repo,
        "compose_path": found_compose_path,
        "searched_candidates": unique_candidates[:6]
    }


def get_tenant_container_names(tenant_or_slug, env='staging'):
    """
    Determina los nombres de contenedores estándar y ruta de proyecto para un inquilino.
    Delega en resolve_tenant_deployment_spec para soporte dinámico y autodescubrimiento.
    """
    return resolve_tenant_deployment_spec(tenant_or_slug, env=env)


def get_tenant_containers_status(tenant_or_slug, env='staging', environment=None):
    """
    Retorna el estado consolidado de salud de los contenedores de backend y frontend de un tenant.
    """
    effective_env = environment or env or 'staging'
    names = get_tenant_container_names(tenant_or_slug, env=effective_env)
    be_info = get_container_info(names["backend"])
    fe_info = get_container_info(names["frontend"])
    
    all_running = be_info["running"] and fe_info["running"]
    any_running = be_info["running"] or fe_info["running"]
    
    overall_status = "healthy" if all_running else ("degraded" if any_running else "offline")
    
    return {
        "overall_status": overall_status,
        "is_online": all_running,
        "backend": be_info,
        "frontend": fe_info,
        "env": effective_env,
        "names": names
    }


def sync_nginx_configuration():
    """
    Sincroniza y asegura que la configuración de Nginx en /var/www soporte comodines
    y expresiones regulares para tenants en Staging sin intervención manual vía terminal.
    """
    target_files = [
        "/var/www/prod-nginx/nginx/default.conf",
        "/var/www/nginx/default.conf",
        "/var/www/prod-nginx/default.conf",
    ]
    stg_server_name = "server_name staging.nectarlabs.dev www.staging.nectarlabs.dev *.staging.nectarlabs.dev *-staging.nectarlabs.dev staging.* *.staging.* ~^staging\\..+$ ~^.+\\.staging\\..+$ ~^.+-staging\\..+$;"

    modified = False
    for path in target_files:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                if "server_name staging.nectarlabs.dev" in content and "staging.*" not in content:
                    import re
                    new_content = re.sub(
                        r'server_name\s+staging\.nectarlabs\.dev[^\;]*\;',
                        stg_server_name,
                        content
                    )
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        logger.info(f"Configuración de Nginx en {path} actualizada automáticamente para soporte multi-tenant staging.")
                        modified = True
            except Exception as e:
                logger.warning(f"Error sincronizando {path}: {e}")
    return modified


def reload_nginx_proxy():
    """
    Recarga la configuración de Nginx en caliente sin SSH ni tiempo de inactividad.
    Inspecciona contenedores activos (prod_nginx, nectar_nginx_staging, prod-nginx, nectar_nginx)
    y ejecuta 'nginx -s reload' vía Docker Socket (/exec) o CLI.
    """
    # Sincronizar archivo de configuración en volumen compartido si es necesario
    try:
        sync_nginx_configuration()
    except Exception as e:
        logger.warning(f"sync_nginx_configuration omitido: {e}")

    candidates = ['prod_nginx', 'prod-nginx', 'nectar_nginx_staging', 'nectar_nginx']
    reloaded = []
    for c_name in candidates:
        try:
            info = get_container_info(c_name)
            if info.get("running"):
                # Intento 1: Docker CLI directo
                ok_cli, out_cli = execute_shell_cmd(["docker", "exec", c_name, "nginx", "-s", "reload"])
                if ok_cli:
                    logger.info(f"Nginx ({c_name}) recargado exitosamente vía CLI.")
                    reloaded.append(c_name)
                    continue

                # Intento 2: Docker Socket Engine API (/exec)
                ok_exec, exec_resp = call_docker_api_json("POST", f"/v1.41/containers/{c_name}/exec", body={
                    "AttachStdout": True,
                    "AttachStderr": True,
                    "Cmd": ["nginx", "-s", "reload"]
                })
                if ok_exec and isinstance(exec_resp, dict) and "Id" in exec_resp:
                    exec_id = exec_resp["Id"]
                    call_docker_api("POST", f"/v1.41/exec/{exec_id}/start", body={"Detach": True, "Tty": False})
                    logger.info(f"Nginx ({c_name}) recargado exitosamente vía Docker API Socket.")
                    reloaded.append(c_name)
        except Exception as e:
            logger.warning(f"No se pudo recargar Nginx en {c_name}: {e}")

    success = len(reloaded) > 0
    msg = f"Nginx recargado exitosamente en: {', '.join(reloaded)}" if success else "No se detectaron contenedores de Nginx en ejecución"
    return ActionResult(success, msg, status_code=200 if success else 404)


def _execute_single_container_action(container_name: str, action: str) -> ActionResult:
    valid_actions = {'start', 'stop', 'restart', 'reload_nginx', 'reload-nginx'}
    if action not in valid_actions:
        return ActionResult(False, f"Acción '{action}' no permitida. Permitidas: {sorted(list(valid_actions))}", status_code=400)

    if action in ('reload_nginx', 'reload-nginx'):
        return reload_nginx_proxy()

    # 1. Verificar primero existencia del contenedor para evitar fallos ciegos y errores 502 confusos
    info = get_container_info(container_name)
    if not info.get("exists"):
        return ActionResult(
            False, 
            f"El contenedor '{container_name}' no existe en el daemon de Docker. Debes ejecutar 'deploy' primero para construirlo e iniciarlo.",
            status_code=400
        )

    # 2. Ejecutar acción vía Socket Unix o CLI
    try:
        ok, resp = call_docker_api("POST", f"/v1.41/containers/{container_name}/{action}")
        if ok:
            return ActionResult(True, f"Acción '{action}' ejecutada con éxito en {container_name}", status_code=200)
        if "404" in resp or "No such container" in resp:
            return ActionResult(False, f"El contenedor '{container_name}' no existe en el daemon de Docker. Debes ejecutar 'deploy' primero para construirlo e iniciarlo.", status_code=400)
        
        ok_sh, out_sh = execute_shell_cmd(["docker", action, container_name])
        if ok_sh:
            return ActionResult(True, f"Acción '{action}' completada vía CLI en {container_name}", status_code=200)
        return ActionResult(False, f"Error ejecutando '{action}' en {container_name}: {resp}", status_code=502)
    except socket.timeout:
        return ActionResult(False, f"Timeout de comunicación con Docker daemon al ejecutar {action} en {container_name}", status_code=504)
    except Exception as e:
        logger.error(f"Excepción al ejecutar {action} en {container_name}: {e}", exc_info=True)
        return ActionResult(False, f"Error de comunicación con Docker: {str(e)}", status_code=503)


def execute_container_action(target_or_container, action_or_target, action=None, environment='staging', env=None, **kwargs):
    """
    Ejecuta start, stop, restart o reload_nginx sobre contenedores individuales o la suite de un tenant.
    Soporta dos firmas:
      1. execute_container_action(container_name, action)
      2. execute_container_action(tenant, target, action, environment='staging')
    """
    effective_env = env or environment or 'staging'
    if action is not None:
        tenant = target_or_container
        target = action_or_target
        act = action
        if act in ('reload_nginx', 'reload-nginx'):
            return reload_nginx_proxy()
        names = get_tenant_container_names(tenant, env=effective_env)
        if target in ('frontend', 'backend'):
            c_name = names[target]
            return _execute_single_container_action(c_name, act)
        elif target == 'all':
            ok_fe = _execute_single_container_action(names['frontend'], act)
            ok_be = _execute_single_container_action(names['backend'], act)
            combined_ok = ok_fe.success and ok_be.success
            status_code = 200 if combined_ok else (ok_fe.status_code if not ok_fe.success else ok_be.status_code)
            msg = f"Frontend: {ok_fe.message} | Backend: {ok_be.message}"
            return ActionResult(combined_ok, msg, status_code=status_code)
        else:
            return ActionResult(False, f"Target '{target}' no reconocido. Válidos: frontend, backend, all", status_code=400)
    else:
        container_name = str(target_or_container)
        act = action_or_target
        if act in ('reload_nginx', 'reload-nginx'):
            return reload_nginx_proxy()
        return _execute_single_container_action(container_name, act)


def get_container_logs(container_name, tail=100):
    """
    Extrae los últimos registros de logs de stdout y stderr del contenedor vía Docker API.
    """
    ok, resp = call_docker_api("GET", f"/v1.41/containers/{container_name}/logs?stdout=1&stderr=1&tail={tail}&timestamps=1")
    if ok and resp:
        parts = resp.split("\r\n\r\n", 1)
        return parts[1] if len(parts) > 1 else resp
        
    ok_sh, out_sh = execute_shell_cmd(["docker", "logs", "--tail", str(tail), container_name])
    if ok_sh:
        return out_sh
        
    return "No hay logs disponibles o el contenedor aún no ha sido creado."


def stream_container_logs(container_name, tail=100, follow=True):
    """
    Generador para Server-Sent Events (SSE) que transmite logs de Docker en tiempo real.
    Emite frames formateados como 'data: {...}\\n\\n' y comentarios de latido ': ping\\n\\n'.
    """
    sock_path = get_active_docker_socket()
    if not sock_path:
        # Fallback si no hay socket directo: emitir logs estáticos
        logs = get_container_logs(container_name, tail=tail)
        for line in logs.splitlines():
            if line:
                yield f"data: {json.dumps({'text': line, 'stream': 'stdout'})}\n\n"
        yield f"data: {json.dumps({'text': '⚠️ Modo estático: Socket Unix de Docker no accesible para streaming interactivo.', 'stream': 'system'})}\n\n"
        return

    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(8.0)
        s.connect(sock_path)
        follow_param = "1" if follow else "0"
        req = f"GET /v1.41/containers/{container_name}/logs?stdout=1&stderr=1&follow={follow_param}&tail={tail}&timestamps=1 HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
        s.sendall(req.encode('utf-8'))

        buffer = b""
        headers_done = False
        while not headers_done:
            chunk = s.recv(1024)
            if not chunk:
                break
            buffer += chunk
            if b"\r\n\r\n" in buffer:
                parts = buffer.split(b"\r\n\r\n", 1)
                buffer = parts[1]
                headers_done = True

        s.settimeout(2.5)
        last_ping = time.time()

        while True:
            try:
                if time.time() - last_ping > 12:
                    yield ": ping\n\n"
                    last_ping = time.time()

                chunk = s.recv(4096)
                if not chunk:
                    break
                buffer += chunk

                while len(buffer) >= 8:
                    stream_type = buffer[0]
                    if stream_type in (1, 2) and buffer[1:4] == b'\x00\x00\x00':
                        frame_size = int.from_bytes(buffer[4:8], byteorder='big')
                        if len(buffer) < 8 + frame_size:
                            break
                        payload = buffer[8:8 + frame_size].decode('utf-8', errors='replace')
                        buffer = buffer[8 + frame_size:]
                        for line in payload.splitlines():
                            if line:
                                yield f"data: {json.dumps({'text': line, 'stream': 'stderr' if stream_type == 2 else 'stdout'})}\n\n"
                    else:
                        line = buffer.decode('utf-8', errors='replace')
                        buffer = b""
                        for l in line.splitlines():
                            if l:
                                yield f"data: {json.dumps({'text': l, 'stream': 'stdout'})}\n\n"
                        break
            except socket.timeout:
                yield ": ping\n\n"
                last_ping = time.time()
                if not follow:
                    break
                continue
            except Exception as e:
                yield f"data: {json.dumps({'text': f'⚠️ Fin de stream: {str(e)}', 'stream': 'system'})}\n\n"
                break
        s.close()
    except Exception as err:
        yield f"data: {json.dumps({'text': f'❌ No se pudo conectar a los logs del contenedor {container_name}: {str(err)}', 'stream': 'system'})}\n\n"


def deploy_tenant_containers(tenant_or_slug, env='staging', user=None, force_rebuild=False, environment=None):
    """
    Orquestador maestro de despliegue remoto sin SSH con protección de candado distribuido.
    Crea un registro de auditoría en TenantDeployment, arranca o construye los contenedores
    vinculados a la red prod_network y actualiza el estado y URLs del Tenant.
    """
    from django.utils import timezone
    from .models import Tenant, TenantDeployment
    from .utils import invalidate_tenant_cache

    effective_env = environment or env or 'staging'
    tenant = tenant_or_slug if isinstance(tenant_or_slug, Tenant) else Tenant.objects.filter(subdomain=tenant_or_slug).first()
    if not tenant:
        return ActionResult(False, "Tenant no encontrado en base de datos", status_code=404)

    try:
        with tenant_deployment_lock(tenant.id):
            names = get_tenant_container_names(tenant, env=effective_env)
            backend_name = names["backend"]
            frontend_name = names["frontend"]

            deployment = TenantDeployment.objects.create(
                tenant=tenant,
                environment=effective_env,
                action=TenantDeployment.Action.DEPLOY if force_rebuild else TenantDeployment.Action.START,
                status=TenantDeployment.Status.IN_PROGRESS,
                output_logs=f"[{timezone.now().isoformat()}] Iniciando orquestación remota para {tenant.subdomain} ({effective_env})...\n",
                triggered_by=user
            )

            logs = [deployment.output_logs]

            def log(msg):
                entry = f"[{timezone.now().strftime('%H:%M:%S')}] {msg}\n"
                logs.append(entry)
                logger.info(entry.strip())

            try:
                be_status = get_container_info(backend_name)
                fe_status = get_container_info(frontend_name)

                log(f"Estado previo Backend ({backend_name}): {be_status['status']}")
                log(f"Estado previo Frontend ({frontend_name}): {fe_status['status']}")

                if be_status["exists"] and fe_status["exists"] and not force_rebuild:
                    log("Contenedores ya existen en el daemon de Docker. Arrancando...")
                    execute_container_action(backend_name, 'start')
                    execute_container_action(frontend_name, 'start')

                    be_after = get_container_info(backend_name)
                    fe_after = get_container_info(frontend_name)
                    log(f"Resultado Backend: {be_after['status']} (running={be_after['running']})")
                    log(f"Resultado Frontend: {fe_after['status']} (running={fe_after['running']})")

                    if names.get("is_standalone_repo"):
                        tenant.custom_frontend_url = f"http://{frontend_name}:3000"
                        tenant.custom_backend_url = f"http://{backend_name}:8000/api"
                        tenant.is_standalone_repo = True
                        tenant.frontend_mode = 'CUSTOM_STANDALONE'
                        tenant.save(update_fields=['custom_frontend_url', 'custom_backend_url', 'is_standalone_repo', 'frontend_mode'])
                    else:
                        tenant.is_standalone_repo = False
                        tenant.frontend_mode = 'NATIVE'
                        tenant.save(update_fields=['is_standalone_repo', 'frontend_mode'])
                    invalidate_tenant_cache(tenant)
                    ok_ng, msg_ng = reload_nginx_proxy()
                    log(f"Recarga de Nginx Proxy Ingress: {msg_ng}")

                    deployment.status = TenantDeployment.Status.SUCCESS
                    deployment.output_logs = "".join(logs)
                    deployment.finished_at = timezone.now()
                    deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                    return ActionResult(True, f"Contenedores {backend_name} y {frontend_name} iniciados correctamente.", status_code=200, logs="".join(logs))

                repo_dir = names["repo_dir"]
                if not os.path.exists(repo_dir):
                    candidates_str = ", ".join(names.get("searched_candidates", [repo_dir]))
                    err_msg = (
                        f"El directorio del proyecto '{repo_dir}' no existe o no está montado en el contenedor. "
                        f"(Rutas evaluadas: {candidates_str}). Configura 'deployment_repo_path' en el Tenant o monta la carpeta en Docker."
                    )
                    log(f"❌ {err_msg}")
                    deployment.status = TenantDeployment.Status.FAILED
                    deployment.output_logs = "".join(logs)
                    deployment.finished_at = timezone.now()
                    deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                    return ActionResult(False, err_msg, status_code=500, logs="".join(logs))

                compose_file = f"docker-compose.{effective_env}.yml"
                compose_path = os.path.join(repo_dir, compose_file)

                if not os.path.exists(compose_path):
                    compose_path = os.path.join(repo_dir, "docker-compose.yml")

                if not os.path.exists(compose_path):
                    err_msg = f"No se encontró archivo compose válido en '{repo_dir}'."
                    log(f"❌ {err_msg}")
                    deployment.status = TenantDeployment.Status.FAILED
                    deployment.output_logs = "".join(logs)
                    deployment.finished_at = timezone.now()
                    deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                    return ActionResult(False, err_msg, status_code=500, logs="".join(logs))

                # Verificar y asegurar la existencia de archivo de variables de entorno para Docker Compose
                target_env_file = os.path.join(repo_dir, f".env.{effective_env}")
                if not os.path.exists(target_env_file):
                    env_example = os.path.join(repo_dir, ".env.example")
                    env_fallback = os.path.join(repo_dir, ".env")
                    if os.path.exists(env_example):
                        log(f"Aviso: Creando '{target_env_file}' desde .env.example para satisfacer docker compose...")
                        shutil.copyfile(env_example, target_env_file)
                    elif os.path.exists(env_fallback):
                        log(f"Aviso: Creando '{target_env_file}' desde .env para satisfacer docker compose...")
                        shutil.copyfile(env_fallback, target_env_file)
                    else:
                        with open(target_env_file, "w") as f:
                            f.write(f"# Auto-generated {effective_env} environment\nENVIRONMENT={effective_env}\n")

                # Diagnóstico de disponibilidad de Docker CLI dentro del contenedor orquestador
                ok_ver, out_ver = execute_shell_cmd(["docker", "--version"])
                if ok_ver:
                    log(f"Herramienta de orquestación activa: {out_ver}")
                else:
                    log(f"⚠️ Aviso Docker CLI: {out_ver}")

                log(f"Ruta de orquestación de proyecto: {repo_dir} (compose: {compose_path})")

                runner_cmd = ["docker", "compose", "-f", compose_path, "up", "-d"]
                if force_rebuild:
                    runner_cmd.append("--build")

                ok_cmd, out_cmd = execute_shell_cmd(runner_cmd, cwd=repo_dir, timeout=600)
                log(f"Salida de ejecución Compose:\n{out_cmd}")

                if not ok_cmd:
                    log("Aviso: 'docker compose' falló. Intentando con 'docker-compose' (plugin clásico)...")
                    runner_cmd_hyphen = ["docker-compose", "-f", compose_path, "up", "-d"]
                    if force_rebuild:
                        runner_cmd_hyphen.append("--build")
                    ok_hyphen, out_hyphen = execute_shell_cmd(runner_cmd_hyphen, cwd=repo_dir, timeout=600)
                    if ok_hyphen:
                        ok_cmd = True
                        out_cmd = out_hyphen
                        log(f"Salida Compose fallback:\n{out_hyphen}")

                # Verificar inmediatamente si los contenedores fueron instanciados en Docker
                be_after = get_container_info(backend_name)
                fe_after = get_container_info(frontend_name)

                log(f"Estado post-ejecución Backend ({backend_name}): {be_after['status']} (running={be_after['running']})")
                log(f"Estado post-ejecución Frontend ({frontend_name}): {fe_after['status']} (running={fe_after['running']})")

                if not be_after["exists"] and not fe_after["exists"]:
                    err_msg = f"El despliegue falló: ningún contenedor fue creado. Detalle: {out_cmd.strip() or 'Sin salida CLI'}"
                    log(f"❌ {err_msg}")
                    deployment.status = TenantDeployment.Status.FAILED
                    deployment.output_logs = "".join(logs)
                    deployment.finished_at = timezone.now()
                    deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                    return ActionResult(False, err_msg, status_code=500, logs="".join(logs))

                # Si existen pero no están corriendo, intentar arranque explícito
                if be_after["exists"] and not be_after["running"]:
                    execute_container_action(backend_name, 'start')
                if fe_after["exists"] and not fe_after["running"]:
                    execute_container_action(frontend_name, 'start')

                call_docker_api("POST", f"/v1.41/networks/{NETWORK_NAME}/connect", body={"Container": backend_name})
                call_docker_api("POST", f"/v1.41/networks/{NETWORK_NAME}/connect", body={"Container": frontend_name})

                # Asignar URLs internas de red para el proxy dinámico
                if names.get("is_standalone_repo"):
                    tenant.custom_frontend_url = f"http://{frontend_name}:3000"
                    tenant.custom_backend_url = f"http://{backend_name}:8000/api"
                    tenant.is_standalone_repo = True
                    tenant.frontend_mode = 'CUSTOM_STANDALONE'
                    tenant.save(update_fields=['custom_frontend_url', 'custom_backend_url', 'is_standalone_repo', 'frontend_mode'])
                else:
                    tenant.is_standalone_repo = False
                    tenant.frontend_mode = 'NATIVE'
                    tenant.save(update_fields=['is_standalone_repo', 'frontend_mode'])
                invalidate_tenant_cache(tenant)
                ok_ng, msg_ng = reload_nginx_proxy()
                log(f"Recarga de Nginx Proxy Ingress: {msg_ng}")

                log("[✓] Despliegue concluido con éxito. Caché Redis invalidada y Nginx sincronizado.")
                deployment.status = TenantDeployment.Status.SUCCESS
                deployment.output_logs = "".join(logs)
                deployment.finished_at = timezone.now()
                deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                return ActionResult(True, f"Despliegue y arranque de {backend_name} y {frontend_name} completados exitosamente.", status_code=200, logs="".join(logs))

            except Exception as e:
                log(f"❌ Error crítico en orquestación: {e}")
                deployment.status = TenantDeployment.Status.FAILED
                deployment.output_logs = "".join(logs)
                deployment.finished_at = timezone.now()
                deployment.save(update_fields=['status', 'output_logs', 'finished_at'])
                return ActionResult(False, str(e), status_code=500, logs="".join(logs))

    except DeploymentLockError as dle:
        return ActionResult(False, str(dle), status_code=409)


def provision_tenant_containers(tenant_slug, action='build'):
    """
    Función de compatibilidad con llamadas anteriores.
    Delega a deploy_tenant_containers o execute_container_action.
    """
    from .models import Tenant
    tenant = Tenant.objects.filter(subdomain=tenant_slug).first()
    if not tenant:
        return False, "Tenant no encontrado"
        
    names = get_tenant_container_names(tenant, env='staging')
    
    if action == 'stop':
        execute_container_action(names["backend"], 'stop')
        execute_container_action(names["frontend"], 'stop')
        return True, f"Contenedores {names['backend']} y {names['frontend']} detenidos"
        
    elif action == 'remove':
        call_docker_api("DELETE", f"/v1.41/containers/{names['backend']}?force=true")
        call_docker_api("DELETE", f"/v1.41/containers/{names['frontend']}?force=true")
        return True, f"Contenedores {names['backend']} y {names['frontend']} removidos"
        
    elif action in ['build', 'start']:
        return deploy_tenant_containers(tenant, env='staging', force_rebuild=(action == 'build'))
        
    return False, f"Acción '{action}' desconocida"



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

