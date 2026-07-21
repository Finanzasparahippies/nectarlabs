# 🍯 Nectar Labs Base Template

Bienvenido a la plantilla base de **Nectar Labs**. Este repositorio está diseñado para unificar el stack tecnológico y acelerar el desarrollo de aplicaciones premium para negocios locales.

## 🚀 Stack Tecnológico

- **Backend**: Django 5.0 + Django Rest Framework
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS 4
- **Database & Cache**: PostgreSQL, Redis (Cache de alto rendimiento e invalidación por Signals)
- **Realtime**: Microservicio Node.js + WebSockets (WS/WSS) + `tsx` (TypeScript Execution) + Groq AI Streaming
- **Analytics**: Pandas, NumPy, Scikit-learn
- **Cloud**: Cloudinary (Media), Stripe (Payments), Cloudflare (DNS/Security), Groq Cloud API
- **DevOps**: Docker, Nginx (Reverse Proxy y enrutamiento seguro de WebSockets), Gunicorn, WhiteNoise

---

## 🛠️ Comenzando

### 1. Configuración de Entorno
Copia el archivo de ejemplo y configura tus credenciales (asegúrate de incluir las claves de `GROQ_API_KEY`, `REDIS_URL` y variables de entorno del servidor de Realtime):
```bash
cp .env.example .env
```

### 2. Uso de Nectar CLI
Hemos creado un script unificado para gestionar el proyecto. Los contenedores usan nombres de proyecto aislados (`nectarlabs-dev`, `nectarlabs-staging`, `nectarlabs-prod`) para prevenir colisiones en el host:
```bash
./nectar.sh dev      # Inicia Docker (Backend + Frontend + DB + Redis + Realtime + Nginx)
./nectar.sh migrate  # Ejecuta migraciones
./nectar.sh logs     # Ver logs en tiempo real
```

### 3. Roles de Usuario
La plantilla incluye 4 roles predefinidos:
- `ADMIN`: Control total.
- `BUSINESS`: Acceso al dashboard y gestión de inventario/ventas.
- `ANALYST`: Acceso a reportes y analítica de datos.
- `CUSTOMER`: Cliente final (Blog, Tienda).

---

## ⚡ Implementaciones Nuevas y Flujos de Negocio

### 📦 1. Flujo de "Solo Add-ons"
Los clientes pueden contratar add-ons individuales (módulos independientes) sin necesidad de firmar un contrato de desarrollo de 6 meses:
- **Upgrade Automático**: El webhook de Stripe procesa la suscripción, actualiza el rol a `BUSINESS` y registra un contrato básico.
- **Auto-Aprovisionamiento**: Crea automáticamente el `Tenant` (subdominio) del cliente y genera un ticket de soporte/implementación asignado para que los ingenieros conecten el módulo.
- **Personalización de Marca**: Habilita la configuración de marca (logotipo, colores, textos y configuración de la IA de asistencia).

### 🎨 2. Cotizador de Proyectos Modulares y Contratos Firmados
Permite a Néctar Labs cotizar y desarrollar proyectos a la medida basados en módulos personalizados:
- **Módulo Administrador**: Herramienta en la sección **Control de Negocio** para crear cotizaciones modulares completas con estimación de entrega en semanas y precios ajustables, autogenerando propuestas comerciales en PDF.
- **Flujo de Firma Digital Doble**: 
  - Al aprobar una cotización (`APPROVED`), el backend crea una cuenta `BUSINESS` para el cliente y genera un contrato inactivo (`is_fully_signed=False`).
  - El cliente revisa, completa sus datos fiscales (RFC, Dirección) y firma digitalmente en la pantalla `/contract/sign/[id]`.
  - El desarrollador (Jesus Saul) valida y firma digitalmente en `/contract/dev-sign/[id]`.
- **Facturación del Proyecto (50/50)**: Una vez firmado por ambos lados, el sistema aprovisiona el Tenant, el Proyecto (MVP) y genera dos abonos correspondientes al 50% de Anticipo (inmediato) y 50% de Liquidación (contra entrega de semanas estimadas).

### 💬 3. Chat de Soporte en Tiempo Real con Asistencia de IA y Caché Redis
- **Servicio Realtime Dedicado**: Microservicio Node.js en la carpeta `realtime/` que gestiona de manera independiente las conexiones WebSocket activas sin sobrecargar al backend de Django.
- **Asistencia Inteligente Asíncrona**: Cuando un usuario final envía un mensaje a través del widget de chat, el microservicio realiza una validación en base de datos PostgreSQL y transmite en tiempo real la respuesta en streaming (token por token) usando la API de Groq.
- **Dashboard Ultrarrápido con Redis**: Los cálculos complejos del dashboard de administración de Django se cachean en Redis. Las señales de Django (`signals.py`) detectan automáticamente mutaciones y limpian el caché de forma selectiva para garantizar consistencia y rendimiento óptimo.
- **Seguridad e Infraestructura**: Los puertos de Redis (`6379`) y Realtime (`4000`) se mantienen internos en la red de Docker. El tráfico externo se realiza mediante cifrado SSL/TLS a través del proxy inverso de Nginx.

---

## 📈 Escalabilidad y Nuevas Integraciones

### Añadir un Nuevo Módulo
1. Crea la app en Django: `docker-compose exec backend python manage.py startapp nombre_app apps/nombre_app`
2. Regístrala en `backend/config/settings.py`.
3. Crea los componentes correspondientes en `frontend/src/components`.

### Analítica de Datos
El módulo `apps/dashboard` utiliza **Pandas**. Puedes extender las vistas en `views.py` para procesar archivos CSV, Excel o datos de la DB y devolver JSON listo para ser graficado en el frontend con librerías como Recharts.

### Despliegue en Hetzner
1. Sube el código a tu servidor.
2. Configura un registro de contenedores o construye directamente: `./nectar.sh build`.
3. Usa `docker-compose.prod.yml` para el despliegue final con SSL vía Cloudflare.

---

## 📧 Newsletter y Notificaciones
El sistema de correo está preconfigurado para usar SMTP (Zoho por defecto). 
- Para enviar correos masivos, usa la utilidad en `apps/newsletter/models.py`.
- Las plantillas HTML deben guardarse en `backend/apps/newsletter/templates/newsletter/`.

---

**Nectar Labs** - *Tener un negocio local no significa tener límites globales.* 🚀
# nectarlabs
