// =====================================================================
// LÓGICA DE APLICACIÓN - INTERACTIVE PYTHON COURSE DASHBOARD
// =====================================================================

// ── Constantes de configuración ───────────────────────────────────────
const API_BASE = '/api';
const COURSE_SLUG = 'ingeniero-python';

// ── Listado estructurado de módulos del curso ─────────────────────────
const MODULOS = [
    { id: "00", badge: "MÓDULO 00", title: "Preparación de IA y Berribot",    folder: "00_preparacion_ia_y_berribot" },
    { id: "01", badge: "MÓDULO 01", title: "Python Avanzado y Edge Cases",     folder: "01_python_avanzado" },
    { id: "02", badge: "MÓDULO 02", title: "Concurrencia y Rendimiento",        folder: "02_concurrencia_y_rendimiento" },
    { id: "03", badge: "MÓDULO 03", title: "Diseño y Arquitectura",             folder: "03_diseno_y_arquitectura" },
    { id: "04", badge: "MÓDULO 04", title: "Robustez y Testing",               folder: "04_robustez_y_testing" },
    { id: "05", badge: "MÓDULO 05", title: "Bases de Datos y APIs",            folder: "05_bases_de_datos_y_apis" },
    { id: "06", badge: "MÓDULO 06", title: "Retos Algorítmicos",               folder: "06_retos_algoritmicos" },
    { id: "07", badge: "MÓDULO 07", title: "Sistemas Distribuidos y Caché",    folder: "07_sistemas_distribuidos" },
    { id: "08", badge: "MÓDULO 08", title: "Tips & Tricks y Metaprog.",        folder: "08_tips_and_tricks" },
    { id: "09", badge: "MÓDULO 09", title: "Machine Learning y Bayes",         folder: "09_machine_learning_y_bayes" },
    { id: "10", badge: "MÓDULO 10", title: "TypeScript Backend & Node",        folder: "10_typescript_backend" },
    { id: "11", badge: "MÓDULO 11", title: "Elixir & Concurrencia OTP",        folder: "11_elixir_concurrencia_otp" },
    { id: "12", badge: "MÓDULO 12", title: "AWS, Microservicios y DevOps",     folder: "12_arquitectura_aws_devops" },
];

// ── Escenarios Berribot IA ─────────────────────────────────────────────
const ESCENARIOS_BOT = {
    excepciones: {
        pregunta: "¿Cómo manejas los errores en una API que conecta con una base de datos externa para asegurar que la aplicación no se caiga?",
        keywords: [
            { palabra: "try-except-finally",   reg: /try.*except.*finally/i },
            { palabra: "específica",            reg: /especifica|específico/i },
            { palabra: "ConnectionError",       reg: /connectionerror|operationalerror/i },
            { palabra: "exponential backoff",   reg: /exponential backoff|retraso exponencial/i },
            { palabra: "finally",              reg: /finally/i },
            { palabra: "context managers",     reg: /context manager|administrador.*contexto|with/i },
        ],
        recomendacion: "Intenta mencionar bloques específicos try-except-finally, capturar excepciones concretas (ConnectionError) y políticas de reintentos como exponential backoff.",
    },
    decoradores: {
        pregunta: "¿Qué es un decorador en Python y proporciona un caso de uso real en una aplicación web?",
        keywords: [
            { palabra: "función de orden superior", reg: /orden superior|higher order/i },
            { palabra: "modificar comportamiento",  reg: /modificar.*comportamiento|extender.*comportamiento/i },
            { palabra: "autenticación / JWT",        reg: /autenticacion|jwt|token/i },
            { palabra: "logging / auditoría",        reg: /logging|auditoria|registro/i },
            { palabra: "functools.wraps",            reg: /functools\.wraps|@wraps/i },
        ],
        recomendacion: "Describe el decorador como una función de orden superior y menciona casos como JWT, logging, y el uso indispensable de @wraps.",
    },
    entornos: {
        pregunta: "¿Cómo garantizas que tu código de Python sea perfectamente replicable en cualquier entorno de servidor o la nube?",
        keywords: [
            { palabra: "entorno virtual / venv",  reg: /entorno virtual|venv|poetry|pipenv/i },
            { palabra: "requirements.txt",         reg: /requirements\.txt|pyproject\.toml/i },
            { palabra: "Docker / Dockerfile",      reg: /docker|dockerfile/i },
            { palabra: "python:3.11-slim",         reg: /slim|alpine|imagen.*ligera/i },
            { palabra: "usuario no-root",          reg: /no-root|no root|seguridad/i },
        ],
        recomendacion: "Habla sobre venv/poetry, empaquetar con Docker usando imágenes ligeras (slim) y ejecutar con un usuario no-root por seguridad.",
    },
    typescript: {
        pregunta: "¿Cómo diseñas un tipado seguro y robusto en TypeScript para manejar payloads de APIs de terceros con estructuras desconocidas?",
        keywords: [
            { palabra: "unknown",               reg: /unknown/i },
            { palabra: "Type Guards",           reg: /type guard|isUserPayload|is[A-Z]/i },
            { palabra: "Discriminated Unions",  reg: /discriminated union|union.*discriminada/i },
            { palabra: "Zod / runtime validation", reg: /zod|runtime|class-validator/i },
            { palabra: "Generics",              reg: /generic|genérico/i },
        ],
        recomendacion: "Explica el uso de 'unknown' en lugar de 'any', la creación de Type Guards de validación en tiempo de ejecución (Zod) y el uso de uniones discriminadas.",
    },
    elixir: {
        pregunta: "¿Cómo manejas la concurrencia y la tolerancia a fallos extrema en una aplicación utilizando Elixir y el estándar OTP?",
        keywords: [
            { palabra: "Modelo de Actores",          reg: /actor|actores/i },
            { palabra: "procesos BEAM",              reg: /beam|proceso.*ligero/i },
            { palabra: "GenServer",                  reg: /genserver/i },
            { palabra: "Supervisor / Let it crash",  reg: /supervisor|let it crash|deja.*caer/i },
            { palabra: "One_For_One",                reg: /one_for_one|one for one/i },
        ],
        recomendacion: "Menciona el Modelo de Actores, los GenServers y la jerarquía de Supervisors usando estrategias como :one_for_one bajo la filosofía 'Let it crash'.",
    },
    aws: {
        pregunta: "¿Cómo diseñarías una arquitectura de microservicios de alta disponibilidad y tolerante a fallos utilizando AWS?",
        keywords: [
            { palabra: "Event-Driven Architecture", reg: /event-driven|event driven|arquitectura.*evento/i },
            { palabra: "SQS / SNS / colas",          reg: /sqs|sns|cola|kafka/i },
            { palabra: "Patrón Sagas",               reg: /saga|sagas|compensacion/i },
            { palabra: "ECS / Lambda / serverless",  reg: /ecs|fargate|lambda|serverless/i },
            { palabra: "RDS Multi-AZ",               reg: /rds|multi-az|multi az/i },
            { palabra: "Idempotencia",               reg: /idempotencia|idempotente/i },
        ],
        recomendacion: "Describe microservicios Event-Driven con SQS/SNS, transacciones con Patrón Sagas, RDS Multi-AZ y endpoints idempotentes.",
    },
};

// =====================================================================
// ESTADO GLOBAL
// =====================================================================
let moduloActivo  = MODULOS[1];
let progresoModulos = {};
let authToken     = null;
let cmEditor      = null;   // Instancia activa de CodeMirror

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
    python:     "python",
    typescript: "javascript",
    elixir:     "text/plain",   // No hay modo Elixir en CM5 CDN
    yaml:       "yaml",
    hcl:        "text/plain",
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
        return;
    }

    cmEditor = CodeMirror(container, {
        value:          codigoBase || "",
        mode:           mode,
        theme:          "dracula",
        lineNumbers:    true,
        tabSize:        4,
        indentWithTabs: false,
        autoCloseBrackets: true,
        matchBrackets:  true,
        lineWrapping:   false,
        extraKeys: {
            "Tab": cm => cm.execCommand("insertSoftTab"),
        },
    });

    // Altura responsive
    cmEditor.setSize("100%", "380px");
}

// =====================================================================
// CARGA DE MÓDULO
// =====================================================================
async function cargarModulo(id) {
    const modulo = MODULOS.find(m => m.id === id);
    if (!modulo) return;
    moduloActivo = modulo;

    // Actualizar encabezados
    document.getElementById("current-module-id").textContent    = modulo.badge;
    document.getElementById("current-module-title").textContent = modulo.title;

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

    const fileEjemplos   = `ejemplos.${extEjemplos}`;
    const fileEjercicios = modulo.id === "12" ? `ci_cd_example.${extEjercicios}` : `ejercicios.${extEjercicios}`;

    // Actualizar labels de cabecera
    const ejEl = document.getElementById("ejemplos-filename");
    const ezEl = document.getElementById("ejercicios-filename");
    if (ejEl) ejEl.textContent = fileEjemplos;
    if (ezEl) ezEl.textContent = fileEjercicios;

    const pathTeoria     = `../${modulo.folder}/README.md`;
    const pathEjemplos   = `../${modulo.folder}/${fileEjemplos}`;
    const pathEjercicios = `../${modulo.folder}/${fileEjercicios}`;

    // ── 1. Cargar Teoría ──────────────────────────────────────────────
    document.getElementById("teoria-container").innerHTML = "<p>Cargando teoría...</p>";
    try {
        let mdText = await _fetchWithFallback(pathTeoria, COURSE_DATA[modulo.id]?.teoria);
        const container = document.getElementById("teoria-container");
        container.innerHTML = marked.parse(mdText);
        Prism.highlightAllUnder(container);
    } catch (err) {
        document.getElementById("teoria-container").innerHTML = `<p class="error-text">${err.message}</p>`;
    }

    // ── 2. Cargar Ejemplos (Prism – read-only) ────────────────────────
    try {
        const codeText = await _fetchWithFallback(pathEjemplos, COURSE_DATA[modulo.id]?.ejemplos);
        const codeEl   = document.getElementById("code-ejemplos");
        codeEl.textContent = codeText;
        codeEl.className   = `language-${langEjemplos}`;
        Prism.highlightElement(codeEl);
    } catch (err) {
        document.getElementById("code-ejemplos").textContent = err.message;
    }

    // ── 3. Cargar Ejercicios en el Editor CodeMirror ──────────────────
    let codigoBase = "";
    try {
        codigoBase = await _fetchWithFallback(pathEjercicios, COURSE_DATA[modulo.id]?.ejercicios);
    } catch {
        codigoBase = COURSE_DATA[modulo.id]?.ejercicios || `# Ejercicios del Módulo ${modulo.id}`;
    }

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
            module_id:   moduloActivo.id,
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
    const found    = keywords.filter(kw => new RegExp(kw, "i").test(code));
    const score    = keywords.length > 0 ? Math.round((found.length / keywords.length) * 100) : 50;
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
    const score  = result.score ?? 0;
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
    const stdoutPre     = document.getElementById("resultado-stdout");
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
        const checkIcon   = isCompleted ? "bx-check-circle" : "bx-circle";

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
    const total      = MODULOS.length;
    const completados = Object.keys(progresoModulos).length;
    const pct        = Math.round((completados / total) * 100);
    document.getElementById("general-progress-pct").textContent   = `${pct}%`;
    document.getElementById("general-progress-fill").style.width  = `${pct}%`;
}

// =====================================================================
// PESTAÑAS
// =====================================================================
function configurarEventosPestañas() {
    const tabButtons  = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b  => b.classList.remove("active"));
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
            const text     = document.getElementById(targetId)?.textContent || "";
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
    const drawer         = document.getElementById("bot-drawer");
    const btnAbrir       = document.getElementById("btn-abrir-bot");
    const btnCerrar      = document.getElementById("btn-cerrar-bot");
    const selectEscenario = document.getElementById("select-escenario");
    const btnEvaluar     = document.getElementById("btn-evaluar-respuesta");

    btnAbrir.addEventListener("click",  () => drawer.classList.add("open"));
    btnCerrar.addEventListener("click", () => drawer.classList.remove("open"));

    selectEscenario.addEventListener("change", () => {
        const escenario = ESCENARIOS_BOT[selectEscenario.value];
        document.getElementById("pregunta-texto").textContent = escenario.pregunta;
        document.getElementById("input-respuesta").value      = "";
        document.getElementById("resultados-ia").style.display = "none";
    });

    btnEvaluar.addEventListener("click", evaluarRespuestaIA);
}

function evaluarRespuestaIA() {
    const selectValue = document.getElementById("select-escenario").value;
    const escenario   = ESCENARIOS_BOT[selectValue];
    const respuesta   = document.getElementById("input-respuesta").value;

    if (!respuesta.trim()) {
        alert("Por favor, ingresa una respuesta técnica primero.");
        return;
    }

    const feedbackList = document.getElementById("keywords-list-feedback");
    feedbackList.innerHTML = "";
    let matchedCount = 0;

    escenario.keywords.forEach(keyword => {
        const isMatched = keyword.reg.test(respuesta);
        if (isMatched) matchedCount++;
        const li = document.createElement("li");
        li.className = isMatched ? "matched" : "";
        li.innerHTML = `<i class="bx ${isMatched ? "bx-check-double" : "bx-x"}"></i> ${keyword.palabra}`;
        feedbackList.appendChild(li);
    });

    const scorePct = Math.round((matchedCount / escenario.keywords.length) * 100);
    document.getElementById("score-pct").textContent = `${scorePct}%`;

    const recText = document.getElementById("recomendacion-texto");
    if (scorePct === 100) {
        recText.textContent = "¡Excelente! Tu respuesta cubre todas las directivas del bot. Estás listo.";
    } else if (scorePct >= 60) {
        recText.textContent = "Buen trabajo, pero te faltan palabras clave importantes. " + escenario.recomendacion;
    } else {
        recText.textContent = "Respuesta incompleta o poco estructurada. " + escenario.recomendacion;
    }

    document.getElementById("resultados-ia").style.display = "block";
}
