import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ==============================================================================
// PROXY DE MULTI-TENANCY PERIMETRAL (NEXT.JS EDGE MIDDLEWARE / PROXY)
// Enruta dinámicamente inquilinos estándar (plantilla nativa) y autónomos (microservicios)
// garantizando acceso universal al portal administrativo (/portal-admin) sin 404.
// ==============================================================================

export async function proxy(request: NextRequest) {
  return await middleware(request);
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostname = rawHost.split(',')[0].trim();

  // 0. SANITIZACIÓN DE RUTAS HUÉRFANAS DE SISTEMA DE ARCHIVOS (/var/www/...)
  if (url.pathname.includes('/var/www/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 1. DOMINIOS PRINCIPALES (SISTEMA MATRIZ)
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

  if (process.env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(process.env.FRONTEND_URL);
      const frontendHost = parsedUrl.host;
      if (frontendHost && !systemDomains.includes(frontendHost)) {
        systemDomains.push(frontendHost);
      }
    } catch {
      // Ignorar errores de parseo
    }
  }

  const cleanHost = hostname.split(':')[0].toLowerCase();
  let isSystemDomain = systemDomains.some(
    (domain) => cleanHost === domain || hostname.toLowerCase().startsWith(domain + ':')
  );

  // Soporte para entornos de desarrollo en la nube
  if (!isSystemDomain && (
    hostname.endsWith('.app.github.dev') ||
    hostname.endsWith('.gitpod.io') ||
    hostname.includes('codespaces') ||
    hostname.includes('githubpreview')
  )) {
    isSystemDomain = true;
  }

  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanHost);
  const hasNoDots = !cleanHost.includes('.');
  if (isIP || hasNoDots) {
    isSystemDomain = true;
  }

  // Si es dominio matriz del sistema, excluir rutas internas de procesamiento
  if (isSystemDomain) {
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/static') ||
      url.pathname.startsWith('/contract')
    ) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // 2. ENRUTAMIENTO DINÁMICO DE TENANTS (SUBDOMINIOS Y DOMINIOS PERSONALIZADOS)
  const isNectarSubdomain = hostname.includes('.nectarlabs.dev') || hostname.includes('.localhost');
  let tenantSlug = cleanHost;

  if (hostname.includes('.staging.nectarlabs.dev')) {
    tenantSlug = hostname.split('.staging.nectarlabs.dev')[0];
  } else if (hostname.includes('-staging.nectarlabs.dev')) {
    tenantSlug = hostname.split('-staging.nectarlabs.dev')[0];
  } else if (hostname.includes('.nectarlabs.dev')) {
    tenantSlug = hostname.split('.nectarlabs.dev')[0];
  } else if (hostname.includes('.localhost:3000')) {
    tenantSlug = hostname.split('.localhost:3000')[0];
  } else if (hostname.includes('.localhost:3002')) {
    tenantSlug = hostname.split('.localhost:3002')[0];
  } else if (hostname.includes('.localhost')) {
    tenantSlug = hostname.split('.localhost')[0];
  }

  if (tenantSlug.startsWith('www.')) {
    tenantSlug = tenantSlug.substring(4);
  }

  let customFrontendUrl: string | null = null;

  // Resolución dinámica de inquilino y contenedor autónomo vía API Django
  try {
    const isStaging = cleanHost.includes('staging');
    const defaultBackend = isStaging ? 'http://nectar_backend_staging:8000' : 'http://nectar_backend:8000';
    const backendApi = process.env.INTERNAL_API_URL || process.env.API_URL || defaultBackend;
    const cleanApi = backendApi.replace(/\/api$/, '').replace(/\/$/, '');

    const res = await fetch(`${cleanApi}/api/tenants/resolve-host/?host=${encodeURIComponent(cleanHost)}`, {
      next: { revalidate: 180 }
    });

    if (res.ok) {
      const tenantInfo = await res.json();
      if (tenantInfo?.subdomain) {
        tenantSlug = tenantInfo.subdomain;
      }
      if (tenantInfo?.custom_frontend_url && typeof tenantInfo.custom_frontend_url === 'string' && tenantInfo.custom_frontend_url.startsWith('http')) {
        customFrontendUrl = tenantInfo.custom_frontend_url;
      }
    } else if (!isNectarSubdomain) {
      console.warn(`[MultiTenant Proxy] resolve-host devolvió estado ${res.status} para ${cleanHost}`);
    }
  } catch (err) {
    if (!isNectarSubdomain) {
      console.error(`[MultiTenant Proxy] Fallo de conexión al resolver host ${cleanHost}:`, err);
    }
  }

  // Normalización de slugs y alias conocidos
  if (tenantSlug.includes('.')) {
    if (tenantSlug.startsWith('staging.')) {
      const parts = tenantSlug.split('.');
      tenantSlug = parts[1] || parts[0];
    } else {
      tenantSlug = tenantSlug.split('.')[0];
    }
  }

  if (tenantSlug === 'finanzasparahippies' || tenantSlug === 'finanzas-para-hippies' || tenantSlug === 'finanzas') {
    tenantSlug = 'fph';
  }
  if (tenantSlug.includes('kores')) {
    tenantSlug = 'kores';
  }

  // Filtrado de palabras reservadas del sistema
  if (tenantSlug !== 'www' && tenantSlug !== 'api' && tenantSlug !== 'admin' && tenantSlug !== 'staging') {
    // 2a. Aislamiento para SPA especiales
    if (tenantSlug === 'curso-python') {
      url.pathname = `/cursos/ingeniero-python/index.html`;
      return NextResponse.rewrite(url);
    }

    // 2b. Favicon dinámico
    if (url.pathname === '/favicon.ico') {
      url.pathname = `/api/tenants/${tenantSlug}/favicon.ico`;
      return NextResponse.rewrite(url);
    }

    // Si la ruta ya es interna de Nectar Labs (/tenants/...), servirla directamente sin reenviar a customFrontendUrl
    if (url.pathname.startsWith('/tenants/')) {
      return NextResponse.next();
    }

    // 2c. Rutas del Núcleo Matriz Néctar Labs (/portal-admin, /autofactura)
    // NUNCA se delegan al microservicio externo del inquilino, siempre se resuelven en la consola central (/tenants/[slug]/portal-admin)
    const isMatrixCoreRoute =
      url.pathname === '/portal-admin' ||
      url.pathname.startsWith('/portal-admin/') ||
      url.pathname === '/autofactura' ||
      url.pathname.startsWith('/autofactura/');

    if (isMatrixCoreRoute) {
      url.pathname = `/tenants/${tenantSlug}${url.pathname}`;
      return NextResponse.rewrite(url);
    }

    // 2d. Inquilinos con Microservicio Frontend Autónomo (Zero-Downtime Proxy)
    if (customFrontendUrl) {
      try {
        const targetUrl = new URL(url.pathname + url.search, customFrontendUrl);
        return NextResponse.rewrite(targetUrl);
      } catch (rewriteErr) {
        console.warn(`[MultiTenant Proxy] Error enrutando a ${customFrontendUrl}:`, rewriteErr);
      }
    }

    // 2e. Inquilinos Nativos (Plantilla Multi-Tenant Consolidada)
    // Los assets estáticos internos de Next.js se sirven directamente
    if (
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/static') ||
      (url.pathname.includes('.') && url.pathname !== '/favicon.ico')
    ) {
      return NextResponse.next();
    }

    url.pathname = `/tenants/${tenantSlug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// Interceptar peticiones para resolver multi-tenancy dinámico
export const config = {
  matcher: [
    '/favicon.ico',
    '/((?!api|contract|widget.js).*)',
  ],
};
