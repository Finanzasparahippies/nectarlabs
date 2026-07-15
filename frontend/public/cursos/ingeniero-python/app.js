// =====================================================================
// LÓGICA DE APLICACIÓN - INTERACTIVE PYTHON COURSE DASHBOARD
// =====================================================================

// ── Constantes de configuración ───────────────────────────────────────
const API_BASE = '/api';
const COURSE_SLUG = 'ingeniero-python';

// ── Listado estructurado de módulos del curso ─────────────────────────
const MODULOS = [
    { id: "00", badge: "MÓDULO 00", title: "Preparación de IA y Nectar Bot", folder: "00_preparacion_ia_y_berribot" },
    { id: "01", badge: "MÓDULO 01", title: "Python Avanzado y Edge Cases", folder: "01_python_avanzado" },
    { id: "02", badge: "MÓDULO 02", title: "Concurrencia y Rendimiento", folder: "02_concurrencia_y_rendimiento" },
    { id: "03", badge: "MÓDULO 03", title: "Diseño y Arquitectura", folder: "03_diseno_y_arquitectura" },
    { id: "04", badge: "MÓDULO 04", title: "Robustez y Testing", folder: "04_robustez_y_testing" },
    { id: "05", badge: "MÓDULO 05", title: "Bases de Datos y APIs", folder: "05_bases_de_datos_y_apis" },
    { id: "06", badge: "MÓDULO 06", title: "Retos Algorítmicos", folder: "06_retos_algoritmicos" },
    { id: "07", badge: "MÓDULO 07", title: "Sistemas Distribuidos y Caché", folder: "07_sistemas_distribuidos" },
    { id: "08", badge: "MÓDULO 08", title: "Tips & Tricks y Metaprog.", folder: "08_tips_and_tricks" },
    { id: "09", badge: "MÓDULO 09", title: "Machine Learning y Bayes", folder: "09_machine_learning_y_bayes" },
    { id: "10", badge: "MÓDULO 10", title: "TypeScript Backend & Node", folder: "10_typescript_backend" },
    { id: "11", badge: "MÓDULO 11", title: "Elixir & Concurrencia OTP", folder: "11_elixir_concurrencia_otp" },
    { id: "12", badge: "MÓDULO 12", title: "AWS, Microservicios y DevOps", folder: "12_arquitectura_aws_devops" },
];

// ── Escenarios Nectar Bot IA (Guía Zen) ─────────────────────────────────
const ESCENARIOS_BOT = {
    excepciones: {
        pregunta: "¿Cómo manejas los errores en una API que conecta con una base de datos externa para asegurar que la aplicación no se caiga?",
        keywords: [
            { palabra: "try-except-finally", reg: /try.*except.*finally/i, pista: "El bloque de contención y conclusión final" },
            { palabra: "específica", reg: /especifica|específico/i, pista: "La captura precisa de fallos concretos" },
            { palabra: "ConnectionError", reg: /connectionerror|operationalerror/i, pista: "La naturaleza del error de comunicación" },
            { palabra: "exponential backoff", reg: /exponential backoff|retraso exponencial/i, pista: "La virtud de la paciencia en los reintentos" },
            { palabra: "finally", reg: /finally/i, pista: "El cierre incondicional de los recursos" },
            { palabra: "context managers", reg: /context manager|administrador.*contexto|with/i, pista: "El guardián automático del ciclo de vida" },
        ],
        recomendacion: "Contempla cómo asegurar el flujo ante una tormenta de red, reintentando con calma y liberando todo recurso al concluir.",
    },
    decoradores: {
        pregunta: "¿Qué es un decorador en Python y proporciona un caso de uso real en una aplicación web?",
        keywords: [
            { palabra: "función de orden superior", reg: /orden superior|higher order/i, pista: "La función que envuelve a otra función" },
            { palabra: "modificar comportamiento", reg: /modificar.*comportamiento|extender.*comportamiento/i, pista: "El arte de alterar la acción sin cambiar el interior" },
            { palabra: "autenticación / JWT", reg: /autenticacion|jwt|token/i, pista: "El sello de identidad de quien ingresa" },
            { palabra: "logging / auditoría", reg: /logging|auditoria|registro/i, pista: "El registro del paso del tiempo y las acciones" },
            { palabra: "functools.wraps", reg: /functools\.wraps|@wraps/i, pista: "La preservación de la identidad original del objeto" },
        ],
        recomendacion: "Reflexiona sobre las envolturas que alteran el destino de una función, protegiendo su verdadera identidad original.",
    },
    entornos: {
        pregunta: "¿Cómo garantizas que tu código de Python sea perfectamente replicable en cualquier entorno de servidor o la nube?",
        keywords: [
            { palabra: "entorno virtual / venv", reg: /entorno virtual|venv|poetry|pipenv/i, pista: "El aislamiento del ecosistema local" },
            { palabra: "requirements.txt", reg: /requirements\.txt|pyproject\.toml/i, pista: "El registro estricto de las dependencias" },
            { palabra: "Docker / Dockerfile", reg: /docker|dockerfile/i, pista: "El contenedor universal e inmutable" },
            { palabra: "python:3.11-slim", reg: /slim|alpine|imagen.*ligera/i, pista: "La ligereza y minimalismo de la base" },
            { palabra: "usuario no-root", reg: /no-root|no root|seguridad/i, pista: "La humildad de privilegios (no gobernar como raíz)" },
        ],
        recomendacion: "Busca que tu creación nazca aislada de forma pura, encapsulada en una vasija minimalista y segura del exterior.",
    },
    typescript: {
        pregunta: "¿Cómo diseñas un tipado seguro y robusto en TypeScript para manejar payloads de APIs de terceros con estructuras desconocidas?",
        keywords: [
            { palabra: "unknown", reg: /unknown/i, pista: "El tipo de aquello que no ha sido revelado (lo desconocido)" },
            { palabra: "Type Guards", reg: /type guard|isUserPayload|is[A-Z]/i, pista: "Los guardianes que validan la forma en tiempo de ejecución" },
            { palabra: "Discriminated Unions", reg: /discriminated union|union.*discriminada/i, pista: "La unión diferenciada por un sello identificativo" },
            { palabra: "Zod / runtime validation", reg: /zod|runtime|class-validator/i, pista: "El contrato de validación al instante" },
            { palabra: "Generics", reg: /generic|genérico/i, pista: "La flexibilidad de formas universales" },
        ],
        recomendacion: "Medita sobre cómo recibir lo incierto, verificando su naturaleza con guardianes antes de darle un lugar seguro.",
    },
    elixir: {
        pregunta: "¿Cómo manejas la concurrencia y la tolerancia a fallos extrema en una aplicación utilizando Elixir y el estándar OTP?",
        keywords: [
            { palabra: "Modelo de Actores", reg: /actor|actores/i, pista: "El modelo de entidades independientes que conversan" },
            { palabra: "procesos BEAM", reg: /beam|proceso.*ligero/i, pista: "Las chispas ligeras de ejecución de la máquina virtual" },
            { palabra: "GenServer", reg: /genserver/i, pista: "El servidor genérico que atesora el estado" },
            { palabra: "Supervisor / Let it crash", reg: /supervisor|let it crash|deja.*caer/i, pista: "La filosofía de permitir el colapso controlado" },
            { palabra: "One_For_One", reg: /one_for_one|one for one/i, pista: "La estrategia de revivir solo al caído" },
        ],
        recomendacion: "Acepta el error como parte del ciclo; deja que lo imperfecto caiga para que su supervisor lo resucite en paz.",
    },
    aws: {
        pregunta: "¿Cómo diseñarías una arquitectura de microservicios de alta disponibilidad y tolerante a fallos utilizando AWS?",
        keywords: [
            { palabra: "Event-Driven Architecture", reg: /event-driven|event driven|arquitectura.*evento/i, pista: "La danza basada en los sucesos ocurridos" },
            { palabra: "SQS / SNS / colas", reg: /sqs|sns|cola|kafka/i, pista: "Las vías de paso y colas de mensajes desacopladas" },
            { palabra: "Patrón Sagas", reg: /saga|sagas|compensacion/i, pista: "El viaje transaccional con retorno compensatorio" },
            { palabra: "ECS / Lambda / serverless", reg: /ecs|fargate|lambda|serverless/i, pista: "El cómputo sin servidores fijos" },
            { palabra: "RDS Multi-AZ", reg: /rds|multi-az|multi az/i, pista: "Las bases replicadas en múltiples zonas" },
            { palabra: "Idempotencia", reg: /idempotencia|idempotente/i, pista: "La garantía de que la misma acción repetida no altera el resultado" },
        ],
        recomendacion: "Dibuja un flujo donde los servicios conversen por eventos en colas infinitas, listos para deshacer el camino si hay desarmonía.",
    },
};

// =====================================================================
// ESTADO GLOBAL
// =====================================================================
let moduloActivo = MODULOS[1];
let progresoModulos = {};
let authToken = null;
let cmEditor = null;   // Instancia activa de CodeMirror

// =====================================================================
// INICIALIZACIÓN
// =====================================================================
document.addEventListener("DOMContentLoaded", async () => {
    await initAuth();
    inicializarSidebar();
    cargarModulo(moduloActivo.id);
    configurarEventosPestañas();
    configurarEventosBot();
    configurarEventosCopiarEjercicios();
    actualizarProgresoGeneral();

    document.getElementById("btn-completar-modulo")
        .addEventListener("click", toggleModuloCompletado);
    document.getElementById("btn-evaluar-ejercicio")
        .addEventListener("click", submitEjercicio);
});

// =====================================================================
// AUTENTICACIÓN – JWT reutilizado del dashboard Next.js
// =====================================================================
async function initAuth() {
    // El dashboard Next.js guarda el token bajo la clave 'access'
    const token = localStorage.getItem('access');
    if (!token) {
        // Sin auth: progreso desde localStorage solamente
        progresoModulos = JSON.parse(localStorage.getItem("progreso_modulos_python") || "{}");
        return;
    }

    authToken = token;
    _mostrarAuthBadge(true);

    // Cargar progreso real del backend como fuente de verdad
    await cargarProgresoBackend();
}

function _mostrarAuthBadge(visible) {
    const badge = document.getElementById("auth-badge");
    if (badge) badge.style.display = visible ? "flex" : "none";
}

// ── Wrapper genérico de fetch con JWT ────────────────────────────────
async function apiRequest(method, endpoint, data = null) {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const opts = { method, headers };
    if (data) opts.body = JSON.stringify(data);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, opts);
        if (res.status === 401) {
            authToken = null;
            _mostrarAuthBadge(false);
            return null;
        }
        if (!res.ok) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

// ── Cargar progreso del backend ───────────────────────────────────────
async function cargarProgresoBackend() {
    const data = await apiRequest("GET", `/courses/progress/?course_slug=${COURSE_SLUG}`);
    if (Array.isArray(data) && data.length > 0) {
        progresoModulos = {};
        data.forEach(item => {
            if (item.is_completed) progresoModulos[item.module_id] = true;
        });
        // Backup offline
        localStorage.setItem("progreso_modulos_python", JSON.stringify(progresoModulos));
    } else {
        // Fallback: localStorage como fuente si el backend no responde
        progresoModulos = JSON.parse(localStorage.getItem("progreso_modulos_python") || "{}");
    }
}

// =====================================================================
// EDITOR CODEMIRROR
// =====================================================================
const LANG_MODE_MAP = {
    python: "python",
    typescript: "javascript",
    elixir: "text/plain",   // No hay modo Elixir en CM5 CDN
    yaml: "yaml",
    hcl: "text/plain",
};

function obtenerLenguajeModulo(moduleId) {
    if (moduleId === "10") return "typescript";
    if (moduleId === "11") return "elixir";
    if (moduleId === "12") return "yaml";
    return "python";
}

function initEditor(codigoBase, language) {
    const container = document.getElementById("editor-ejercicios");
    if (!container) return;

    const mode = LANG_MODE_MAP[language] || "python";

    if (cmEditor) {
        // Reutilizar instancia existente – solo actualizar contenido y modo
        cmEditor.setValue(codigoBase || "");
        cmEditor.setOption("mode", mode);
        window.cmEditor = cmEditor;
        return;
    }

    cmEditor = CodeMirror(container, {
        value: codigoBase || "",
        mode: mode,
        theme: "dracula",
        lineNumbers: true,
        tabSize: 4,
        indentWithTabs: false,
        autoCloseBrackets: true,
        matchBrackets: true,
        lineWrapping: false,
        extraKeys: {
            "Tab": cm => cm.execCommand("insertSoftTab"),
        },
    });

    // Altura del editor
    cmEditor.setSize("100%", "550px");
    window.cmEditor = cmEditor;
}

// =====================================================================
// CARGA DE MÓDULO
// =====================================================================
async function cargarModulo(id) {
    const modulo = MODULOS.find(m => m.id === id);
    if (!modulo) return;
    moduloActivo = modulo;

    // Actualizar encabezados
    document.getElementById("current-module-id").textContent = modulo.badge;
    document.getElementById("current-module-title").textContent = modulo.title;

    // Limitar y reiniciar chat para el módulo cargado
    reiniciarChatParaModuloActivo();
    actualizarLimiteChatZen();

    // Estado del botón Completar
    const btnCompletar = document.getElementById("btn-completar-modulo");
    if (progresoModulos[modulo.id]) {
        btnCompletar.classList.replace("btn-secondary", "btn-primary");
        btnCompletar.innerHTML = `<i class="bx bxs-check-circle"></i> Completado`;
    } else {
        btnCompletar.classList.replace("btn-primary", "btn-secondary");
        btnCompletar.innerHTML = `<i class="bx bx-check-circle"></i> Completar`;
    }

    // Ocultar panel de resultados al cambiar de módulo
    const resultPanel = document.getElementById("resultados-ejercicio");
    if (resultPanel) resultPanel.style.display = "none";

    // Determinar extensiones por módulo
    const language = obtenerLenguajeModulo(modulo.id);
    let extEjemplos = "py", extEjercicios = "py";
    let langEjemplos = "python";

    if (modulo.id === "10") { extEjemplos = "ts"; extEjercicios = "ts"; langEjemplos = "typescript"; }
    else if (modulo.id === "11") { extEjemplos = "exs"; extEjercicios = "exs"; langEjemplos = "elixir"; }
    else if (modulo.id === "12") { extEjemplos = "tf"; extEjercicios = "yml"; langEjemplos = "hcl"; }

    const fileEjemplos = `ejemplos.${extEjemplos}`;
    const fileEjercicios = modulo.id === "12" ? `ci_cd_example.${extEjercicios}` : `ejercicios.${extEjercicios}`;

    // Actualizar labels de cabecera
    const ejEl = document.getElementById("ejemplos-filename");
    const ezEl = document.getElementById("ejercicios-filename");
    if (ejEl) ejEl.textContent = fileEjemplos;
    if (ezEl) ezEl.textContent = fileEjercicios;

    const pathTeoria = `../${modulo.folder}/README.md`;
    const pathEjemplos = `../${modulo.folder}/${fileEjemplos}`;
    const pathEjercicios = `../${modulo.folder}/${fileEjercicios}`;

    // ── Cargar Contenidos desde el Backend (Base de Datos) o Fallback local ──
    document.getElementById("teoria-container").innerHTML = "<p>Cargando teoría...</p>";
    let teoria = "";
    let ejemplos = "";
    let codigoBase = "";

    try {
        const moduloData = await apiRequest("GET", `/courses/modules/${modulo.id}/?course_slug=${COURSE_SLUG}`);
        if (moduloData) {
            teoria = moduloData.teoria;
            ejemplos = moduloData.ejemplos;
            codigoBase = moduloData.ejercicios;
        }
    } catch (err) {
        console.warn("No se pudo conectar con el backend de cursos, usando fallback local:", err);
    }

    // Fallbacks si la API no devolvió datos
    if (!teoria) {
        try {
            teoria = await _fetchWithFallback(pathTeoria, COURSE_DATA[modulo.id]?.teoria);
        } catch (err) {
            teoria = `<p class="error-text">No se pudo cargar la teoría: ${err.message}</p>`;
        }
    }
    if (!ejemplos) {
        try {
            ejemplos = await _fetchWithFallback(pathEjemplos, COURSE_DATA[modulo.id]?.ejemplos);
        } catch (err) {
            ejemplos = `Error al cargar ejemplos: ${err.message}`;
        }
    }
    if (!codigoBase) {
        try {
            codigoBase = await _fetchWithFallback(pathEjercicios, COURSE_DATA[modulo.id]?.ejercicios);
        } catch {
            codigoBase = COURSE_DATA[modulo.id]?.ejercicios || `# Ejercicios del Módulo ${modulo.id}`;
        }
    }

    // ── 1. Renderizar Teoría ──────────────────────────────────────────
    const container = document.getElementById("teoria-container");
    container.innerHTML = marked.parse(teoria);
    Prism.highlightAllUnder(container);

    // ── 2. Renderizar Ejemplos (Prism – read-only) ────────────────────
    const codeEl = document.getElementById("code-ejemplos");
    codeEl.textContent = ejemplos;
    codeEl.className = `language-${langEjemplos}`;
    Prism.highlightElement(codeEl);

    // ── 3. Preparar Ejercicios en el Editor CodeMirror ────────────────

    // Si el alumno tiene una submission guardada en el backend, la cargamos como código inicial
    if (authToken) {
        const submission = await apiRequest(
            "GET",
            `/courses/submission/?course_slug=${COURSE_SLUG}&module_id=${modulo.id}`
        );
        if (submission?.code) {
            codigoBase = submission.code;
            // Mostrar score anterior si existe
            if (submission.score > 0) {
                _mostrarResultados(submission);
            }
        }
    }

    initEditor(codigoBase, language);

    // Actualizar hint del sandbox
    const hint = document.getElementById("ejercicio-hint");
    if (hint) {
        if (authToken) {
            hint.innerHTML = `<i class="bx bx-shield-check"></i> Sandbox Docker aislado · Progreso guardado en la nube`;
        } else {
            hint.innerHTML = `<i class="bx bx-info-circle"></i> <a href="/login" style="color:var(--accent)">Inicia sesión</a> para guardar tu progreso`;
        }
    }
}

// Fetch con fallback a COURSE_DATA offline
async function _fetchWithFallback(url, fallback) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP error");
        return await res.text();
    } catch {
        if (fallback) return fallback;
        throw new Error(`Recurso no disponible: ${url}`);
    }
}

// =====================================================================
// SUBMIT EJERCICIO → BACKEND (o evaluación offline)
// =====================================================================
async function submitEjercicio() {
    if (!cmEditor) return;

    const code = cmEditor.getValue().trim();
    if (!code) return;

    const btn = document.getElementById("btn-evaluar-ejercicio");
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Evaluando...`;

    // Mostrar panel de carga
    const resultPanel = document.getElementById("resultados-ejercicio");
    resultPanel.style.display = "block";
    document.getElementById("resultado-titulo").textContent = "Ejecutando en sandbox…";
    document.getElementById("score-ejercicio-valor").textContent = "…";
    document.getElementById("resultado-feedback").textContent = "";
    _animarScoreRing(0);

    const language = obtenerLenguajeModulo(moduloActivo.id);

    if (authToken) {
        // ── Evaluación real: backend + sandbox Docker ──────────────────
        const result = await apiRequest("POST", "/courses/submit/", {
            course_slug: COURSE_SLUG,
            module_id: moduloActivo.id,
            code,
            language,
        });

        if (result) {
            _mostrarResultados(result);
            // Actualizar progreso si el módulo fue completado
            if (result.is_completed && !progresoModulos[moduloActivo.id]) {
                progresoModulos[moduloActivo.id] = true;
                localStorage.setItem("progreso_modulos_python", JSON.stringify(progresoModulos));
                inicializarSidebar();
                actualizarProgresoGeneral();
            }
        } else {
            document.getElementById("resultado-titulo").textContent = "Error al conectar con el servidor.";
        }
    } else {
        // ── Evaluación offline: keywords locales ──────────────────────
        const offlineResult = _evaluarOffline(code, moduloActivo.id);
        _mostrarResultados(offlineResult);
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="bx bx-play"></i> Ejecutar y Evaluar`;
}

// Evaluador offline por keywords (sin backend)
function _evaluarOffline(code, moduleId) {
    const KEYWORDS_MAP = {
        "01": ["wraps", "functools", "def", "wrapper"],
        "02": ["__slots__", "asyncio", "await"],
        "03": ["class", "strategy", "def"],
        "04": ["pytest", "mock", "assert"],
        "05": ["redis", "key", "set"],
        "06": ["window", "max", "sum"],
        "07": ["redis", "lock", "nx"],
        "08": ["__get__", "__set__", "descriptor"],
        "09": ["fit", "predict", "prior"],
        "10": ["type", "interface", "extends"],
        "11": ["defmodule", "GenServer", "handle_call"],
        "12": ["jobs", "steps", "pytest"],
    };
    const keywords = KEYWORDS_MAP[moduleId] || [];
    const found = keywords.filter(kw => new RegExp(kw, "i").test(code));
    const score = keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 50;
    return {
        score,
        is_completed: score >= 60,
        feedback: found.length > 0
            ? `✅ Detectados: ${found.join(", ")}\n❌ Faltantes: ${keywords.filter(k => !found.includes(k)).join(", ")}\n\n⚠️ Evaluación offline — inicia sesión para obtener análisis completo con ejecución real en sandbox.`
            : "❌ No se detectaron conceptos clave. Revisa los ejemplos del módulo.",
        stdout: "",
        stderr: "",
        execution_time_ms: 0,
    };
}

// ── Renderizar resultados en el panel ─────────────────────────────────
function _mostrarResultados(result) {
    const score = result.score ?? 0;
    const passed = result.is_completed ?? score >= 60;

    document.getElementById("score-ejercicio-valor").textContent = `${score}%`;
    _animarScoreRing(score);

    const titulo = document.getElementById("resultado-titulo");
    titulo.textContent = passed
        ? "✅ Ejercicio aprobado"
        : score >= 40
            ? "📝 Necesitas mejorar"
            : "🔴 Intenta de nuevo";
    titulo.style.color = passed ? "var(--accent)" : score >= 40 ? "#f59e0b" : "#ef4444";

    // Tiempo de ejecución
    const tiempoEl = document.getElementById("resultado-tiempo");
    if (tiempoEl) {
        tiempoEl.textContent = result.execution_time_ms > 0
            ? `⚡ Ejecutado en ${result.execution_time_ms}ms`
            : "";
    }

    // Feedback formateado (saltos de línea → <br>)
    const fbEl = document.getElementById("resultado-feedback");
    if (fbEl && result.feedback) {
        fbEl.innerHTML = result.feedback
            .split("\n")
            .map(line => `<span>${line}</span>`)
            .join("<br>");
    }

    // Stdout del sandbox
    const stdoutWrapper = document.getElementById("resultado-stdout-wrapper");
    const stdoutPre = document.getElementById("resultado-stdout");
    if (stdoutWrapper && stdoutPre) {
        const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
        if (output) {
            stdoutWrapper.style.display = "block";
            stdoutPre.textContent = output;
        } else {
            stdoutWrapper.style.display = "none";
        }
    }
}

// Animar el SVG score ring
function _animarScoreRing(score) {
    const circle = document.getElementById("score-ring-fill");
    if (!circle) return;
    const circumference = 163.36;
    const offset = circumference - (score / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = score >= 60 ? "var(--accent)" : score >= 40 ? "#f59e0b" : "#ef4444";
}

// =====================================================================
// PROGRESO Y SIDEBAR
// =====================================================================
function inicializarSidebar() {
    const listContainer = document.getElementById("modules-list");
    listContainer.innerHTML = "";

    MODULOS.forEach(mod => {
        const isCompleted = !!progresoModulos[mod.id];
        const checkIcon = isCompleted ? "bx-check-circle" : "bx-circle";

        const li = document.createElement("li");
        li.className = `module-item ${mod.id === moduloActivo.id ? "active" : ""}`;
        li.setAttribute("data-mod-id", mod.id);

        li.innerHTML = `
            <div class="module-item-left">
                <span class="mod-id">${mod.badge}</span>
                <span class="mod-title">${mod.title}</span>
            </div>
            <i class="bx ${checkIcon} module-status-check ${isCompleted ? "completed" : ""}"></i>
        `;

        li.addEventListener("click", (e) => {
            if (e.target.classList.contains("module-status-check")) {
                toggleModuloCompletadoPorId(mod.id);
                return;
            }
            document.querySelectorAll(".module-item").forEach(i => i.classList.remove("active"));
            li.classList.add("active");
            cargarModulo(mod.id);
        });

        listContainer.appendChild(li);
    });
}

function toggleModuloCompletado() {
    toggleModuloCompletadoPorId(moduloActivo.id);
}

function toggleModuloCompletadoPorId(id) {
    if (progresoModulos[id]) {
        delete progresoModulos[id];
    } else {
        progresoModulos[id] = true;
    }
    localStorage.setItem("progreso_modulos_python", JSON.stringify(progresoModulos));
    inicializarSidebar();
    actualizarProgresoGeneral();
    if (moduloActivo.id === id) cargarModulo(id);
}

function actualizarProgresoGeneral() {
    const total = MODULOS.length;
    const completados = Object.keys(progresoModulos).length;
    const pct = Math.round((completados / total) * 100);
    document.getElementById("general-progress-pct").textContent = `${pct}%`;
    document.getElementById("general-progress-fill").style.width = `${pct}%`;
}

// =====================================================================
// PESTAÑAS
// =====================================================================
function configurarEventosPestañas() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            const targetId = btn.getAttribute("data-tab");
            document.getElementById(targetId).classList.add("active");

            // Refrescar CodeMirror al hacerse visible (necesario para renderizado correcto)
            if (targetId === "tab-ejercicios" && cmEditor) {
                setTimeout(() => cmEditor.refresh(), 50);
            }
        });
    });

    // Copiar para la pestaña de Ejemplos (Prism)
    document.querySelectorAll(".btn-copy[data-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const text = document.getElementById(targetId)?.textContent || "";
            navigator.clipboard.writeText(text).then(() => {
                btn.innerHTML = `<i class="bx bx-check"></i> Copiado`;
                setTimeout(() => { btn.innerHTML = `<i class="bx bx-copy"></i> Copiar`; }, 2000);
            });
        });
    });
}

// Copiar desde el editor CodeMirror
function configurarEventosCopiarEjercicios() {
    const btn = document.getElementById("btn-copy-ejercicios");
    if (!btn) return;
    btn.addEventListener("click", () => {
        const text = cmEditor ? cmEditor.getValue() : "";
        navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = `<i class="bx bx-check"></i> Copiado`;
            setTimeout(() => { btn.innerHTML = `<i class="bx bx-copy"></i> Copiar`; }, 2000);
        });
    });
}

// =====================================================================
// SIMULADOR BERRIBOT IA
// =====================================================================
function configurarEventosBot() {
    const drawer = document.getElementById("bot-drawer");
    const btnAbrir = document.getElementById("btn-abrir-bot");
    const btnCerrar = document.getElementById("btn-cerrar-bot");
    const selectEscenario = document.getElementById("select-escenario");
    const btnEvaluar = document.getElementById("btn-evaluar-respuesta");

    btnAbrir.addEventListener("click", () => {
        drawer.classList.add("open");
        actualizarEscenariosEvaluacion();
    });
    btnCerrar.addEventListener("click", () => drawer.classList.remove("open"));

    selectEscenario.addEventListener("change", () => {
        const escenario = ESCENARIOS_BOT[selectEscenario.value];
        document.getElementById("pregunta-texto").textContent = escenario.pregunta;
        document.getElementById("input-respuesta").value = "";
        document.getElementById("resultados-ia").style.display = "none";
        actualizarEscenariosEvaluacion();
    });

    btnEvaluar.addEventListener("click", evaluarRespuestaIA);

    // Configurar pestañas del bot
    const botTabButtons = document.querySelectorAll(".bot-tab-btn");
    const botTabContents = document.querySelectorAll(".bot-tab-content");

    botTabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            botTabButtons.forEach(b => b.classList.remove("active"));
            botTabContents.forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            
            const targetId = "bot-panel-" + btn.getAttribute("data-bot-tab");
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add("active");
            }
        });
    });

    // Inicializar Chat Zen e interactividad
    inicializarChatZen();
    
    // Inicializar el estado de bloqueo de las evaluaciones
    actualizarEscenariosEvaluacion();
}

async function evaluarRespuestaIA() {
    const selectValue = document.getElementById("select-escenario").value;
    const escenario = ESCENARIOS_BOT[selectValue];
    const respuesta = document.getElementById("input-respuesta").value;

    if (!respuesta.trim()) {
        alert("Por favor, ingresa una respuesta técnica primero.");
        return;
    }

    const btnEvaluar = document.getElementById("btn-evaluar-respuesta");
    const originalText = btnEvaluar.innerHTML;

    // Deshabilitar botón e indicar carga
    btnEvaluar.disabled = true;
    btnEvaluar.innerHTML = `<i class="bx bx-loader-alt bx-spin"></i> Nectar Bot meditando...`;

    // Ocultar resultados previos
    document.getElementById("resultados-ia").style.display = "none";

    let result = null;

    // 1. Intentar llamar al backend para evaluación conceptual (LLM)
    try {
        const response = await fetch(`${API_BASE}/courses/evaluate-conceptual/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({
                module_id: selectValue,
                respuesta_alumno: respuesta
            })
        });

        if (response.ok) {
            result = await response.json();
        }
    } catch (err) {
        console.warn("Error al evaluar con backend, aplicando fallback local:", err);
    }

    // 2. Fallback local por keywords si no se pudo obtener respuesta del backend
    if (!result) {
        let matchedCount = 0;
        const conceptosEvaluados = escenario.keywords.map(keyword => {
            const isMatched = keyword.reg.test(respuesta);
            if (isMatched) matchedCount++;
            return {
                nombre: keyword.palabra,
                cumple: isMatched
            };
        });

        const scorePct = Math.round((matchedCount / escenario.keywords.length) * 100);
        const conceptosFaltantes = conceptosEvaluados.filter(c => !c.cumple).map(c => c.nombre);

        result = {
            idea_principal: scorePct >= 50,
            conceptos: conceptosEvaluados,
            errores: conceptosFaltantes.length > 0 ? [`Falta profundizar en los conceptos clave: ${conceptosFaltantes.join(", ")}`] : [],
            score: scorePct,
            justificacion: "Evaluación local completada mediante palabras clave. [Modo offline]"
        };
    }

    // 3. Renderizar resultados detallados
    const feedbackList = document.getElementById("keywords-list-feedback");
    feedbackList.innerHTML = "";

    result.conceptos.forEach(concept => {
        const li = document.createElement("li");
        if (concept.cumple) {
            li.className = "matched";
            li.innerHTML = `<i class="bx bx-check-double"></i> ${concept.nombre}`;
        } else {
            li.className = "";
            li.innerHTML = `<i class="bx bx-compass"></i> ${concept.nombre}`;
        }
        feedbackList.appendChild(li);
    });

    document.getElementById("score-pct").textContent = `${result.score}%`;

    const recText = document.getElementById("recomendacion-texto");
    let recHTML = `<span>${result.justificacion}</span>`;

    if (result.errores && result.errores.length > 0) {
        recHTML += `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1)">` +
                   `<strong style="font-size:12px; color:hsl(var(--accent-blue)); display:block; margin-bottom:6px;">Detalles a mejorar:</strong>` +
                   `<ul style="margin: 0; padding-left: 16px; font-size: 12.5px; color: hsl(var(--text-secondary)); list-style-type: none;">` +
                   result.errores.map(e => `<li style="margin-bottom: 4px; display:flex; align-items:flex-start; gap:6px;"><i class="bx bx-info-circle" style="color:hsl(var(--accent-blue)); font-size:14px; margin-top:2px;"></i><span>${e}</span></li>`).join("") +
                   `</ul></div>`;
    }
    recText.innerHTML = recHTML;

    document.getElementById("resultados-ia").style.display = "block";

    // 4. Persistir progreso si pasa la prueba
    if (result.score >= 60) {
        let evalProgreso = {};
        try {
            evalProgreso = JSON.parse(localStorage.getItem("nectar_bot_eval_progress") || "{}");
        } catch(e) {}
        evalProgreso[selectValue] = result.score;
        localStorage.setItem("nectar_bot_eval_progress", JSON.stringify(evalProgreso));

        // Refrescar candados e interfaces
        setTimeout(actualizarEscenariosEvaluacion, 1500);
    }

    // Restaurar botón
    btnEvaluar.disabled = false;
    btnEvaluar.innerHTML = originalText;

    // Desplazar el panel del bot suavemente hacia abajo para ver el feedback
    const drawerPanel = document.getElementById("bot-panel-eval");
    if (drawerPanel) {
        setTimeout(() => {
            drawerPanel.scrollTo({
                top: drawerPanel.scrollHeight,
                behavior: "smooth"
            });
        }, 150);
    }
}

// =====================================================================
// FUNCIONES DE APOYO NECTAR BOT (Chat Zen & Desbloqueos)
// =====================================================================
function actualizarEscenariosEvaluacion() {
    const select = document.getElementById("select-escenario");
    if (!select) return;

    let evalProgreso = {};
    try {
        evalProgreso = JSON.parse(localStorage.getItem("nectar_bot_eval_progress") || "{}");
    } catch(e) {}

    const ORDEN = ["excepciones", "decoradores", "entornos", "typescript", "elixir", "aws"];
    const selectValue = select.value;

    const index = ORDEN.indexOf(selectValue);
    let isBlocked = false;
    let blockedReason = "";

    if (index > 0) {
        const escenarioAnterior = ORDEN[index - 1];
        const scoreAnterior = evalProgreso[escenarioAnterior] || 0;
        if (scoreAnterior < 60) {
            isBlocked = true;
            blockedReason = `Debes aprobar el escenario anterior (${obtenerNombreEscenario(escenarioAnterior)}) con un score mínimo del 60% para desbloquear este sendero.`;
        }
    }

    const contentWrapper = document.getElementById("eval-content-wrapper");
    const blockedMessage = document.getElementById("eval-blocked-message");
    const reasonText = document.getElementById("blocked-reason-text");

    if (isBlocked) {
        if (contentWrapper) contentWrapper.style.display = "none";
        if (blockedMessage) blockedMessage.style.display = "flex";
        if (reasonText) reasonText.textContent = blockedReason;
    } else {
        if (contentWrapper) contentWrapper.style.display = "block";
        if (blockedMessage) blockedMessage.style.display = "none";
    }

    Array.from(select.options).forEach(opt => {
        const optVal = opt.value;
        const optIdx = ORDEN.indexOf(optVal);
        let optBlocked = false;
        if (optIdx > 0) {
            const antVal = ORDEN[optIdx - 1];
            if ((evalProgreso[antVal] || 0) < 60) {
                optBlocked = true;
            }
        }
        const baseName = obtenerNombreEscenario(optVal);
        opt.textContent = optBlocked ? `🔒 ${baseName}` : `✓ ${baseName}`;
    });
}

function obtenerNombreEscenario(val) {
    const nombres = {
        excepciones: "Manejo de Excepciones",
        decoradores: "Decoradores en Python",
        entornos: "Gestión de Dependencias",
        typescript: "TypeScript Backend",
        elixir: "Elixir y Concurrencia OTP",
        aws: "AWS & DevOps"
    };
    return nombres[val] || val;
}

function inicializarChatZen() {
    const btnEnviar = document.getElementById("btn-chat-enviar");
    const inputText = document.getElementById("chat-input-text");
    const container = document.getElementById("chat-conversation");

    if (!btnEnviar || !inputText || !container) return;

    // Remover listeners viejos clonando el botón para evitar duplicados
    const newBtn = btnEnviar.cloneNode(true);
    btnEnviar.parentNode.replaceChild(newBtn, btnEnviar);

    inputText.onkeypress = (e) => {
        if (e.key === "Enter" && !newBtn.disabled) {
            newBtn.click();
        }
    };

    newBtn.onclick = () => {
        const txt = inputText.value.trim();
        if (!txt) return;

        const moduloId = moduloActivo ? moduloActivo.id : "00";
        let chatUsage = {};
        try {
            chatUsage = JSON.parse(localStorage.getItem("nectar_bot_chat_usage") || "{}");
        } catch(e) {}

        const preguntasHechas = chatUsage[moduloId] || 0;
        if (preguntasHechas >= 5) {
            alert("Has alcanzado el límite de 5 dudas en este módulo.");
            return;
        }

        agregarMensajeChat("user", txt);
        inputText.value = "";
        container.scrollTop = container.scrollHeight;

        // Incrementar y persistir
        chatUsage[moduloId] = preguntasHechas + 1;
        localStorage.setItem("nectar_bot_chat_usage", JSON.stringify(chatUsage));
        actualizarLimiteChatZen();

        const typingId = agregarMensajeChat("bot", "🕯️ <i>Nectar Bot medita tu duda...</i>");
        container.scrollTop = container.scrollHeight;

        setTimeout(() => {
            const typingMsg = document.getElementById(typingId);
            if (typingMsg) typingMsg.remove();

            const respuestaZen = generarRespuestaChatZen(txt);
            const msgId = agregarMensajeChat("bot", respuestaZen);
            
            // Colorear código recién inyectado
            const msgEl = document.getElementById(msgId);
            if (msgEl && typeof Prism !== "undefined") {
                msgEl.querySelectorAll("pre code").forEach(el => {
                    Prism.highlightElement(el);
                });
            }
            container.scrollTop = container.scrollHeight;
        }, 1200);
    };
}

function actualizarLimiteChatZen() {
    const moduloId = moduloActivo ? moduloActivo.id : "00";
    
    let chatUsage = {};
    try {
        chatUsage = JSON.parse(localStorage.getItem("nectar_bot_chat_usage") || "{}");
    } catch(e) {}

    const preguntasHechas = chatUsage[moduloId] || 0;
    const preguntasRestantes = Math.max(0, 5 - preguntasHechas);

    const countEl = document.getElementById("chat-questions-left");
    const warningEl = document.getElementById("chat-limit-warning");
    const inputText = document.getElementById("chat-input-text");
    const btnEnviar = document.getElementById("btn-chat-enviar");

    if (countEl) countEl.textContent = preguntasRestantes;

    if (preguntasRestantes <= 0) {
        if (warningEl) {
            warningEl.classList.add("limit-reached");
            warningEl.innerHTML = `<i class="bx bx-error-circle"></i> Has alcanzado el límite de 5 reflexiones conceptuales para este módulo.`;
        }
        if (inputText) {
            inputText.disabled = true;
            inputText.placeholder = "Límite de reflexiones alcanzado en este módulo.";
        }
        if (btnEnviar) btnEnviar.disabled = true;
    } else {
        if (warningEl) {
            warningEl.classList.remove("limit-reached");
            warningEl.innerHTML = `<i class="bx bx-info-circle"></i> Reflexiones restantes en este módulo: <strong id="chat-questions-left">${preguntasRestantes}</strong>/5`;
        }
        if (inputText) {
            inputText.disabled = false;
            inputText.placeholder = "Escribe tu duda conceptual aquí...";
        }
        if (btnEnviar) btnEnviar.disabled = false;
    }
}

function reiniciarChatParaModuloActivo() {
    const container = document.getElementById("chat-conversation");
    if (!container) return;

    container.innerHTML = "";
    
    const bienvenida = moduloActivo && moduloActivo.id === "00" 
        ? "Saludos, buscador del código puro. Soy Nectar Bot, tu guía espiritual en este curso. ¿Qué concepto de este módulo deseas contemplar hoy?"
        : `Saludos. He adaptado mi conciencia al <b>${moduloActivo.title}</b>. ¿Qué duda conceptual o técnica de este sendero deseas contemplar hoy?`;

    agregarMensajeChat("bot", bienvenida);
}

function agregarMensajeChat(sender, text) {
    const container = document.getElementById("chat-conversation");
    const msgId = "chat-msg-" + Date.now() + "-" + Math.round(Math.random() * 10000);

    const div = document.createElement("div");
    div.className = `chat-message ${sender}`;
    div.id = msgId;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = text;

    div.appendChild(bubble);
    container.appendChild(div);
    return msgId;
}

function generarRespuestaChatZen(userText) {
    const modId = moduloActivo ? moduloActivo.id : "00";
    const txt = userText.toLowerCase();

    if (txt.includes("hola") || txt.includes("saludos") || txt.includes("buenas") || txt.includes("buen")) {
        return "Saludos, buscador del código armonioso. Que la paz reine en tu compilación. ¿Qué concepto de este módulo deseas contemplar hoy?";
    }
    if (txt.includes("gracias") || txt.includes("entendido") || txt.includes("perfecto") || txt.includes("gracia")) {
        return "El conocimiento no se posee, se transita. Que tu código fluya libre de fallos. ¿Hay algo más que tu mente técnica busque aclarar en este módulo?";
    }

    switch(modId) {
        case "01": // Python Avanzado
            if (txt.includes("mutable") || txt.includes("inmutable") || txt.includes("referencia") || txt.includes("valor")) {
                return `🧘 <b>Paso por Asignación de Objeto (Mutability):</b><br><br>
<b>El Porqué:</b> En Python no existe el paso por valor puro ni por referencia pura. Python usa <i>pass-by-assignment</i>. Al pasar un argumento a una función, se copia la referencia al objeto en memoria.<br>
• Si el objeto es <b>mutable</b> (list, dict, set), cualquier cambio en su interior dentro de la función afectará al objeto original.<br>
• Si es <b>inmutable</b> (int, str, tuple, frozenset), reasignarlo dentro de la función simplemente hace que la variable local apunte a un nuevo objeto, dejando el original intacto.<br><br>
<b>El Cómo (Evitando el anti-patrón de argumentos por defecto mutables):</b>
<pre class="language-python"><code class="language-python"># INCORRECTO: la lista se evalúa una sola vez en la definición
def agregar_auto_incorrecto(auto, catalogo=[]):
    catalogo.append(auto)
    return catalogo

# CORRECTO (Zen): usamos None como centinela inmutable
def agregar_auto_seguro(auto, catalogo=None):
    if catalogo is None:
        catalogo = []
    catalogo.append(auto)
    return catalogo</code></pre>`;
            }
            if (txt.includes("decorador") || txt.includes("wraps") || txt.includes("wrapper")) {
                return `🎭 <b>El Velo del Decorador y functools.wraps:</b><br><br>
<b>El Porqué:</b> Un decorador es una función de orden superior que envuelve a otra para extender su comportamiento. Sin embargo, por defecto, la función resultante (el wrapper) reemplaza los metadatos de la función original (como su nombre <code>__name__</code> y docstring <code>__doc__</code>). Esto rompe la depuración, el análisis estático y las pruebas automatizadas. El uso de <code>@wraps</code> copia de vuelta estos metadatos esenciales.<br><br>
<b>El Cómo:</b>
<pre class="language-python"><code class="language-python">from functools import wraps

def registrar_llamada(func):
    @wraps(func)  # Copia el nombre y docstring original
    def wrapper(*args, **kwargs):
        print(f"Ejecutando: {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@registrar_llamada
def limitar_llamadas():
    """Docstring original del reto."""
    pass

print(limitar_llamadas.__name__)  # Devuelve 'limitar_llamadas' y no 'wrapper'
print(limitar_llamadas.__doc__)   # Conserva el docstring original</code></pre>`;
            }
            return "🐍 <b>El sendero de Python Avanzado:</b> Siente la sutil diferencia entre lo que cambia y lo que permanece eterno en memoria. Contempla el ámbito LEGB (Local, Enclosing, Global, Built-in) como círculos concéntricos en el agua. ¿Qué concepto de este módulo desafía la paz de tu arquitectura?";

        case "02": // Concurrencia
            if (txt.includes("gil") || txt.includes("lock") || txt.includes("global interpreter")) {
                return `🔒 <b>El Guardián del Intérprete (GIL):</b><br><br>
<b>El Porqué:</b> El Global Interpreter Lock es un mutex en CPython que previene que múltiples hilos nativos ejecuten bytecode de Python al mismo tiempo. Existe para proteger la gestión de memoria no segura para hilos de CPython (basada en conteo de referencias).<br>
• Para tareas <b>I/O-Bound</b> (esperas de red o disco), el GIL se libera cooperativamente, por lo que <code>asyncio</code> o <code>threading</code> son altamente eficientes.<br>
• Para tareas <b>CPU-Bound</b> (procesamiento matemático pesado), los hilos competirían por el GIL desperdiciando recursos. Debemos usar <code>multiprocessing</code> para evadir el GIL instanciando intérpretes independientes en múltiples núcleos de CPU.<br><br>
<b>El Cómo:</b>
<pre class="language-python"><code class="language-python"># I/O Bound asíncrono
import asyncio

async def realizar_peticion():
    await asyncio.sleep(1) # Libera el control para que otras hilos/tareas corran
    return "API response"

# CPU Bound en paralelo (evadiendo el GIL)
from multiprocessing import Process

def computar_inventario():
    # Procesamiento pesado que corre en su propio núcleo e intérprete
    pass

if __name__ == "__main__":
    p = Process(target=computar_inventario)
    p.start()</code></pre>`;
            }
            if (txt.includes("generador") || txt.includes("lazy") || txt.includes("evaluacion perezosa")) {
                return `🌱 <b>Generadores y Lazy Evaluation (Evaluación Perezosa):</b><br><br>
<b>El Porqué:</b> Cargar un inventario masivo en una lista convencional <code>[auto for auto in data]</code> asigna memoria RAM para todos los objetos simultáneamente ($O(N)$ en espacio). Si el archivo o base de datos es de varios gigabytes, el servidor colapsará. Las expresiones generadoras <code>(auto for auto in data)</code> y el uso de <code>yield</code> evalúan un elemento a la vez bajo demanda, logrando un uso de memoria constante de $O(1)$.<br><br>
<b>El Cómo:</b>
<pre class="language-python"><code class="language-python"># Ineficiente (Carga todo en RAM)
def leer_catalogo_lista(autos):
    return [procesar(a) for a in autos]

# Eficiente y Zen (O(1) RAM)
def leer_catalogo_generador(autos):
    for a in autos:
        yield procesar(a) # Genera bajo demanda del consumidor

# Se consume paso a paso usando next() o un loop 'for'
for auto in leer_catalogo_generador(autos_db):
    print(auto)  # Solo existe un auto a la vez en memoria</code></pre>`;
            }
            return "⚡ <b>La danza del tiempo (Concurrencia):</b> El tiempo pasa de forma distinta para las CPU y la red. ¿Tu código está bloqueado esperando la respuesta de un servidor externo, o está consumido por operaciones matemáticas pesadas? Escucha el latido de tu hardware.";

        case "10": // TypeScript
            if (txt.includes("any") || txt.includes("unknown")) {
                return `🌌 <b>unknown vs any en Payload Seguro:</b><br><br>
<b>El Porqué:</b> Usar <code>any</code> apaga el compilador e introduce potenciales fallos en tiempo de ejecución. <code>unknown</code> es el tipo seguro para datos externos cuyo tipo es incierto (ej. respuestas de API). A diferencia de <code>any</code>, el compilador de TypeScript te impedirá interactuar con un objeto de tipo <code>unknown</code> hasta que verifiques y demuestres su estructura mediante un Type Guard o validación de runtime (como Zod).<br><br>
<b>El Cómo (Type Guard en TypeScript):</b>
<pre class="language-typescript"><code class="language-typescript">interface Auto {
    marca: string;
    anio: number;
}

// Type Guard para verificar el payload
function esAuto(payload: unknown): payload is Auto {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "marca" in payload &&
        "anio" in payload
    );
}

function procesarRespuesta(data: unknown) {
    if (esAuto(data)) {
        console.log(data.marca); // Seguro: TS sabe que es de tipo Auto
    } else {
        console.error("Payload desconocido");
    }
}</code></pre>`;
            }
            if (txt.includes("generic") || txt.includes("generico")) {
                return `🧩 <b>El Poder de los Genéricos (Generics):</b><br><br>
<b>El Porqué:</b> Los genéricos actúan como variables de tipo. Permiten crear funciones, clases o interfaces altamente reutilizables que funcionan con múltiples tipos sin perder el tipado seguro (a diferencia de usar <code>any</code>). Permiten al cliente definir la forma del dato al momento de invocar el código.<br><br>
<b>El Cómo:</b>
<pre class="language-typescript"><code class="language-typescript">// Una interfaz genérica para respuestas de API
interface ApiResponse<T> {
    status: number;
    data: T;
}

interface Usuario {
    nombre: string;
}

// Invocación especificando el tipo concreto
const respuesta: ApiResponse<Usuario> = {
    status: 200,
    data: { nombre: "Carlos" }
};</code></pre>`;
            }
            return "🟦 <b>El orden de TypeScript:</b> El compilador es un maestro riguroso, no un enemigo. Te advierte de los peligros en el tiempo de diseño para que tu aplicación sea eterna en el tiempo de ejecución. ¿Qué tipo o contrato te genera discordia?";

        case "11": // Elixir
            if (txt.includes("actor") || txt.includes("proceso") || txt.includes("beam")) {
                return `🐝 <b>El Modelo de Actores e Inmutabilidad en BEAM:</b><br><br>
<b>El Porqué:</b> En Elixir, a diferencia de lenguajes como Python u Node, los procesos no son hilos del sistema operativo; son gestionados por la máquina virtual BEAM, son extremadamente ligeros (millones de ellos simultáneos) y lo más importante: <b>no comparten memoria alguna</b>. La comunicación se realiza únicamente enviando mensajes asíncronos que se encolan en el buzón (<i>mailbox</i>) del actor receptor, evitando condiciones de carrera de forma natural.<br><br>
<b>El Cómo:</b>
<pre class="language-elixir"><code class="language-elixir"># Envío de mensaje asíncrono
send(destinatario_pid, {:filtrar_auto, "Toyota"})

# Recepción en el proceso receptor
receive do
  {:filtrar_auto, marca} ->
    IO.puts("Filtrando catalogo por: #{marca}")
  _otro ->
    IO.puts("Mensaje no reconocido")
end</code></pre>`;
            }
            if (txt.includes("supervisor") || txt.includes("let it crash") || txt.includes("caer")) {
                return `🍂 <b>Tolerancia a fallos: Let it crash y Supervision Trees:</b><br><br>
<b>El Porqué:</b> En lugar de atrapar defensivamente cada posible error con try-except (lo cual deja el proceso en un estado interno inconsistente), Elixir asume la filosofía <i>"Let it crash"</i>. Si ocurre un fallo imprevisto, dejamos que el proceso trabajador muera de inmediato. Un proceso supervisor jerárquico se encarga de atrapar la señal de muerte y reiniciarlo automáticamente desde un estado inicial garantizado y consistente.<br><br>
<b>El Cómo:</b>
<pre class="language-elixir"><code class="language-elixir"># Definición de un Supervisor en OTP
defmodule NectarApp.Supervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, :ok, opts)
  end

  @impl true
  def init(:ok) do
    children = [
      # Si el trabajador cae, se reinicia de forma limpia
      {NectarApp.TrabajadorCatalogo, []}
    ]

    # Estrategia :one_for_one -> Solo reinicia al proceso hijo caído
    Supervisor.init(children, strategy: :one_for_one)
  end
end</code></pre>`;
            }
            return "💧 <b>El fluir de Elixir:</b> Un GenServer maneja el estado a través de la recursión pura, recibiendo llamadas síncronas (<code>call</code>) y asíncronas (<code>cast</code>). Dibuja en tu mente la jerarquía de supervisores que protegen tu aplicación de la caída.";

        case "12": // AWS & DevOps
            if (txt.includes("docker") || txt.includes("multi-stage") || txt.includes("stage")) {
                return `📦 <b>Imágenes Ligeras con Docker Multi-Stage:</b><br><br>
<b>El Porqué:</b> En un flujo de CI/CD para producción, compilar código o instalar dependencias de desarrollo (como compilers de C, herramientas de test o linters) dentro del contenedor final genera imágenes gigantescas e introduce riesgos graves de seguridad (vulnerabilidades). Los multi-stage builds permiten separar el entorno de compilación (Stage 1) del entorno de ejecución (Stage 2), copiando sólo los artefactos puros necesarios al entorno final de producción.<br><br>
<b>El Cómo (Dockerfile optimizado):</b>
<pre class="language-dockerfile"><code class="language-dockerfile"># --- STAGE 1: Compilación ---
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# --- STAGE 2: Imagen Final Ligera de Producción ---
FROM python:3.11-slim
WORKDIR /app
# Copiamos solo los binarios compilados del Stage 1
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
# Ejecutar como usuario no-root por seguridad
USER guest
CMD ["python", "main.py"]</code></pre>`;
            }
            if (txt.includes("resiliencia") || txt.includes("circuit") || txt.includes("breaker") || txt.includes("gateway")) {
                return `🛡️ <b>Resiliencia: API Gateway & Circuit Breaker:</b><br><br>
<b>El Porqué:</b> En arquitecturas distribuidas, si un servicio del cual dependes (como el procesador de pagos) experimenta lentitud o caídas, seguir bombardeándolo de peticiones saturará la red, agotará los hilos del servidor y provocará un fallo en cascada en toda tu aplicación. El patrón <i>Circuit Breaker</i> (Fusible) intercepta las llamadas fallidas de red y, tras un umbral de errores, abre el circuito respondiendo instantáneamente con un error local o fallback sin tocar la red, permitiendo que el microservicio caído se recupere.<br><br>
<b>El Cómo (Flujo del Circuit Breaker):</b>
<pre class="language-python"><code class="language-python"># Pseudocódigo de un interceptor de llamadas
class CircuitBreaker:
    def __init__(self, fallback_func):
        self.state = "CLOSED" # Estados: CLOSED, OPEN, HALF-OPEN
        self.failure_threshold = 5
        self.failures = 0

    def call(self, request_func, *args):
        if self.state == "OPEN":
            return self.fallback_func() # Retorna de inmediato la respuesta zen

        try:
            res = request_func(*args)
            self.failures = 0
            return res
        except Exception as e:
            self.failures += 1
            if self.failures >= self.failure_threshold:
                self.state = "OPEN" # Abre el circuito ante fallas recurrentes
            raise e</code></pre>`;
            }
            return "☁️ <b>La nube inmensa (AWS & DevOps):</b> La alta disponibilidad no se logra con servidores más grandes, sino distribuyendo el peso del flujo mediante balanceadores, colas desacopladas (SQS) y replicación multizona. ¿Qué cuello de botella estás tratando de aliviar en tu arquitectura de despliegue?";

        default:
            return "🌱 <b>Bienvenido al sendero del conocimiento.</b> Cada duda es un escalón hacia la maestría. Medita en el flujo lógico, la inmutabilidad y la resiliencia del diseño de software. ¿Qué duda conceptual de este módulo deseas contemplar hoy?";
    }
}
