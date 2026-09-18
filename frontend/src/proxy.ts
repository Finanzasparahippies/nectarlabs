import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ==============================================================================
// PROXY DE MULTI-TENANCY PERIMETRAL (NEXT.JS EDGE PROXY / MIDDLEWARE)
// Este archivo reemplaza la antigua convención de "middleware" por "proxy"
// para Next.js v16.2.4+, interceptando todas las peticiones entrantes.
// ==============================================================================

export async function proxy(request: NextRequest) {
  return await middleware(request);
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostname = rawHost.split(',')[0].trim();

  // 0. SANITIZACIÓN DE RUTAS HUÉRFANAS DE SISTEMA DE ARCHIVOS (/var/www/...)
  // Si la URL entrante contiene una ruta física de servidor, retornar 404 directo para evitar loops de redirección 307
  if (url.pathname.includes('/var/www/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 1. FILTRADO DE RUTAS DEL SISTEMA (EXCLUSIONES)
  // Ignora llamadas a la API de Django, compilaciones internas de Next.js o rutas especiales
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.startsWith('/contract') ||
    (url.pathname.includes('.') && url.pathname !== '/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 2. DOMINIOS PRINCIPALES (SISTEMA MATRIZ)
  // Sitios de Nectar Labs que cargan la Landing Page o Dashboard de Clientes matriz.
  // No deben ser interpretados como portales de socios individuales.
  const systemDomains = [
    'localhost',
    'localhost:3000',
    '127.0.0.1:3000',
    'localhost:3002',
    'nectarlabs.localhost',
    'www.nectarlabs.localhost',
    'nectarlabs.dev',
    'www.nectarlabs.dev',
    'staging.nectarlabs.dev',
    'www.staging.nectarlabs.dev',
    'frontend',
    'frontend-staging',
    'nectar_frontend',
    'nectar_frontend_staging',
  ];

  // Agregar dinámicamente el host de FRONTEND_URL si está definido en el entorno
  if (process.env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(process.env.FRONTEND_URL);
      const frontendHost = parsedUrl.host; // Incluye el puerto si lo tiene
      if (frontendHost && !systemDomains.includes(frontendHost)) {
        systemDomains.push(frontendHost);
      }
    } catch (e) {
      // Ignorar errores de parseo
    }
  }

  // Determinar si la petición va dirigida al dominio principal del sistema
  let isSystemDomain = systemDomains.some(
    (domain) => hostname.toLowerCase() === domain || hostname.toLowerCase().startsWith(domain + ':')
  );

  // Soporte dinámico para entornos de desarrollo en la nube (Codespaces, Gitpod, etc.)
  if (!isSystemDomain && (
    hostname.endsWith('.app.github.dev') ||
    hostname.endsWith('.gitpod.io') ||
    hostname.includes('codespaces') ||
    hostname.includes('githubpreview')
  )) {
    isSystemDomain = true;
  }

  // Validación robusta: si el host es una IP o un nombre interno sin puntos (Docker, VPS hostname)
  const cleanHost = hostname.split(':')[0].toLowerCase();
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanHost);
  const hasNoDots = !cleanHost.includes('.');
  if (isIP || hasNoDots) {
    isSystemDomain = true;
  }

  // 3. ENRUTAMIENTO DINÁMICO DE SUBDOMINIOS Y DOMINIOS PERSONALIZADOS (COLMENAS DE SOCIOS)
  if (!isSystemDomain) {
    const isNectarSubdomain = hostname.includes('.nectarlabs.dev') || hostname.includes('.localhost');
    let tenantSlug = hostname.toLowerCase().split(':')[0];

    // Si es subdominio de Nectar Labs o localhost, extrae el slug directamente de forma síncrona
    if (hostname.includes('.staging.nectarlabs.dev')) {
      tenantSlug = hostname.split('.staging.nectarlabs.dev')[0];
    } else if (hostname.includes('.nectarlabs.dev')) {
      tenantSlug = hostname.split('.nectarlabs.dev')[0];
    } else if (hostname.includes('.localhost:3000')) {
      tenantSlug = hostname.split('.localhost:3000')[0];
    } else if (hostname.includes('.localhost:3002')) {
      tenantSlug = hostname.split('.localhost:3002')[0];
    } else if (hostname.includes('.localhost')) {
      tenantSlug = hostname.split('.localhost')[0];
    }

    // Limpiar prefijo www
    if (tenantSlug.startsWith('www.')) {
      tenantSlug = tenantSlug.substring(4);
    }

    // Si es un dominio personalizado propio que apunta a Nectar Labs (ej: tiendachic.com, staging.kores.vip)
    if (!isNectarSubdomain && cleanHost.includes('.')) {
      try {
        const backendApi = process.env.INTERNAL_API_URL || process.env.API_URL || (process.env.NODE_ENV === 'production' ? 'http://backend:8000' : 'http://localhost:8001');
        const cleanApi = backendApi.replace(/\/api$/, '').replace(/\/$/, '');
        const res = await fetch(`${cleanApi}/api/tenants/resolve-host/?host=${encodeURIComponent(cleanHost)}`, {
          next: { revalidate: 300 }
        });
        if (res.ok) {
          const tenantInfo = await res.json();
          if (tenantInfo && tenantInfo.subdomain) {
            tenantSlug = tenantInfo.subdomain;
          }
        }
      } catch {
        // En caso de fallo de red interna, conserva fallback al host
      }
    }

    if (tenantSlug.includes('.')) {
      tenantSlug = tenantSlug.split('.')[0];
    }

    // Filtra palabras reservadas para evitar colisiones
    if (tenantSlug !== 'www' && tenantSlug !== 'api' && tenantSlug !== 'admin' && tenantSlug !== 'staging') {
      // Enrutamiento especial aislado para el curso-python SPA en frontend/public/cursos/ingeniero-python
      if (tenantSlug === 'curso-python') {
        url.pathname = `/cursos/ingeniero-python/index.html`;
        return NextResponse.rewrite(url);
      }

      // Si el cliente solicita el favicon.ico del portal del inquilino, reescribir al endpoint dinámico del backend
      if (url.pathname === '/favicon.ico') {
        url.pathname = `/api/tenants/${tenantSlug}/favicon.ico`;
        return NextResponse.rewrite(url);
      }

      // REESCRITURA INTERNA: Redirige la petición a la carpeta `/tenants/[subdomain]/...`
      url.pathname = `/tenants/${tenantSlug}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// Configuración del matcher de rutas
export const config = {
  matcher: [
    '/favicon.ico',
    '/((?!api|_next/static|_next/image|widget.js|.*\\.).*)',
  ],
};
