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
RUBRICS: dict[str, dict] = {
    "00": {
        "language": "python",
        "keywords": ["try", "except", "backoff", "wraps", "docker", "venv"],
        "description": "Preparación IA y Berribot",
        "executable": False,
    },
    "01": {
        "language": "python",
        "keywords": ["wraps", "functools", "def", "wrapper", "@"],
        "description": "Python Avanzado – Decoradores",
        "executable": True,
        "test_code": """
# Auto-test inyectado por el evaluador
try:
    result = mi_decorador(lambda: 42)()
    assert result == 42, "El decorador debe preservar el valor de retorno"
    print("TEST_PASS: decorador funciona correctamente")
except Exception as e:
    print(f"TEST_FAIL: {e}")
""",
    },
    "02": {
        "language": "python",
        "keywords": ["__slots__", "asyncio", "await", "async"],
        "description": "Concurrencia y Rendimiento",
        "executable": True,
        "test_code": """
try:
    c = Coche()
    c.marca = "Toyota"
    assert c.marca == "Toyota"
    print("TEST_PASS: __slots__ funciona correctamente")
except AttributeError as e:
    print(f"TEST_FAIL: {e}")
except Exception as e:
    print(f"TEST_FAIL: {e}")
""",
    },
    "03": {
        "language": "python",
        "keywords": ["class", "def", "strategy", "interface", "abstract", "__init__"],
        "description": "Diseño y Arquitectura – Strategy Pattern",
        "executable": True,
        "test_code": """
try:
    ctx = Contexto(EstrategiaA())
    r1 = ctx.ejecutar()
    ctx.set_strategy(EstrategiaB())
    r2 = ctx.ejecutar()
    assert r1 != r2, "Estrategias distintas deben producir resultados distintos"
    print("TEST_PASS: Strategy Pattern implementado correctamente")
except Exception as e:
    print(f"TEST_FAIL: {e}")
""",
    },
    "04": {
        "language": "python",
        "keywords": ["pytest", "mock", "patch", "assert", "def test_", "MagicMock"],
        "description": "Robustez y Testing – Pytest Mocks",
        "executable": False,
    },
    "05": {
        "language": "python",
        "keywords": ["redis", "idempotency", "key", "set", "get", "nx"],
        "description": "Bases de Datos – Idempotencia Redis",
        "executable": False,
    },
    "06": {
        "language": "python",
        "keywords": ["def", "window", "max", "sum", "for", "range"],
        "description": "Algoritmos – Ventana Deslizante",
        "executable": True,
        "test_code": """
try:
    result = max_sum_window([2, 1, 5, 1, 3, 2], k=3)
    assert result == 9, f"Esperado 9, obtenido {result}"
    result2 = max_sum_window([1, 2, 3, 4, 5], k=2)
    assert result2 == 9, f"Esperado 9, obtenido {result2}"
    print("TEST_PASS: Ventana deslizante correcta")
except Exception as e:
    print(f"TEST_FAIL: {e}")
""",
    },
    "07": {
        "language": "python",
        "keywords": ["redis", "lock", "nx", "px", "set", "delete"],
        "description": "Sistemas Distribuidos – Distributed Lock",
        "executable": False,
    },
    "08": {
        "language": "python",
        "keywords": ["__get__", "__set__", "descriptor", "class", "def", "raise"],
        "description": "Metaprogramación – Descriptores",
        "executable": True,
        "test_code": """
try:
    class Vehiculo:
        km = KilometrajeDescriptor()
    v = Vehiculo()
    v.km = 100
    assert v.km == 100
    try:
        v.km = -1
        print("TEST_FAIL: Debería lanzar ValueError con valor negativo")
    except ValueError:
        print("TEST_PASS: Descriptor valida correctamente")
except Exception as e:
    print(f"TEST_FAIL: {e}")
""",
    },
    "09": {
        "language": "python",
        "keywords": ["NaiveBayes", "fit", "predict", "class", "def", "prior", "likelihood"],
        "description": "Machine Learning – Naive Bayes",
        "executable": False,
    },
    "10": {
        "language": "typescript",
        "keywords": ["type", "interface", "generic", "extends", "readonly", "unknown"],
        "description": "TypeScript Backend – Tipos avanzados",
        "executable": False,
    },
    "11": {
        "language": "elixir",
        "keywords": ["defmodule", "GenServer", "handle_call", "handle_cast", "init", "Supervisor"],
        "description": "Elixir OTP – GenServer",
        "executable": False,
    },
    "12": {
        "language": "yaml",
        "keywords": ["jobs", "steps", "uses", "run", "pytest", "on", "push"],
        "description": "DevOps – CI/CD Pipeline",
        "executable": False,
    },
}

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

def evaluate_exercise(module_id: str, code: str) -> dict:
    """
    Punto de entrada principal del evaluador.
    Retorna un dict con todos los campos para poblar ExerciseSubmission.
    """
    rubric = RUBRICS.get(module_id)
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
