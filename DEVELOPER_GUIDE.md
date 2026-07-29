# 🍯 Nectar Labs — Guía Oficial para Desarrolladores & Requerimientos del Sistema

Bienvenido a la guía técnica oficial de **Nectar Labs**. Este documento detalla la arquitectura del sistema, los requerimientos de infraestructura, las guías de instalación, el manual de comandos CLI y las mejores prácticas aplicadas en el backend (Django 5) y frontend (Next.js 15).

---

## 📋 Requerimientos del Sistema y Prerrequisitos

Para ejecutar, probar o desplegar el ecosistema de **Nectar Labs**, asegúrate de contar con las siguientes herramientas en tu entorno de desarrollo:

### 1. Entorno de Ejecución Local / Host
- **Python**: v3.12+ (Gestión de paquetes vía `pip` y `virtualenv` opcional).
- **Node.js**: v20.x LTS (con `npm` v10+).
- **Contenedores**: **Docker** (v24+) o **Podman** (con soporte rootless y `podman-compose`).
- **Bases de Datos & Caché**: PostgreSQL 15+ y Redis 7+ (ambos ejecutados en contenedor vía Docker Compose).

### 2. Credenciales y Variables de Entorno (API Keys)
Configura tu archivo `.env` a partir de `.env.example`:
- `SECRET_KEY`: Llave secreta de Django.
- `DATABASE_URL` / `DB_*`: Conexión a PostgreSQL.
- `REDIS_URL`: Conexión al servidor de Redis (`redis://redis:6379/0`).
- `GROQ_API_KEY`: API Key oficial de Groq Cloud para IA streaming.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Integración de pagos y suscripciones.
- `FACTURAPI_KEY`: API Key del PAC para la emisión de facturación electrónica **CFDI 4.0** (SAT México).
- `CLOUDINARY_URL`: Almacenamiento multimedia en la nube.

---

## 🏗️ Arquitectura Técnica del Sistema

El proyecto está estructurado como un ecosistema modular de microservicios coordinados mediante **Docker Compose**:

```text
Nectar-Labs/
├── backend/                  # Microservicio Principal Django 5.0 + Django REST Framework
│   ├── config/               # Ajustes globales, middleware de performance, rutas URL y WSGI/ASGI
│   ├── apps/                 # Módulos Django desacoplados
│   │   ├── users/            # Autenticación JWT y gestión de roles (ADMIN, BUSINESS, ANALYST, CUSTOMER)
│   │   ├── tenants/          # Multi-Tenancy (subdominios, dominios BYO, branding Glassmorphism, timbres)
│   │   ├── billing/          # Facturación CFDI 4.0 (TaxProfile, Invoice, SATProductKey, SalesNotes)
│   │   ├── dashboard/        # Analítica ejecutiva BI, seguimiento de proyectos, TimeLogs y Pandas
│   │   ├── shop/             # Contratos, add-ons, planes de suscripción y pasarela Stripe
│   │   ├── newsletter/       # Campañas de correo masivo con soporte BYO SMTP
│   │   └── tickets/          # Mesa de ayuda y soporte técnico
│   └── seed_addons.py        # Poblamiento inicial de la tabla de Add-ons y planes
│
├── frontend/                 # Aplicación Next.js 15 (App Router) + Tailwind CSS + TypeScript
│   ├── src/app/              # Rutas Next.js (/dashboard, /contract, /tenants, /login)
│   ├── src/components/       # Componentes de UI con diseño Glassmorphic (Sidebar, Widgets, Chats)
│   └── src/lib/              # Cliente HTTP Axios y utilidades de dominio
│
├── realtime/                 # Microservicio Node.js + WebSockets + Groq AI Streaming
│   ├── index.ts              # Servidor WS para chat de soporte asíncrono
│   └── package.json          # Dependencias Node.js y ejecutador `tsx`
│
├── docker/                   # Configuración de Nginx Reverse Proxy
├── nectar.sh                 # CLI oficial unificado de automatización de Nectar Labs
└── docker-compose.yml        # Orquestación de desarrollo local (Backend, Frontend, Redis, Realtime, Nginx)
```

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

### Paso 1: Configurar Variables de Entorno
```bash
cp .env.example .env
```

### Paso 2: Iniciar el Entorno con Nectar CLI
El script `./nectar.sh` verifica automáticamente la existencia de la red `prod_network` (creándola si es necesario) y levanta los contenedores:
```bash
./nectar.sh dev
```

### Paso 3: Ejecutar Migraciones y Poblar Base de Datos
```bash
./nectar.sh migrate
./nectar.sh seed-addons
./nectar.sh createsuperuser
```

### Paso 4: Monitorear Logs en Tiempo Real
```bash
./nectar.sh logs
```

---

## 💼 Flujos de Negocio Clave

### 📦 1. Contratación de "Solo Add-ons"
- Los clientes pueden suscribirse a módulos independientes sin contrato forzoso.
- El webhook de Stripe asigna el rol `BUSINESS`, aprovisiona el `Tenant` (subdominio) y genera el ticket de implementación de marca.

### 🎨 2. Cotizador Modular y Firma Digital Doble (50/50)
- **Cotizaciones Personales**: Creación de propuestas comerciales modulares con exportación a PDF.
- **Firma Cliente & Dev**: Validación en `/contract/sign/[id]` (cliente) y `/contract/dev-sign/[id]` (desarrollador).
- **Esquema 50/50**: Genera automáticamente dos registros de pago: 50% Anticipo (inmediato) y 50% Liquidación (contra entregable).

### 🧾 3. Facturación Electrónica CFDI 4.0 (SAT México)
- **Perfil Fiscal (`TaxProfile`)**: Registro de RFC, Razón Social, Régimen Fiscal, Código Postal Fiscal e ID de organización PAC (Facturapi).
- **Catálogos SAT**: Claves oficiales de productos/servicios (`c_ClaveProdServ`) y unidades (`c_ClaveUnidad`).
- **Ciclo de Vida CFDI**: Emisión asíncrona, timbrado fiscal (UUID), generación de XML/PDF y gestión de solicitudes de cancelación en buzón SAT.

### 💬 4. Realtime WS & IA Groq Streaming
- Conexión independiente vía WebSockets al microservicio Node.js (`realtime/`).
- Respuestas token-por-token con baja latencia mediante la API de Groq Cloud.
- Caché de métricas ejecutivas en Redis invalidado por señales de Django (`signals.py`).

---

## 🛠️ Referencia de Comandos CLI (`./nectar.sh`)

| Comando | Descripción |
| :--- | :--- |
| `./nectar.sh dev` | Inicia el entorno local (Backend, Frontend, Redis, Realtime, Nginx) |
| `./nectar.sh stop` | Detiene todos los contenedores de desarrollo |
| `./nectar.sh logs` | Muestra los logs en tiempo real de los servicios |
| `./nectar.sh migrate` | Ejecuta migraciones de la base de datos PostgreSQL |
| `./nectar.sh seed-addons` | Pobla la base de datos con los Add-ons y planes base |
| `./nectar.sh typecheck` | Ejecuta la verificación estática de tipos TypeScript |
| `./nectar.sh buildcheck` | Compila el frontend Next.js para validar errores de build |
| `./nectar.sh test` | Ejecuta la suite de pruebas unitarias de Django |
| `./nectar.sh up-staging` | Inicia el entorno de Staging |
| `./nectar.sh up-prod` | Inicia el entorno de Producción |
| `./nectar.sh clean` | Limpia de forma segura caché y redes e imágenes huérfanas |

---

## 🔒 Mejores Prácticas de Código Aplicadas

1. **Backend (Django / DRF)**:
   - Eliminación de consultas N+1 con `select_related()` y `prefetch_related()`.
   - Caché con Redis e invalidación selectiva mediante señales de Django (`post_save`, `post_delete`).
   - Comentarios explicativos en español y docstrings enriquecidos en modelos y vistas.
2. **Frontend (Next.js / React)**:
   - Sistema de diseño **Glassmorphism** con Tailwind CSS.
   - Manejo de estados de carga con esqueletos/shimmer y notificaciones interactivas.
   - Adaptabilidad móvil completa (menú móvil responsivo y drawer de navegación).
