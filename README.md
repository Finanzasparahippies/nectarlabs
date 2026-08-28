# 🍯 Nectar Labs — Plataforma Base Enterprise

![Nectar Labs](https://img.shields.io/badge/Stack-Django%205%20%7C%20Next.js%2015%20%7C%20Redis%20%7C%20Groq%20AI-064e3b?style=for-the-badge)
![CFDI 4.0](https://img.shields.io/badge/SAT%20M%C3%A9xico-Facturaci%C3%B3n%20CFDI%204.0-d4af37?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-blue?style=for-the-badge)

Bienvenido al repositorio oficial de **Nectar Labs**. Esta plataforma está diseñada para unificar la infraestructura tecnológica, acelerar el desarrollo de soluciones empresariales para negocios locales y ofrecer capacidades avanzadas de **Multi-Tenancy, Cotizador Inteligente con IA, Firma Digital de Contratos y Facturación Electrónica CFDI 4.0**.

---

## 🚀 Stack Tecnológico

- **Backend**: Django 5.0 + Django REST Framework + SimpleJWT
- **Frontend**: Next.js 15 (App Router) + React 18 + Tailwind CSS (Glassmorphic Theme)
- **Database & Cache**: PostgreSQL 15, Redis 7 (Cache reactivo con invalidación vía Django Signals)
- **Realtime WS & IA**: Microservicio Node.js + WebSockets + Groq Cloud API (Streaming en tiempo real)
- **Analytics & BI**: Pandas, NumPy, Scikit-learn
- **Facturación SAT México**: CFDI 4.0 con integración de PAC (Facturapi) y catálogos oficiales (`c_ClaveProdServ`, `c_ClaveUnidad`)
- **Pagos & Almacenamiento**: Stripe SDK (Suscripciones & Add-ons), Cloudinary (Media storage)
- **DevOps & Infraestructura**: Docker, Podman, Nginx (Reverse Proxy SSL), Gunicorn, WhiteNoise, CLI `./nectar.sh`

---

## 🛠️ Guía Rápida de Inicio

### 1. Clonar y Configurar Entorno
```bash
cp .env.example .env
```

### 2. Iniciar con Nectar CLI
El CLI oficial gestiona la creación automática de la red de contenedores `prod_network`:
```bash
./nectar.sh dev      # Inicia Backend + Frontend + DB + Redis + Realtime + Nginx
./nectar.sh migrate  # Aplica las migraciones de PostgreSQL
./nectar.sh seed-addons # Pobla los add-ons y planes iniciales
./nectar.sh logs     # Monitorea los logs en tiempo real
```

### 3. Guía Completa de Desarrollador
Para una documentación detallada de la arquitectura, configuración de variables de entorno, comandos del CLI y flujos de trabajo, consulta la [Guía de Desarrollador (DEVELOPER_GUIDE.md)](file:///home/saulvillecruz/proyectos/repositorios/Nectar-Labs/DEVELOPER_GUIDE.md).

---

## ⚡ Flujos Principales de Negocio & Multi-Tenancy

1. **Arquitectura Multi-Tenant (4 Niveles)**:
   - **Nativo Estándar**: Portal Glassmorphism con selección de color y catálogo.
   - **CMS Standalone Aislado**: Páginas dinámicas creadas en Django Admin con HTML/JS propio (`is_standalone_isolated=True`), libre de plantillas y respaldado por caché Redis con invalidación por señales.
   - **SPA Estático Aislado**: Alojado directamente en `frontend/public/<subdominio>/index.html`.
   - **Proyecto Autónomo Aislado (BYO Stack)**: Microservicio dedicado en Staging (`staging_network`) y Producción (`prod_network`) que consume Addons centrales vía API Key. Ver [Guía de Proyectos Aislados](file:///home/saulvillecruz/proyectos/repositorios/Documentacion-Nectar/backend/multi-tenant-custom-apps.md).
2. **Módulo de Add-ons Independientes**: Permite la contratación de módulos sin compromiso forzoso a 6 meses con auto-aprovisionamiento de subdominios (`Tenant`).
3. **Cotizaciones Modulares y Firma Digital Doble**: Propuestas comerciales en PDF con firma digital del cliente y desarrollador, estructurando el esquema de pago en **50% Anticipo / 50% Liquidación**.
4. **Facturación Electrónica CFDI 4.0**: Emisión asíncrona de comprobantes fiscales digitales para México con timbrado SAT, folios UUID, soporte de retenciones y notas de venta.
5. **Chat de Soporte IA Realtime**: Asistencia asíncrona en tiempo real conectada a Groq Cloud y respaldada por caché en Redis.


---

## 🔍 Guía de Diagnóstico y Despliegue Multi-Tenant: Tenant Kōres México (`kores-mexico`)

### 1. Diagnóstico de Causa Raíz & Desfase de Identificador
- **Causa Raíz del Error 404 / Portal Inactivo:** En la base de datos de Staging, el tenant estaba registrado bajo el subdominio `kores`, mientras que las peticiones entraban hacia `kores-mexico.staging.nectarlabs.dev`. Al solicitar la API `GET /api/tenants/public-config/?subdomain=kores-mexico`, Django retornaba 404 al no encontrar el subdominio exacto `kores-mexico`.
- **Mapeo de Alias en Backend (`apps.tenants.utils`):** Se implementó una resolución flexible en `get_tenant_from_request` que intenta coincidencia exacta y, si falla, realiza normalización de sufijos (`-mexico`, `-mx`, `-latam`) para evitar duplicación de datos o caídas cuando se accede indistintamente vía `kores` o `kores-mexico`.
- **Enrutamiento Perimetral Nginx:** Las peticiones a `kores-mexico.staging.nectarlabs.dev` son capturadas por el comodín `*.staging.nectarlabs.dev` (Sección 4 de Nginx), enviándolas a `nectar_frontend_staging:3000`. El proxy de Next.js (`proxy.ts`) reescribe internamente la URL hacia `/tenants/kores-mexico/` y la renderiza de forma 100% dinámica mediante el motor unificado.

---

### 2. Comandos de Diagnóstico, Siembra y Verificación en Staging

#### Paso A: Ejecutar Siembra e Inspección en Django Shell (Servidor Remoto `/home/saul/nectarlabs/`)
```bash
# 1. Ejecutar el script de siembra idempotente para kores-mexico
docker exec -it nectar_backend_staging python seed_kores_mexico_tenant.py

# 2. Inspeccionar estado exacto en Django Shell
docker exec -it nectar_backend_staging python manage.py shell -c "from apps.tenants.models import Tenant; t = Tenant.objects.filter(subdomain__in=['kores', 'kores-mexico']); print([(x.subdomain, x.is_active, x.custom_domain) for x in t])"
```

#### Paso B: Inspección de Contenedores y Logs de Nginx
```bash
# Validar estado de contenedores en Staging
docker compose -f docker-compose.staging.yml ps

# Monitorear logs de Nginx para verificar que la petición entra al frontend unificado
docker logs prod_nginx --tail 50 -f
```

#### Paso C: Verificación Remota de Endpoints Públicos
```bash
# 1. Probar resolución directa del endpoint de configuración pública
curl -s http://localhost:8000/api/tenants/public-config/?subdomain=kores-mexico | jq .

# 2. Probar enrutamiento por Host Header simulado
curl -H "Host: kores-mexico.staging.nectarlabs.dev" -I http://localhost/
```

---

## 🏗️ Arquitectura de Orquestación Dual: Proyecto Dedicado (`/var/www/premium-ties/`) vs. Multi-Tenant Unificado (`kores-mexico`)

La plataforma de **Nectar Labs** soporta una arquitectura híbrida de 4 niveles que permite la convivencia limpia entre portales multi-tenant dinámicos y aplicaciones totalmente personalizadas e independientes (BYO Stack):

### 1. Enrutamiento y Aislamiento por Proyecto
- **Multi-Tenant Unificado (`kores-mexico`):** Servido dinámicamente por el motor de Next.js (`nectar_frontend`) bajo los subdominios `kores-mexico.nectarlabs.dev` y `kores-mexico.staging.nectarlabs.dev`.
- **Proyecto Dedicado Autónomo (`kores.vip` / `/var/www/premium-ties/`):**
  - **Orquestación Centralizada:** Los servicios `premium_ties_backend_staging`, `premium_ties_frontend_staging`, `premium_ties_backend_prod` y `premium_ties_frontend_prod` están integrados en `docker-compose.staging.yml` y `docker-compose.prod.yml` en la red compartida `prod_network`.
  - **Persistencia de Base de Datos:** Se utilizan volúmenes declarados con nombre (`premium_ties_db_staging_data` y `premium_ties_db_prod_data`) para prevenir pérdida accidental de datos durante tareas de mantenimiento o despliegues.
  - **Resolución Dinámica DNS en Nginx:** Todas las reglas de upstream utilizan evaluación perezosa (`set $premium_ties_fe_staging ...`) con `resolver 127.0.0.11 valid=10s ipv6=off;`, evitando bloqueos 502 por actualización de IPs internas de contenedores.

---

### 2. Comandos de Control y Despliegue (`./nectar.sh`)

```bash
# Iniciar todo el ecosistema de Staging (incluyendo Nectar Core + Premium Ties dedicado)
./nectar.sh up-staging

# Iniciar todo el ecosistema de Producción
./nectar.sh up-prod

# Monitorear estado de contenedores en la red compartida
docker compose -f docker-compose.staging.yml ps
docker exec prod_nginx nginx -s reload
```

---

**Nectar Labs** — *Tener un negocio local no significa tener límites globales.* 🚀


