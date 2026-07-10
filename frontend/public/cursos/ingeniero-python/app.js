// =====================================================================
// LÓGICA DE APLICACIÓN - INTERACTIVE PYTHON COURSE DASHBOARD
// =====================================================================

// Listado estructurado de módulos del curso
const MODULOS = [
    {
        id: "00",
        badge: "MÓDULO 00",
        title: "Preparación de IA y Berribot",
        folder: "00_preparacion_ia_y_berribot"
    },
    {
        id: "01",
        badge: "MÓDULO 01",
        title: "Python Avanzado y Edge Cases",
        folder: "01_python_avanzado"
    },
    {
        id: "02",
        badge: "MÓDULO 02",
        title: "Concurrencia y Rendimiento",
        folder: "02_concurrencia_y_rendimiento"
    },
    {
        id: "03",
        badge: "MÓDULO 03",
        title: "Diseño y Arquitectura",
        folder: "03_diseno_y_arquitectura"
    },
    {
        id: "04",
        badge: "MÓDULO 04",
        title: "Robustez y Testing",
        folder: "04_robustez_y_testing"
    },
    {
        id: "05",
        badge: "MÓDULO 05",
        title: "Bases de Datos y APIs",
        folder: "05_bases_de_datos_y_apis"
    },
    {
        id: "06",
        badge: "MÓDULO 06",
        title: "Retos Algorítmicos",
        folder: "06_retos_algoritmicos"
    },
    {
        id: "07",
        badge: "MÓDULO 07",
        title: "Sistemas Distribuidos y Caché",
        folder: "07_sistemas_distribuidos"
    },
    {
        id: "08",
        badge: "MÓDULO 08",
        title: "Tips & Tricks y Metaprog.",
        folder: "08_tips_and_tricks"
    },
    {
        id: "09",
        badge: "MÓDULO 09",
        title: "Machine Learning y Bayes",
        folder: "09_machine_learning_y_bayes"
    },
    {
        id: "10",
        badge: "MÓDULO 10",
        title: "TypeScript Backend & Node",
        folder: "10_typescript_backend"
    },
    {
        id: "11",
        badge: "MÓDULO 11",
        title: "Elixir & Concurrencia OTP",
        folder: "11_elixir_concurrencia_otp"
    },
    {
        id: "12",
        badge: "MÓDULO 12",
        title: "AWS, Microservicios y DevOps",
        folder: "12_arquitectura_aws_devops"
    }
];

// Configuración de los escenarios para el simulador de IA (Berribot)
const ESCENARIOS_BOT = {
    excepciones: {
        pregunta: "¿Cómo manejas los errores en una API que conecta con una base de datos externa para asegurar que la aplicación no se caiga?",
        keywords: [
            { palabra: "try-except-finally", reg: /try.*except.*finally/i },
            { palabra: "específica", reg: /especifica|específico/i },
            { palabra: "ConnectionError", reg: /connectionerror|operationalerror/i },
            { palabra: "exponential backoff", reg: /exponential backoff|retraso exponencial/i },
            { palabra: "finally", reg: /finally/i },
            { palabra: "context managers", reg: /context manager|administrador.*contexto|with/i }
        ],
        recomendacion: "Intenta mencionar bloques específicos try-except-finally, capturar excepciones concretas (ConnectionError) y políticas de reintentos como exponential backoff."
    },
    decoradores: {
        pregunta: "¿Qué es un decorador en Python y proporciona un caso de uso real en una aplicación web?",
        keywords: [
            { palabra: "función de orden superior", reg: /orden superior|higher order/i },
            { palabra: "modificar comportamiento", reg: /modificar.*comportamiento|extender.*comportamiento/i },
            { palabra: "autenticación / JWT", reg: /autenticacion|jwt|token/i },
            { palabra: "logging / auditoría", reg: /logging|auditoria|registro/i },
            { palabra: "functools.wraps", reg: /functools\.wraps|@wraps/i }
        ],
        recomendacion: "Describe el decorador como una función de orden superior y menciona casos como JWT, logging, y el uso indispensable de @wraps."
    },
    entornos: {
        pregunta: "¿Cómo garantizas que tu código de Python sea perfectamente replicable en cualquier entorno de servidor o la nube?",
        keywords: [
            { palabra: "entorno virtual / venv", reg: /entorno virtual|venv|poetry|pipenv/i },
            { palabra: "requirements.txt", reg: /requirements\.txt|pyproject\.toml/i },
            { palabra: "Docker / Dockerfile", reg: /docker|dockerfile/i },
            { palabra: "python:3.11-slim", reg: /slim|alpine|imagen.*ligera/i },
            { palabra: "usuario no-root", reg: /no-root|no root|seguridad/i }
        ],
        recomendacion: "Habla sobre venv/poetry, empaquetar con Docker usando imágenes ligeras (slim) y ejecutar con un usuario no-root por seguridad."
    },
    typescript: {
        pregunta: "¿Cómo diseñas un tipado seguro y robusto en TypeScript para manejar payloads de APIs de terceros con estructuras desconocidas?",
        keywords: [
            { palabra: "unknown", reg: /unknown/i },
            { palabra: "Type Guards", reg: /type guard|isUserPayload|is[A-Z]/i },
            { palabra: "Discriminated Unions", reg: /discriminated union|union.*discriminada/i },
            { palabra: "Zod / runtime validation", reg: /zod|runtime|class-validator/i },
            { palabra: "Generics", reg: /generic|genérico/i }
        ],
        recomendacion: "Explica el uso de 'unknown' en lugar de 'any', la creación de Type Guards de validación en tiempo de ejecución (Zod) y el uso de uniones discriminadas para estructurar flujos."
    },
    elixir: {
        pregunta: "¿Cómo manejas la concurrencia y la tolerancia a fallos extrema en una aplicación utilizando Elixir y el estándar OTP?",
        keywords: [
            { palabra: "Modelo de Actores", reg: /actor|actores/i },
            { palabra: "procesos BEAM", reg: /beam|proceso.*ligero/i },
            { palabra: "GenServer", reg: /genserver/i },
            { palabra: "Supervisor / Let it crash", reg: /supervisor|let it crash|deja.*caer/i },
            { palabra: "One_For_One", reg: /one_for_one|one for one/i }
        ],
        recomendacion: "Menciona el Modelo de Actores y la inmutabilidad, describe los GenServers y la jerarquía de Supervisors usando estrategias como :one_for_one bajo la filosofía 'Let it crash'."
    },
    aws: {
        pregunta: "¿Cómo diseñarías una arquitectura de microservicios de alta disponibilidad y tolerante a fallos utilizando AWS?",
        keywords: [
            { palabra: "Event-Driven Architecture", reg: /event-driven|event driven|arquitectura.*evento/i },
            { palabra: "SQS / SNS / colas", reg: /sqs|sns|cola|kafka/i },
            { palabra: "Patrón Sagas", reg: /saga|sagas|compensacion/i },
            { palabra: "ECS / Lambda / serverless", reg: /ecs|fargate|lambda|serverless/i },
            { palabra: "RDS Multi-AZ", reg: /rds|multi-az|multi az/i },
            { palabra: "Idempotencia", reg: /idempotencia|idempotente/i }
        ],
        recomendacion: "Describe microservicios Event-Driven con colas SQS/SNS para desacoplar procesos, el uso de transacciones con Patrón Sagas (compensaciones), RDS Multi-AZ y la importancia de diseñar endpoints idempotentes."
    }
};

// =====================================================================
// ESTADO DE LA APLICACIÓN
// =====================================================================
let moduloActivo = MODULOS[1]; // Módulo 01 por defecto
let progresoModulos = JSON.parse(localStorage.getItem("progreso_modulos_python")) || {};

// =====================================================================
// INICIALIZACIÓN
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarSidebar();
    cargarModulo(moduloActivo.id);
    configurarEventosPestañas();
    configurarEventosBot();
    actualizarProgresoGeneral();
    
    // Botón de marcar módulo como completado
    const btnCompletar = document.getElementById("btn-completar-modulo");
    btnCompletar.addEventListener("click", toggleModuloCompletado);
});

// =====================================================================
// FUNCIONES DE CONTROLADORES Y LOGICA DE RENDER
// =====================================================================

function inicializarSidebar() {
    const listContainer = document.getElementById("modules-list");
    listContainer.innerHTML = "";
    
    MODULOS.forEach(mod => {
        const isCompleted = progresoModulos[mod.id] ? "completed" : "";
        const checkIcon = isCompleted ? "bx-check-circle" : "bx-circle";
        
        const li = document.createElement("li");
        li.className = `module-item ${mod.id === moduloActivo.id ? "active" : ""}`;
        li.setAttribute("data-mod-id", mod.id);
        
        li.innerHTML = `
            <div class="module-item-left">
                <span class="mod-id">${mod.badge}</span>
                <span class="mod-title">${mod.title}</span>
            </div>
            <i class="bx ${checkIcon} module-status-check ${isCompleted}"></i>
        `;
        
        // Clic en el item para cargar el módulo
        li.addEventListener("click", (e) => {
            // Si hace clic en el icono del check, no cambiar de módulo
            if (e.target.classList.contains("module-status-check")) {
                toggleModuloCompletadoPorId(mod.id);
                return;
            }
            document.querySelectorAll(".module-item").forEach(item => item.classList.remove("active"));
            li.classList.add("active");
            cargarModulo(mod.id);
        });
        
        listContainer.appendChild(li);
    });
}

async function cargarModulo(id) {
    const modulo = MODULOS.find(m => m.id === id);
    if (!modulo) return;
    
    moduloActivo = modulo;
    
    // Actualizar encabezados
    document.getElementById("current-module-id").textContent = modulo.badge;
    document.getElementById("current-module-title").textContent = modulo.title;
    
    // Actualizar estado del botón Completar
    const btnCompletar = document.getElementById("btn-completar-modulo");
    if (progresoModulos[modulo.id]) {
        btnCompletar.classList.remove("btn-secondary");
        btnCompletar.classList.add("btn-primary");
        btnCompletar.innerHTML = `<i class="bx bxs-check-circle"></i> Completado`;
    } else {
        btnCompletar.classList.remove("btn-primary");
        btnCompletar.classList.add("btn-secondary");
        btnCompletar.innerHTML = `<i class="bx bx-check-circle"></i> Completar`;
    }
    
    // Limpiar contenedores con animación de carga
    document.getElementById("teoria-container").innerHTML = "<p>Cargando teoría del módulo...</p>";
    document.getElementById("code-ejemplos").textContent = "# Cargando ejemplos de código...";
    document.getElementById("code-ejercicios").textContent = "# Cargando ejercicios y retos...";
    
    // Determinar extensiones y nombres de archivos dinámicamente
    let extEjemplos = "py";
    let extEjercicios = "py";
    let langEjemplos = "python";
    let langEjercicios = "python";

    if (modulo.id === "10") {
        extEjemplos = "ts";
        extEjercicios = "ts";
        langEjemplos = "typescript";
        langEjercicios = "typescript";
    } else if (modulo.id === "11") {
        extEjemplos = "exs";
        extEjercicios = "exs";
        langEjemplos = "elixir";
        langEjercicios = "elixir";
    } else if (modulo.id === "12") {
        extEjemplos = "tf";
        extEjercicios = "yml";
        langEjemplos = "hcl";
        langEjercicios = "yaml";
    }

    const fileEjemplos = `ejemplos.${extEjemplos}`;
    const fileEjercicios = modulo.id === "12" ? `ci_cd_example.${extEjercicios}` : `ejercicios.${extEjercicios}`;

    const pathTeoria = `../${modulo.folder}/README.md`;
    const pathEjemplos = `../${modulo.folder}/${fileEjemplos}`;
    const pathEjercicios = `../${modulo.folder}/${fileEjercicios}`;

    // Actualizar cabecera visual de las pestañas
    const tabEjemplosHeader = document.querySelector("#tab-ejemplos .code-header span");
    const tabEjerciciosHeader = document.querySelector("#tab-ejercicios .code-header span");
    if (tabEjemplosHeader) tabEjemplosHeader.textContent = fileEjemplos;
    if (tabEjerciciosHeader) tabEjerciciosHeader.textContent = fileEjercicios;

    // 1. Cargar README.md (Teoría)
    try {
        let mdText = "";
        try {
            const res = await fetch(pathTeoria);
            if (!res.ok) throw new Error("Teoría no disponible vía HTTP.");
            mdText = await res.text();
        } catch (fetchErr) {
            // Fallback a Base de Datos Offline
            if (typeof COURSE_DATA !== 'undefined' && COURSE_DATA[modulo.id] && COURSE_DATA[modulo.id].teoria) {
                mdText = COURSE_DATA[modulo.id].teoria;
            } else {
                throw new Error("Teoría no disponible offline ni vía HTTP. Abre el curso mediante un servidor local (ej. python -m http.server 8000).");
            }
        }
        // Renderizar usando Marked.js
        document.getElementById("teoria-container").innerHTML = marked.parse(mdText);
    } catch (err) {
        document.getElementById("teoria-container").innerHTML = `<p class="error-text">${err.message}</p>`;
    }
    
    // 2. Cargar ejemplos (si aplica)
    try {
        let codeText = "";
        try {
            const res = await fetch(pathEjemplos);
            if (!res.ok) throw new Error("Ejemplos no disponibles vía HTTP.");
            codeText = await res.text();
        } catch (fetchErr) {
            // Fallback a Base de Datos Offline
            if (typeof COURSE_DATA !== 'undefined' && COURSE_DATA[modulo.id] && COURSE_DATA[modulo.id].ejemplos) {
                codeText = COURSE_DATA[modulo.id].ejemplos;
            } else {
                throw new Error("# Ejemplos de código no disponibles offline.");
            }
        }
        const codeEl = document.getElementById("code-ejemplos");
        codeEl.textContent = codeText;
        codeEl.className = `language-${langEjemplos}`;
        Prism.highlightElement(codeEl);
    } catch (err) {
        document.getElementById("code-ejemplos").textContent = err.message;
    }
    
    // 3. Cargar ejercicios (si aplica)
    try {
        let codeText = "";
        try {
            const res = await fetch(pathEjercicios);
            if (!res.ok) throw new Error("Ejercicios no disponibles vía HTTP.");
            codeText = await res.text();
        } catch (fetchErr) {
            // Fallback a Base de Datos Offline
            if (typeof COURSE_DATA !== 'undefined' && COURSE_DATA[modulo.id] && COURSE_DATA[modulo.id].ejercicios) {
                codeText = COURSE_DATA[modulo.id].ejercicios;
            } else {
                throw new Error("# Ejercicios no disponibles offline para este módulo.");
            }
        }
        const codeEl = document.getElementById("code-ejercicios");
        codeEl.textContent = codeText;
        codeEl.className = `language-${langEjercicios}`;
        Prism.highlightElement(codeEl);
    } catch (err) {
        document.getElementById("code-ejercicios").textContent = err.message;
    }
}

function toggleModuloCompletado() {
    const id = moduloActivo.id;
    toggleModuloCompletadoPorId(id);
}

// Control de completados
function toggleModuloCompletadoPorId(id) {
    if (progresoModulos[id]) {
        delete progresoModulos[id];
    } else {
        progresoModulos[id] = true;
    }
    
    localStorage.setItem("progreso_modulos_python", JSON.stringify(progresoModulos));
    inicializarSidebar();
    actualizarProgresoGeneral();
    
    if (moduloActivo.id === id) {
        cargarModulo(id);
    }
}

function actualizarProgresoGeneral() {
    const totalModulos = MODULOS.length;
    const completados = Object.keys(progresoModulos).length;
    const porcentaje = Math.round((completados / totalModulos) * 100);
    
    document.getElementById("general-progress-pct").textContent = `${porcentaje}%`;
    document.getElementById("general-progress-fill").style.width = `${porcentaje}%`;
}

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
        });
    });
    
    const copyBtns = document.querySelectorAll(".btn-copy");
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const textToCopy = document.getElementById(targetId).textContent;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                btn.innerHTML = `<i class="bx bx-check"></i> Copiado`;
                setTimeout(() => {
                    btn.innerHTML = `<i class="bx bx-copy"></i> Copiar`;
                }, 2000);
            });
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
    
    btnAbrir.addEventListener("click", () => drawer.classList.add("open"));
    btnCerrar.addEventListener("click", () => drawer.classList.remove("open"));
    
    selectEscenario.addEventListener("change", () => {
        const escenario = ESCENARIOS_BOT[selectEscenario.value];
        document.getElementById("pregunta-texto").textContent = escenario.pregunta;
        document.getElementById("input-respuesta").value = "";
        document.getElementById("resultados-ia").style.display = "none";
    });
    
    btnEvaluar.addEventListener("click", evaluarRespuestaIA);
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
        recText.textContent = "¡Excelente! Tu respuesta cubre todas las directivas del bot e implementa conceptos avanzados de producción. Estás listo.";
    } else if (scorePct >= 60) {
        recText.textContent = "Buen trabajo, pero te faltan palabras clave importantes. " + escenario.recomendacion;
    } else {
        recText.textContent = "Respuesta incompleta o poco estructurada. " + escenario.recomendacion;
    }
    
    document.getElementById("resultados-ia").style.display = "block";
}
