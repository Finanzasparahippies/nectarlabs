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

**Nectar Labs** — *Tener un negocio local no significa tener límites globales.* 🚀
