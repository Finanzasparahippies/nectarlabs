# 🍯 Nectar Labs Base Template

Bienvenido a la plantilla base de **Nectar Labs**. Este repositorio está diseñado para unificar el stack tecnológico y acelerar el desarrollo de aplicaciones premium para negocios locales.

## 🚀 Stack Tecnológico

- **Backend**: Django 5.0 + Django Rest Framework
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS 4
- **Database**: PostgreSQL (Docker) / Supabase (Production)
- **Analytics**: Pandas, NumPy, Scikit-learn
- **Cloud**: Cloudinary (Media), Stripe (Payments), Cloudflare (DNS/Security)
- **DevOps**: Docker, Nginx, Gunicorn, WhiteNoise

---

## 🛠️ Comenzando

### 1. Configuración de Entorno
Copia el archivo de ejemplo y configura tus credenciales:
```bash
cp .env.example .env
```

### 2. Uso de Nectar CLI
Hemos creado un script unificado para gestionar el proyecto:
```bash
./nectar.sh dev      # Inicia Docker (Backend + Frontend + DB + Nginx)
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
