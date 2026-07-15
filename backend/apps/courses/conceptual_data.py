CONCEPTUAL_SCENARIOS = {
    "excepciones": {
        "pregunta": "¿Cómo manejas los errores en una API que conecta con una base de datos externa para asegurar que la aplicación no se caiga?",
        "respuesta_modelo": (
            "Para asegurar que la aplicación no colapse al interactuar con una base de datos externa, se deben "
            "emplear bloques try-except-finally. Es fundamental capturar excepciones específicas (como ConnectionError "
            "o OperationalError) en lugar de usar un bloque except general, garantizando el aislamiento de fallos. "
            "Adicionalmente, se debe implementar una política de reintentos con retraso exponencial (exponential backoff) "
            "para mitigar caídas de red intermitentes, y liberar de forma incondicional todos los recursos y conexiones "
            "abiertas en el bloque finally o mediante el uso de administradores de contexto (context managers / with)."
        ),
        "conceptos_clave": [
            {"nombre": "Bloques try-except-finally", "keywords": ["try", "except", "finally"]},
            {"nombre": "Excepciones específicas (ConnectionError/OperationalError)", "keywords": ["connectionerror", "operationalerror", "especifica", "especifico"]},
            {"nombre": "Exponential backoff (reintentos con retraso)", "keywords": ["exponential backoff", "retraso exponencial", "reintento", "backoff"]},
            {"nombre": "Liberación de recursos (finally/with)", "keywords": ["finally", "with", "context manager", "administrador", "recurso", "close"]}
        ]
    },
    "decoradores": {
        "pregunta": "¿Qué es un decorador en Python y proporciona un caso de uso real en una aplicación web?",
        "respuesta_modelo": (
            "Un decorador en Python es una función de orden superior (higher-order function) que toma otra función como "
            "argumento y extiende o modifica su comportamiento sin alterar directamente su código fuente. Un caso de uso "
            "clásico en aplicaciones web es la autenticación de usuarios (por ejemplo, validando un token JWT antes de permitir "
            "el acceso a una ruta) o el registro (logging) y auditoría de peticiones HTTP. Es imperativo utilizar `@functools.wraps` "
            "en el wrapper del decorador para preservar los metadatos de la función original (nombre, docstrings, etc.) y "
            "prevenir fallos en el análisis estático o pruebas."
        ),
        "conceptos_clave": [
            {"nombre": "Función de orden superior (Higher-order function)", "keywords": ["orden superior", "higher order"]},
            {"nombre": "Modificación de comportamiento sin alterar el código fuente", "keywords": ["modificar comportamiento", "extender comportamiento", "sin alterar", "sin modificar"]},
            {"nombre": "Casos de uso: Autenticación / JWT / Logging", "keywords": ["autenticacion", "jwt", "token", "logging", "auditoria", "registro"]},
            {"nombre": "Preservar metadatos con functools.wraps", "keywords": ["functools.wraps", "wraps", "@wraps"]}
        ]
    },
    "entornos": {
        "pregunta": "¿Cómo garantizas que tu código de Python sea perfectamente replicable en cualquier entorno de servidor o la nube?",
        "respuesta_modelo": (
            "La replicabilidad del código de Python en entornos de servidor o nube se asegura aislando el ecosistema del proyecto. "
            "Se debe utilizar un entorno virtual (venv, poetry o pipenv) para el desarrollo local y fijar con precisión las "
            "dependencias del proyecto en archivos como `requirements.txt` o `pyproject.toml`. Para producción, se debe "
            "contenedorizar la aplicación utilizando Docker, escribiendo un `Dockerfile` optimizado que prefiera imágenes base "
            "ligeras y seguras (como `python:3.11-slim` o alpine) y ejecute el proceso principal con un usuario no-root "
            "para garantizar el principio de privilegios mínimos."
        ),
        "conceptos_clave": [
            {"nombre": "Aislamiento de dependencias (venv/poetry/pipenv)", "keywords": ["entorno virtual", "venv", "poetry", "pipenv"]},
            {"nombre": "Registro exacto de dependencias (requirements/toml)", "keywords": ["requirements", "pyproject.toml", "dependencias"]},
            {"nombre": "Contenedorización con Docker", "keywords": ["docker", "dockerfile", "contenedor"]},
            {"nombre": "Imágenes ligeras y ejecución no-root", "keywords": ["slim", "alpine", "no-root", "no root", "seguridad"]}
        ]
    },
    "typescript": {
        "pregunta": "¿Cómo diseñas un tipado seguro y robusto en TypeScript para manejar payloads de APIs de terceros con estructuras desconocidas?",
        "respuesta_modelo": (
            "Para estructurar payloads desconocidos procedentes de APIs externas en TypeScript, se debe asignar el tipo `unknown` "
            "en lugar de `any` para evitar vulnerar el tipado del compilador. Posteriormente, se deben implementar "
            "Type Guards (funciones que validan la forma del payload en tiempo de ejecución utilizando operadores como `in` o `typeof`) "
            "o herramientas de validación de esquemas en runtime como Zod. También se pueden utilizar interfaces genéricas (Generics) "
            "para parametrizar la estructura y Discriminated Unions para diferenciar flujos de payloads de manera tipada e inequívoca."
        ),
        "conceptos_clave": [
            {"nombre": "Uso del tipo unknown en vez de any", "keywords": ["unknown"]},
            {"nombre": "Guardianes de tipo (Type Guards) en tiempo de ejecución", "keywords": ["type guard", "guardian", "runtime", "ejecucion"]},
            {"nombre": "Validación de esquemas (Zod / runtime validation)", "keywords": ["zod", "esquema", "validation"]},
            {"nombre": "Estructuras dinámicas con Generics / Discriminated Unions", "keywords": ["generic", "union discriminada", "discriminated union"]}
        ]
    },
    "elixir": {
        "pregunta": "¿Cómo manejas la concurrencia y la tolerancia a fallos extrema en una aplicación utilizando Elixir y el estándar OTP?",
        "respuesta_modelo": (
            "En Elixir y OTP, la concurrencia y la tolerancia a fallos se fundamentan en el Modelo de Actores. Los procesos "
            "de la máquina virtual BEAM son extremadamente ligeros, están completamente aislados y no comparten memoria, "
            "comunicándose estrictamente a través de paso de mensajes asíncronos encolados en buzones de correo. El estado "
            "se administra con abstracciones como `GenServer`. Ante fallos, se aplica la filosofía 'Let it crash' (dejar caer "
            "el proceso trabajador inconsistente), delegando su recuperación a un Supervisor jerárquico que implementa "
            "estrategias de reinicio controlado como `:one_for_one`."
        ),
        "conceptos_clave": [
            {"nombre": "Modelo de Actores y procesos BEAM (sin memoria compartida)", "keywords": ["actor", "beam", "proceso", "memoria", "mensaje"]},
            {"nombre": "Manejo de estado mediante GenServer", "keywords": ["genserver"]},
            {"nombre": "Filosofía 'Let it crash' y tolerancia a fallos", "keywords": ["let it crash", "deja caer", "tolerancia a fallos"]},
            {"nombre": "Árboles de supervisión y estrategias de reinicio (:one_for_one)", "keywords": ["supervisor", "supervision", "one_for_one", "one for one"]}
        ]
    },
    "aws": {
        "pregunta": "¿Cómo diseñarías una arquitectura de microservicios de alta disponibilidad y tolerante a fallos utilizando AWS?",
        "respuesta_modelo": (
            "Una arquitectura de microservicios resiliente en AWS debe diseñarse desacoplada mediante una arquitectura dirigida "
            "por eventos (Event-Driven) utilizando colas de mensajes (SQS) o publicadores/suscriptores (SNS) para asegurar que "
            "la caída de un componente no bloquee al resto. El procesamiento se implementa mediante contenedores serverless (ECS Fargate "
            "o AWS Lambda). Las bases de datos relacionales (RDS) deben configurarse en despliegues Multi-AZ para conmutación por error "
            "transparente. Para transacciones complejas entre microservicios, se implementa el Patrón Sagas (secuencia de transacciones locales "
            "con acciones de compensación ante errores) y se asegura de forma estricta la idempotencia en las APIs."
        ),
        "conceptos_clave": [
            {"nombre": "Arquitectura basada en eventos y colas (SQS/SNS)", "keywords": ["event-driven", "evento", "sqs", "sns", "cola", "desacopl"]},
            {"nombre": "Cómputo serverless o contenerizado (ECS/Fargate/Lambda)", "keywords": ["ecs", "fargate", "lambda", "serverless", "contenedor"]},
            {"nombre": "Replicación y alta disponibilidad de datos (RDS Multi-AZ)", "keywords": ["rds", "multi-az", "multi az", "base de datos"]},
            {"nombre": "Patrón Sagas e Idempotencia en operaciones", "keywords": ["saga", "idempotencia", "idempotente", "compensacion"]}
        ]
    }
}
