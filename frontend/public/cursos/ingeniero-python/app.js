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
        const codeEl = document.getElementById("code-ejemplos");
        codeEl.textContent = codeText;
        codeEl.className = `language-${langEjemplos}`;
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

function evaluarRespuestaIA() {
    const selectValue = document.getElementById("select-escenario").value;
    const escenario = ESCENARIOS_BOT[selectValue];
    const respuesta = document.getElementById("input-respuesta").value;

    if (!respuesta.trim()) {
        alert("Por favor, ingresa una respuesta técnica primero.");
        return;
    }

    const feedbackList = document.getElementById("keywords-list-feedback");
    feedbackList.innerHTML = "";
    let matchedCount = 0;

    escenario.keywords.forEach(keyword => {
        const isMatched = keyword.reg.test(respuesta);
        const li = document.createElement("li");
        if (isMatched) {
            matchedCount++;
            li.className = "matched";
            li.innerHTML = `<i class="bx bx-check-double"></i> Concepto alineado: ${keyword.palabra}`;
        } else {
            li.className = "";
            li.innerHTML = `<i class="bx bx-compass"></i> Senda oculta: ${keyword.pista}`;
        }
        feedbackList.appendChild(li);
    });

    const scorePct = Math.round((matchedCount / escenario.keywords.length) * 100);
    document.getElementById("score-pct").textContent = `${scorePct}%`;

    const recText = document.getElementById("recomendacion-texto");
    if (scorePct === 100) {
        recText.textContent = "🙏 Armonía absoluta. Tu mente técnica ha alcanzado el equilibrio perfecto.";
    } else if (scorePct >= 60) {
        recText.textContent = "🍃 Vas por buen camino. Sin embargo, aún quedan misterios por revelar. " + escenario.recomendacion;
    } else {
        recText.textContent = "🕯️ Tu respuesta necesita meditarse más. Escucha las sendas ocultas de los principios de diseño. " + escenario.recomendacion;
    }

    document.getElementById("resultados-ia").style.display = "block";

    // Persistir progreso si pasa la prueba
    if (scorePct >= 60) {
        let evalProgreso = {};
        try {
            evalProgreso = JSON.parse(localStorage.getItem("nectar_bot_eval_progress") || "{}");
        } catch(e) {}
        evalProgreso[selectValue] = scorePct;
        localStorage.setItem("nectar_bot_eval_progress", JSON.stringify(evalProgreso));
        
        // Refrescar candados e interfaces
        setTimeout(actualizarEscenariosEvaluacion, 1500);
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
        if (e.key === "Enter") {
            newBtn.click();
        }
    };

    newBtn.onclick = () => {
        const txt = inputText.value.trim();
        if (!txt) return;

        agregarMensajeChat("user", txt);
        inputText.value = "";
        container.scrollTop = container.scrollHeight;

        const typingId = agregarMensajeChat("bot", "🕯️ <i>Nectar Bot medita tu duda...</i>");
        container.scrollTop = container.scrollHeight;

        setTimeout(() => {
            const typingMsg = document.getElementById(typingId);
            if (typingMsg) typingMsg.remove();

            const respuestaZen = generarRespuestaChatZen(txt);
            agregarMensajeChat("bot", respuestaZen);
            container.scrollTop = container.scrollHeight;
        }, 1200);
    };
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
                return "🧘 <b>La ilusión de la pertenencia:</b> En Python, las variables no contienen objetos; son etiquetas (referencias) unidas a ellos. Si el objeto es <i>mutable</i> (listas, dicts), cualquier etiqueta que lo comparta puede alterar su caudal. Si es <i>inmutable</i> (tuplas, strings), cada cambio genera una nueva entidad en la memoria, dejando la original intacta. ¿Ves cómo el paso por asignación comparte la etiqueta y no el objeto mismo? Medita en esto: ¿qué ocurre cuando pasas una lista vacía como argumento por defecto en una función?";
            }
            if (txt.includes("decorador") || txt.includes("wraps") || txt.includes("wrapper")) {
                return "🎭 <b>El velo del decorador:</b> Un decorador envuelve a una función para modificar su comportamiento sin destruir su esencia original. Pero cuidado: al envolverla, puedes ocultar sus metadatos (como su nombre y docstring). Para evitar esto, recurrimos al sabio <code>functools.wraps</code>, que preserva la identidad original detrás del velo. ¿Cómo te ayuda esto a mantener la transparencia ante herramientas de inspección o tests?";
            }
            return "🐍 <b>El sendero de Python Avanzado:</b> Siente la sutil diferencia entre lo que cambia y lo que permanece eterno en memoria. Contempla el ámbito LEGB (Local, Enclosing, Global, Built-in) como círculos concéntricos en el agua. ¿Qué concepto de este módulo desafía la paz de tu arquitectura?";

        case "02": // Concurrencia
            if (txt.includes("gil") || txt.includes("lock") || txt.includes("global interpreter")) {
                return "🔒 <b>El Guardián Único (GIL):</b> El Global Interpreter Lock es un guardián celoso. Solo permite que una mente (hilo de CPU) ejecute código Python a la vez para proteger la integridad interna. Para tareas que exigen fuerza bruta (CPU-bound), un solo hilo no es suficiente; debemos clonar la mente en múltiples procesos (<code>multiprocessing</code>). Para tareas que esperan (I/O-bound), podemos usar la asincronía (<code>asyncio</code>) para que un solo hilo asista a otros mientras esperan el flujo de datos. ¿Qué tipo de bloqueo está limitando la velocidad de tu flujo actual?";
            }
            if (txt.includes("generador") || txt.includes("lazy") || txt.includes("evaluacion perezosa")) {
                return "🌱 <b>La paciencia del Generador:</b> Cargar un inventario masivo en una lista es como recolectar todas las cosechas del año y meterlas juntas en tu pequeña cabaña (RAM). El generador, mediante <code>yield</code>, te da una sola fruta a la vez cuando tienes hambre (Lazy Evaluation). Tu consumo de memoria se mantiene constante ($O(1)$) sin importar el tamaño del campo. ¿Cómo implementarías esta paciencia para procesar un CSV de varios gigabytes?";
            }
            return "⚡ <b>La danza del tiempo (Concurrencia):</b> El tiempo pasa de forma distinta para las CPU y la red. ¿Tu código está bloqueado esperando la respuesta de un servidor externo, o está consumido por operaciones matemáticas pesadas? Escucha el latido de tu hardware.";

        case "10": // TypeScript
            if (txt.includes("any") || txt.includes("unknown")) {
                return "🌌 <b>El abismo del 'any':</b> Usar <code>any</code> es rendirse ante el caos; es apagar la luz de TypeScript y caminar a oscuras. Por el contrario, <code>unknown</code> reconoce la incertidumbre de forma ordenada: te dice 'esto existe, pero no sabemos qué es aún'. Te obliga a usar un <i>Type Guard</i> para verificar su verdadera naturaleza antes de actuar. ¿Ves cómo la duda metódica de <code>unknown</code> fortalece tu arquitectura ante payloads externos?";
            }
            if (txt.includes("generic") || txt.includes("generico")) {
                return "🧩 <b>La forma universal (Generics):</b> Los tipos genéricos son moldes vacíos que cobran vida al ser llenados por el invocador. Permiten escribir lógica reutilizable sin perder la seguridad del tipado. Es la abstracción en su máxima pureza. ¿En qué componentes de tu API te beneficiaría delegar la definición de tipos al momento de la llamada?";
            }
            return "🟦 <b>El orden de TypeScript:</b> El compilador es un maestro riguroso, no un enemigo. Te advierte de los peligros en el tiempo de diseño para que tu aplicación sea eterna en el tiempo de ejecución. ¿Qué tipo o contrato te genera discordia?";

        case "11": // Elixir
            if (txt.includes("actor") || txt.includes("proceso") || txt.includes("beam")) {
                return "🐝 <b>La colmena BEAM:</b> En Elixir, los procesos son más livianos que el aire. No comparten memoria, lo que evita que el fallo de uno contamine a sus hermanos. Se comunican arrojando cartas a los buzones ajenos de forma asíncrona. Esta inmutabilidad absoluta elimina las condiciones de carrera en el estado. ¿Qué crees que sucedería si el buzón de un proceso se llena y nadie responde?";
            }
            if (txt.includes("supervisor") || txt.includes("let it crash") || txt.includes("caer")) {
                return "🍂 <b>La sabiduría del colapso (Let it crash):</b> Elixir no teme a la caída. En lugar de atrapar cada posible error defensivamente con bloques oscuros, permite que el proceso muera en paz ante lo imprevisto. Un Supervisor atento detectará su partida y lo revivirá instantáneamente en un estado inicial limpio. Es el ciclo eterno de renacimiento de OTP. ¿Qué estrategia de supervisión elegirías para procesos que dependen críticamente entre sí?";
            }
            return "💧 <b>El fluir de Elixir:</b> Un GenServer maneja el estado a través de la recursión pura, recibiendo llamadas síncronas (<code>call</code>) y asíncronas (<code>cast</code>). Dibuja en tu mente la jerarquía de supervisores que protegen tu aplicación de la caída.";

        case "12": // AWS & DevOps
            if (txt.includes("docker") || txt.includes("multi-stage") || txt.includes("stage")) {
                return "📦 <b>El capullo ligero (Multi-stage Docker):</b> Crear una imagen Docker con todas las herramientas de desarrollo es cargar con herramientas que no usarás en producción. El diseño multi-stage te permite compilar en una fase pesada y luego copiar únicamente el artefacto final a una imagen limpia y minimalista (como <code>alpine</code> o <code>slim</code>). Tu despliegue será más rápido y seguro. ¿Qué dependencias innecesarias estás arrastrando hoy en tus contenedores?";
            }
            if (txt.includes("resiliencia") || txt.includes("circuit") || txt.includes("breaker") || txt.includes("gateway")) {
                return "🛡️ <b>El fusible (Circuit Breaker):</b> Si un microservicio remoto está caído, seguir enviándole peticiones es como intentar cruzar una puerta cerrada a cabezazos: solo gastarás energía y saturarás tu sistema. El Circuit Breaker detecta los fallos repetidos y abre el circuito para responder de inmediato con un error o fallback alternativo, dando tiempo al servicio remoto para sanar. ¿Cómo mitigas el impacto al usuario final cuando una API externa deja de responder?";
            }
            return "☁️ <b>La nube inmensa (AWS & DevOps):</b> La alta disponibilidad no se logra con servidores más grandes, sino distribuyendo el peso del flujo mediante balanceadores, colas desacopladas (SQS) y replicación multizona. ¿Qué cuello de botella estás tratando de aliviar en tu arquitectura de despliegue?";

        default:
            return "🌱 <b>Bienvenido al sendero del conocimiento.</b> Cada duda es un escalón hacia la maestría. Medita en el flujo lógico, la inmutabilidad y la resiliencia del diseño de software. ¿Qué duda conceptual de este módulo deseas contemplar hoy?";
    }
}
