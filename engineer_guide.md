# Guía de Configuración y Productividad: Antigravity IDE (Python & Fullstack)

Esta guía documenta la configuración óptima, los atajos de teclado clave y los flujos de trabajo avanzados en **Antigravity IDE** para optimizar el desarrollo tanto en el Backend (Python/Django) como en el Frontend (Next.js/React/TypeScript) dentro del ecosistema de **Nectar Labs**.

---

## 1. Configuración de Entorno Profesional (`settings.json`)

Para habilitar un comportamiento automatizado y evitar errores de sintaxis comunes en código mixto, añade o actualiza las siguientes claves en la configuración global o de workspace (`.vscode/settings.json`):

```json
{
  // --- Configuración General de Edición ---
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  },
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.parameterHints.enabled": true,

  // --- Backend (Python) ---
  "[python]": {
    "editor.defaultFormatter": "ms-python.python", // Formateador estándar de la extensión de Python
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit",
      "source.fixAll": "explicit"
    }
  },
  "python.analysis.typeCheckingMode": "basic", // Tipado estricto/básico en tiempo de edición
  "python.analysis.autoImportCompletions": true,

  // --- Frontend (TypeScript/React/HTML/CSS) ---
  "[typescript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescriptreact": "typescriptreact"
  },
  "javascript.suggest.autoImports": true,
  "typescript.suggest.autoImports": true
}
```

---

## 2. Tabla Rápida de Atajos de Teclado (Keyboard Shortcuts)

Domina estos atajos esenciales para moverte por el código sin tocar el ratón.

| Acción | Windows / Linux | macOS | Propósito e Impacto Visual en Entrevistas |
| :--- | :--- | :--- | :--- |
| **Paleta de Comandos** | `Ctrl + Shift + P` / `F1` | `Cmd + Shift + P` / `F1` | Ejecuta cualquier comando del IDE instantáneamente. |
| **Buscar Archivo** | `Ctrl + P` | `Cmd + P` | Abre archivos al instante escribiendo partes de su nombre. |
| **Buscar Símbolo Local** | `Ctrl + Shift + O` | `Cmd + Shift + O` | Navega directamente a funciones, clases o variables en el archivo abierto. |
| **Ir a Definición** | `F12` | `F12` | Salta al archivo y línea donde se define la función o variable seleccionada. |
| **Ver Definición (Peek)**| `Alt + F12` | `Opt + F12` | Muestra la definición del código en una ventana flotante sin salir del archivo actual. |
| **Renombrar Símbolo** | `F2` | `F2` | Renombra variables/clases de forma segura en todo el proyecto (refactoring dinámico). |
| **Multicursor Manual** | `Alt + Clic` | `Opt + Clic` | Añade cursores en múltiples ubicaciones arbitrarias. |
| **Multicursor Siguiente** | `Ctrl + D` | `Cmd + D` | Selecciona la siguiente palabra idéntica y añade cursor. |
| **Multicursor Total** | `Ctrl + Shift + L` | `Cmd + Shift + L` | Selecciona instantáneamente todas las instancias de la palabra seleccionada. |
| **Mover Línea** | `Alt + ↑ / ↓` | `Opt + ↑ / ↓` | Desplaza la línea de código actual arriba o abajo. |
| **Acciones Rápidas** | `Ctrl + .` | `Cmd + .` | Corrige lints, importa módulos faltantes o genera código autocompletado. |
| **Dividir Editor** | `Ctrl + \` | `Cmd + \` | Divide la pantalla para comparar o editar dos archivos en paralelo (ej. Frontend y Backend). |
| **Alternar Terminal** | `Ctrl + J` | `Cmd + J` | Muestra u oculta la terminal integrada rápidamente. |
| **Ocultar Barra Lateral**| `Ctrl + B` | `Cmd + B` | Maximiza el espacio de código visible en pantalla. |

---

## 3. Instrucciones y Ejemplos de Uso Prácticos

### A. Refactorización Segura con `F2` (Renombrar Símbolo)
No uses *Buscar y Reemplazar* de forma global para renombrar variables o funciones, ya que puede corromper nombres similares de otras clases.
* **Cómo usarlo**:
  1. Sitúa el cursor sobre el nombre de la clase o función (ej. `CourseSerializer` en [serializers.py](file:///c:/Users/Agent/OneDrive/Documents/proyects/nectarlabs-main/backend/apps/courses/serializers.py)).
  2. Presiona `F2`.
  3. Escribe el nuevo nombre (ej. `CourseListSerializer`) y presiona `Enter`.
* **Resultado**: El IDE modificará la clase en su archivo de definición y en todos los archivos de importación e instanciación del backend de manera inteligente.

### B. Navegación Veloz de Archivos con `Ctrl + P` y `Ctrl + Shift + O`
* **Navegar a un archivo remoto**: Presiona `Ctrl + P`, escribe `middleware` e irá directamente a [middleware.ts](file:///c:/Users/Agent/OneDrive/Documents/proyects/nectarlabs-main/frontend/src/middleware.ts).
* **Navegar dentro del archivo**: Presiona `Ctrl + Shift + O`. Si escribes `:` en Python, agrupará la lista por Clases y Métodos. Escribe `Course` para saltar inmediatamente a esa definición.

### C. Multicursor Inteligente con `Ctrl + D` y `Ctrl + Shift + L`
* **Ejemplo en Frontend (JSX/TSX)**: Supongamos que tienes una lista de clases repetidas y quieres cambiarlas de `flex items-center` a `grid grid-cols-2`.
  1. Selecciona la palabra `flex`.
  2. Presiona `Ctrl + D` repetidamente para seleccionar solo los siguientes tres elementos que quieres cambiar, o `Ctrl + Shift + L` si quieres reemplazarlos todos de golpe.
  3. Escribe `grid grid-cols-2`. Todas las líneas se actualizarán en tiempo real.

### D. Solución de Lints e Importaciones con `Ctrl + .`
* **Ejemplo en Python**: Si usas un decorador `@receiver` y Python marca un error porque no ha sido importado:
  1. Coloca el cursor en `receiver`.
  2. Presiona `Ctrl + .`.
  3. Selecciona `from django.dispatch import receiver`. La importación se añadirá de forma automática al principio del archivo respetando las reglas de estilo.

---

## 4. Comandos de Antigravity AI (Slash Commands)

Como desarrollador que colabora con un agente de IA, debes conocer y saber cuándo recomendar estos comandos integrados en la interfaz de chat para agilizar tareas repetitivas o complejas.

### `/goal` (Ejecución Autónoma de Largo Aliento)
* **Cuándo usarlo**: Cuando necesitas implementar un flujo completo de inicio a fin (ej. "Crea los endpoints del backend, sus tests unitarios y la integración correspondiente en el dashboard del frontend") y no quieres estar aprobando cada paso interactivo.
* **Efecto**: El agente entra en modo súper concentrado (ejecuta de manera autónoma hasta completar la lista de tareas definida, notificándote solo al final o ante un bloqueo crítico).

### `/grill-me` (Simulación de Entrevista Técnica / Diseño de Arquitectura)
* **Cuándo usarlo**: Antes de iniciar una sesión de refactorización compleja o antes de tu entrevista real.
* **Efecto**: La IA iniciará un cuestionario interactivo preguntándote tus preferencias de arquitectura, patrones de diseño y restricciones antes de tocar una sola línea de código, asegurando alineación total.

### `/schedule` (Tareas en Segundo Plano y Cron Jobs)
* **Cuándo usarlo**: Si necesitas programar una revisión periódica de logs, ejecutar linters automáticos cada cierto intervalo, o establecer un recordatorio para revisar un build largo.
* **Efecto**: Ejecuta un timer o cron autónomo que te enviará notificaciones directas al chat cuando se cumpla la condición.

### `/learn` (Memorización de Preferencias)
* **Cuándo usarlo**: Cuando el agente comete un error de estilo específico o quieres enseñarle una regla propia de tu equipo (ej. "Siempre usa `useQuery` de TanStack en lugar de `useEffect` para peticiones de datos").
* **Efecto**: Guarda permanentemente estas instrucciones en tu perfil local de configuración (`AGENTS.md` o `config`) para que todas las respuestas futuras sigan esa directriz de manera nativa.
