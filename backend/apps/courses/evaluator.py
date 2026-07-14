"""
Evaluador de ejercicios del curso ingeniero-python.
Estrategia dual:
  1. Ejecución real en un contenedor Docker efímero y aislado (primario).
  2. Fallback estático por AST/keywords si Docker no está disponible.

Seguridad del sandbox Docker:
  - network_mode='none'         → sin acceso a red
  - read_only=True              → filesystem de solo lectura
  - mem_limit='64m'             → máximo 64 MB RAM
  - cpu_quota=50000             → 50% de un CPU (100000 = 1 CPU)
  - pids_limit=32               → máximo 32 procesos (anti fork-bomb)
  - timeout=10s                 → kill automático
  - usuario no-root             → nobody (uid=65534)
"""
import ast
import re
import logging
import time
import tempfile
import os

logger = logging.getLogger("apps")

# ──────────────────────────────────────────────────────────────────────────────
# RÚBRICAS POR MÓDULO
# Cada rúbrica define las keywords evaluadas en el fallback estático.
# Para módulos Python también se ejecuta el código real en el sandbox.
# ──────────────────────────────────────────────────────────────────────────────
COURSES_RUBRICS: dict[str, dict[str, dict]] = {
    "ingeniero-python": {
        "00": {
            "language": "python",
            "keywords": ["try", "except", "backoff", "wraps", "docker", "venv"],
            "description": "Preparación IA y Berribot",
            "executable": False,
        },
        "01": {
            "language": "python",
            "keywords": ["limitar_llamadas", "limpiar_datos", "filtrar_por_precio", "bloqueo_recurso", "wraps", "yield"],
            "description": "Python Avanzado y Edge Cases",
            "executable": True,
            "test_code": """
# Auto-test inyectado por el evaluador
try:
    import time
    # 1. Test limitar_llamadas
    @limitar_llamadas(max_llamadas=2, periodo_segundos=1.0)
    def test_func():
        return True
    assert test_func() is True
    assert test_func() is True
    try:
        test_func()
        print("TEST_FAIL: limitar_llamadas no lanzó error al exceder límite")
    except ValueError as e:
        if str(e) == "Límite de peticiones excedido":
            print("TEST_PASS: limitar_llamadas correcto")
        else:
            print(f"TEST_FAIL: mensaje incorrecto: {e}")
    except Exception as e:
        print(f"TEST_FAIL: excepción incorrecta: {type(e)}")

    # 2. Test limpiar_datos y filtrar_por_precio
    datos = [
        {"id": 1, "modelo": "Toyota Corolla", "precio": "$22,500.00"},
        {"id": 2, "modelo": "Honda Civic", "precio": None},
        {"id": 3, "modelo": "Ford Mustang", "precio": "$55,000.50"},
    ]
    limpios = list(limpiar_datos(datos))
    assert len(limpios) == 2, "limpiar_datos no filtró el None"
    assert limpios[0]["precio"] == 22500.0, "precio mal formateado"
    
    filtrados = list(filtrar_por_precio(limpiar_datos(datos), 30000.0))
    assert len(filtrados) == 1, "filtrar_por_precio no filtró por valor mínimo"
    assert filtrados[0]["modelo"] == "Ford Mustang", "filtrado incorrecto"
    print("TEST_PASS: generadores correctos")

    # 3. Test bloqueo_recurso
    RECURSOS_BLOQUEADOS.clear()
    with bloqueo_recurso("auto_test"):
        assert "auto_test" in RECURSOS_BLOQUEADOS, "recurso no agregado al set"
        try:
            with bloqueo_recurso("auto_test"):
                print("TEST_FAIL: no impidió doble bloqueo")
        except RuntimeError as e:
            if str(e) == "Recurso actualmente bloqueado":
                print("TEST_PASS: bloqueo_recurso correcto")
            else:
                print(f"TEST_FAIL: mensaje incorrecto: {e}")
    assert "auto_test" not in RECURSOS_BLOQUEADOS, "recurso no eliminado al salir"
except Exception as e:
    print(f"TEST_FAIL: error en pruebas: {e}")
""",
        },
        "02": {
            "language": "python",
            "keywords": ["descargar_concurrente", "Vehiculo", "verificar_clave_segura_async", "__slots__", "asyncio", "gather", "ProcessPoolExecutor"],
            "description": "Concurrencia y Rendimiento",
            "executable": True,
            "test_code": """
# Auto-test inyectado por el evaluador
import asyncio
try:
    # 1. Test descargar_concurrente
    original_simular = globals().get('simular_peticion_api')
    async def mock_simular(client, post_id):
        return f"Post {post_id} - Status 200"
    globals()['simular_peticion_api'] = mock_simular
    res = asyncio.run(descargar_concurrente([1, 2]))
    assert len(res) == 2
    assert "Post 1" in res[0]
    print("TEST_PASS: descargar_concurrente correcto")
    if original_simular:
        globals()['simular_peticion_api'] = original_simular

    # 2. Test Vehiculo con __slots__
    v = Vehiculo(vin="123", marca="Ford", kilometraje=1000)
    assert v.vin == "123"
    try:
        v.color = "Rojo"
        print("TEST_FAIL: Vehiculo no restringe atributos dinámicos")
    except AttributeError:
        print("TEST_PASS: Vehiculo slots correcto")

    # 3. Test verificar_clave_segura_async
    original_hash = globals().get('hash_pesado_cpu')
    globals()['hash_pesado_cpu'] = lambda c: "hash_ok"
    h = asyncio.run(verificar_clave_segura_async("secreto"))
    assert h == "hash_ok"
    print("TEST_PASS: verificar_clave_segura_async correcto")
    if original_hash:
        globals()['hash_pesado_cpu'] = original_hash
except Exception as e:
    print(f"TEST_FAIL: error en pruebas: {e}")
""",
        },
        "03": {
            "language": "python",
            "keywords": ["Observador", "UsuarioSuscriptor", "AutoPublicacion", "PasarelaPago", "StripeGateway", "ProcesadorPagosRefactorizado", "abstractmethod", "ABC"],
            "description": "Diseño y Arquitectura",
            "executable": True,
            "test_code": """
# Auto-test inyectado por el evaluador
try:
    # 1. Test Observer Pattern
    log_obs = []
    class MockSuscriptor(Observador):
        def actualizar(self, modelo: str, nuevo_precio: float):
            log_obs.append((modelo, nuevo_precio))

    auto = AutoPublicacion("Toyota Yaris", 15000.0)
    sub = MockSuscriptor()
    auto.suscribir(sub)
    auto.modificar_precio(14500.0)
    assert len(log_obs) == 1
    assert log_obs[0] == ("Toyota Yaris", 14500.0)
    auto.desuscribir(sub)
    auto.modificar_precio(14000.0)
    assert len(log_obs) == 1, "Desuscribir no funcionó"
    print("TEST_PASS: Observer Pattern correcto")

    # 2. Test Inversión de Dependencia (DIP)
    class MockPasarela(PasarelaPago):
        def procesar_transaccion(self, monto: float) -> bool:
            return True
    pasarela = MockPasarela()
    procesador = ProcesadorPagosRefactorizado(pasarela)
    assert procesador.comprar_auto(100.0) is True
    print("TEST_PASS: DIP correcto")
except Exception as e:
    print(f"TEST_FAIL: error en pruebas: {e}")
""",
        },
        "04": {
            "language": "python",
            "keywords": ["pytest", "mock", "patch", "assert", "def test_", "MagicMock", "retry", "stop_after_attempt", "retry_if_exception_type", "mocker", "asyncio"],
            "description": "Robustez y Testing",
            "executable": False,
        },
        "05": {
            "language": "python",
            "keywords": ["selectinload", "Concesionaria", "SessionLocal", "verificar_idempotencia", "CACHE_IDEMPOTENCIA", "idempotency_key", "datos_auto"],
            "description": "Bases de Datos y APIs",
            "executable": False,
        },
        "06": {
            "language": "python",
            "keywords": ["remover_duplicados_in_place", "marca_mas_vendida", "for", "puntero", "def"],
            "description": "Retos Algorítmicos",
            "executable": True,
            "test_code": """
# Auto-test inyectado por el evaluador
try:
    # 1. Test remover_duplicados_in_place
    arr = [1, 1, 2, 2, 3]
    l = remover_duplicados_in_place(arr)
    assert l == 3
    assert arr[:3] == [1, 2, 3]
    print("TEST_PASS: remover_duplicados correcto")

    # 2. Test marca_mas_vendida
    marcas = ["Toyota", "Ford", "Toyota", "Chevrolet", "Ford", "Toyota"]
    res = marca_mas_vendida(marcas)
    assert res == ("Toyota", 3)
    assert marca_mas_vendida([]) is None
    print("TEST_PASS: marca_mas_vendida correcto")
except Exception as e:
    print(f"TEST_FAIL: error en pruebas: {e}")
""",
        },
        "07": {
            "language": "python",
            "keywords": ["cached", "lock_distribuido", "MEMORIA_CACHE", "REDIS_LOCKS", "ttl_segundos", "token_unico"],
            "description": "Sistemas Distribuidos y Caché",
            "executable": False,
        },
        "08": {
            "language": "python",
            "keywords": ["PrecioSeguro", "MetaVerificaTesting", "__get__", "__set__", "__new__", "descriptor", "metaclass"],
            "description": "Tips & Tricks y Metaprogramación",
            "executable": True,
            "test_code": """
# Auto-test inyectado por el evaluador
try:
    # 1. Test PrecioSeguro
    class MockVehiculo:
        precio = PrecioSeguro("precio")
        def __init__(self, p):
            self.precio = p
    mv = MockVehiculo(20000.0)
    assert mv.precio == 20000.0
    
    try:
        mv.precio = -100
        print("TEST_FAIL: PrecioSeguro permitió precio negativo")
    except ValueError as e:
        if str(e) == "Precio debe ser mayor a cero":
            print("TEST_PASS: PrecioSeguro negativo correcto")
        else:
            print(f"TEST_FAIL: mensaje incorrecto: {e}")
            
    try:
        mv.precio = "gratis"
        print("TEST_FAIL: PrecioSeguro permitió precio string")
    except TypeError as e:
        if str(e) == "Precio debe ser numérico":
            print("TEST_PASS: PrecioSeguro tipo correcto")
        else:
            print(f"TEST_FAIL: mensaje incorrecto: {e}")

    # 2. Test MetaVerificaTesting
    try:
        class SuiteInvalida(SuitePruebasBase):
            def una_funcion(self):
                pass
        print("TEST_FAIL: MetaVerificaTesting permitió clase sin test")
    except TypeError as e:
        if "debe tener al menos un método de test" in str(e):
            print("TEST_PASS: MetaVerificaTesting correcto")
        else:
            print(f"TEST_FAIL: mensaje incorrecto: {e}")
except Exception as e:
    print(f"TEST_FAIL: error en pruebas: {e}")
""",
        },
        "09": {
            "language": "python",
            "keywords": ["calcular_bayes", "inferir_falla_motor", "prior", "likelihood", "def"],
            "description": "Machine Learning y Bayes",
            "executable": False,
        },
        "10": {
            "language": "typescript",
            "keywords": ["type", "interface", "generic", "extends", "readonly", "unknown", "DeepReadonly", "HttpEvent", "DatabaseEvent"],
            "description": "TypeScript Backend",
            "executable": False,
        },
        "11": {
            "language": "elixir",
            "keywords": ["defmodule", "spawn", "receive", "send", "listen", "active_tasks"],
            "description": "Elixir & Concurrencia OTP",
            "executable": False,
        },
        "12": {
            "language": "yaml",
            "keywords": ["jobs", "steps", "uses", "run", "pytest", "on", "push", "ECR", "ECS", "AWS"],
            "description": "DevOps – CI/CD Pipeline",
            "executable": False,
        },
    }
}

# Referencia por compatibilidad retroactiva
RUBRICS = COURSES_RUBRICS["ingeniero-python"]

PASS_THRESHOLD = 60  # % mínimo para marcar como completado


# ──────────────────────────────────────────────────────────────────────────────
# EJECUCIÓN REAL EN SANDBOX DOCKER
# ──────────────────────────────────────────────────────────────────────────────

def _run_in_docker_sandbox(code: str, test_code: str, language: str, timeout: int = 10) -> dict:
    """
    Ejecuta el código del alumno + test_code en un contenedor Docker efímero.
    Retorna: {stdout, stderr, exit_code, execution_time_ms}
    """
    try:
        import docker  # pip install docker
    except ImportError:
        logger.warning("[Sandbox] docker-py no instalado, usando fallback estático.")
        return {"stdout": "", "stderr": "docker SDK no disponible", "exit_code": -1, "execution_time_ms": 0}

    image_map = {
        "python": "python:3.12-slim",
        "typescript": "node:20-alpine",
        "elixir": "elixir:1.16-slim",
    }
    image = image_map.get(language, "python:3.12-slim")

    # Construir el script completo a ejecutar
    full_code = f"{code}\n\n{test_code}"

    if language == "python":
        cmd = ["python", "-c", full_code]
    elif language == "typescript":
        cmd = ["node", "--input-type=module", "-e", full_code]
    else:
        # Para lenguajes sin ejecución directa, retornamos sin ejecutar
        return {"stdout": "", "stderr": "Ejecución no soportada para este lenguaje", "exit_code": 0, "execution_time_ms": 0}

    client = None
    container = None
    try:
        client = docker.from_env(timeout=15)
        start = time.time()

        container = client.containers.run(
            image=image,
            command=cmd,
            detach=True,
            network_mode="none",           # Sin acceso a red
            read_only=True,                # Filesystem read-only
            mem_limit="64m",               # 64 MB RAM máximo
            cpu_quota=50000,               # 50% de un CPU
            pids_limit=32,                 # Anti fork-bomb
            user="nobody",                 # Usuario no-root
            remove=False,                  # Lo removemos manualmente
            stdout=True,
            stderr=True,
        )

        # Esperar con timeout
        try:
            result = container.wait(timeout=timeout)
            exit_code = result.get("StatusCode", 1)
        except Exception:
            container.kill()
            exit_code = 124  # Timeout convencional

        elapsed_ms = int((time.time() - start) * 1000)
        logs = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
        err_logs = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")

        return {
            "stdout": logs[:4000],    # Limitar output
            "stderr": err_logs[:2000],
            "exit_code": exit_code,
            "execution_time_ms": elapsed_ms,
        }

    except Exception as e:
        logger.error(f"[Sandbox/Docker] Error ejecutando código: {e}", exc_info=True)
        return {"stdout": "", "stderr": str(e)[:500], "exit_code": -1, "execution_time_ms": 0}
    finally:
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass
        if client:
            try:
                client.close()
            except Exception:
                pass


# ──────────────────────────────────────────────────────────────────────────────
# EVALUACIÓN ESTÁTICA (KEYWORDS + AST)
# ──────────────────────────────────────────────────────────────────────────────

def _evaluate_static(code: str, rubric: dict) -> tuple[int, list[str], list[str]]:
    """
    Evalúa el código con coincidencia de keywords y análisis AST básico.
    Retorna: (score 0-100, keywords_encontradas, keywords_faltantes)
    """
    keywords = rubric.get("keywords", [])
    if not keywords:
        return 50, [], []

    found = []
    missing = []
    for kw in keywords:
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        if pattern.search(code):
            found.append(kw)
        else:
            missing.append(kw)

    score = round((len(found) / len(keywords)) * 100)

    # Bonus AST: verificar que hay al menos una definición de función/clase
    if rubric.get("language") == "python":
        try:
            tree = ast.parse(code)
            has_def = any(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) for node in ast.walk(tree))
            if has_def and score >= 40:
                score = min(100, score + 10)
        except SyntaxError:
            score = max(0, score - 20)  # Penalizar código con errores de sintaxis

    return score, found, missing


# ──────────────────────────────────────────────────────────────────────────────
# EVALUADOR PRINCIPAL
# ──────────────────────────────────────────────────────────────────────────────

def evaluate_exercise(course_slug: str, module_id: str, code: str) -> dict:
    """
    Punto de entrada principal del evaluador.
    Retorna un dict con todos los campos para poblar ExerciseSubmission.
    """
    course_rubrics = COURSES_RUBRICS.get(course_slug, COURSES_RUBRICS["ingeniero-python"])
    rubric = course_rubrics.get(module_id)
    if not rubric:
        return {
            "score": 0,
            "feedback": f"No existe rúbrica definida para el módulo {module_id}.",
            "stdout": "",
            "stderr": "",
            "execution_time_ms": 0,
            "is_completed": False,
        }

    language = rubric.get("language", "python")
    executable = rubric.get("executable", False)
    test_code = rubric.get("test_code", "")

    # ── Paso 1: Evaluación estática siempre ──
    static_score, found_kw, missing_kw = _evaluate_static(code, rubric)

    stdout = ""
    stderr = ""
    execution_time_ms = 0
    execution_score = 0
    executed = False

    # ── Paso 2: Ejecución real si el módulo es ejecutable ──
    if executable and language == "python" and code.strip():
        try:
            sandbox_result = _run_in_docker_sandbox(code, test_code, language)
            stdout = sandbox_result["stdout"]
            stderr = sandbox_result["stderr"]
            execution_time_ms = sandbox_result["execution_time_ms"]
            executed = True

            # Calcular score de ejecución basado en TEST_PASS / TEST_FAIL en stdout
            pass_count = stdout.count("TEST_PASS")
            fail_count = stdout.count("TEST_FAIL")
            total_tests = pass_count + fail_count
            if total_tests > 0:
                execution_score = round((pass_count / total_tests) * 100)
            elif sandbox_result["exit_code"] == 0 and not stderr:
                execution_score = 70  # Se ejecutó sin errores pero sin asserts
            else:
                execution_score = 0

        except Exception as e:
            logger.error(f"[Evaluador] Error en sandbox: {e}", exc_info=True)
            stderr = f"Error interno del evaluador: {str(e)[:200]}"

    # ── Paso 3: Combinar scores ──
    if executed:
        # 40% estático (keywords/AST) + 60% ejecución real
        final_score = round(static_score * 0.4 + execution_score * 0.6)
    else:
        final_score = static_score

    # ── Paso 4: Construir feedback ──
    feedback_parts = []

    if found_kw:
        feedback_parts.append(f"✅ Conceptos detectados: {', '.join(found_kw)}")
    if missing_kw:
        feedback_parts.append(f"❌ Conceptos faltantes: {', '.join(missing_kw)}")

    if executed:
        if "TEST_PASS" in stdout:
            feedback_parts.append("🧪 Tests automatizados: PASARON correctamente.")
        if "TEST_FAIL" in stdout:
            fail_msgs = [line for line in stdout.splitlines() if "TEST_FAIL" in line]
            feedback_parts.append(f"🔴 Tests fallidos: {'; '.join(fail_msgs[:3])}")
        if stderr and not any(kw in stderr for kw in ["docker SDK", "Ejecución no soportada"]):
            feedback_parts.append(f"⚠️ Errores de ejecución: {stderr[:200]}")
        if execution_time_ms > 0:
            feedback_parts.append(f"⚡ Tiempo de ejecución: {execution_time_ms}ms")

    if final_score == 100:
        feedback_parts.insert(0, "🏆 ¡Solución perfecta! Implementación completa y funcional.")
    elif final_score >= PASS_THRESHOLD:
        feedback_parts.insert(0, "✅ Ejercicio aprobado. Tu implementación es funcional.")
    else:
        feedback_parts.insert(0, f"📝 Necesitas mejorar. Score: {final_score}/100 (mínimo: {PASS_THRESHOLD})")

    return {
        "score": final_score,
        "feedback": "\n".join(feedback_parts),
        "stdout": stdout,
        "stderr": stderr,
        "execution_time_ms": execution_time_ms,
        "is_completed": final_score >= PASS_THRESHOLD,
    }
