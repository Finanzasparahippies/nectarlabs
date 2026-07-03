import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ==============================================================================
// MIDDLEWARE DE MULTI-TENANCY PERIMETRAL (NEXT.JS EDGE MIDDLEWARE)
// Este middleware intercepta todas las peticiones entrantes al Frontend
// y determina si provienen de un subdominio/dominio de cliente (Colmena)
// para reescribir internamente la ruta de forma transparente.
// ==============================================================================

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. FILTRADO DE RUTAS DEL SISTEMA (EXCLUSIONES)
  // Ignora llamadas a la API de Django, archivos estáticos o compilaciones internas de Next.js
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.') // Excluir archivos estáticos como favicon.ico, logotipos, widget.js
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
  ];

  // Determinar si la petición va dirigida al dominio principal del sistema
  const isSystemDomain = systemDomains.some(
    (domain) => hostname.toLowerCase() === domain || hostname.toLowerCase().startsWith(domain + ':')
  );

  // 3. ENRUTAMIENTO DINÁMICO DE SUBDOMINIOS (COLMENAS DE SOCIOS)
  // Si no es un dominio del sistema principal, extrae el identificador (subdominio o subdominio en staging)
  if (!isSystemDomain) {
    let identifier = hostname.toLowerCase();

    // Extrae la parte izquierda del subdominio de acuerdo al entorno de ejecución
    if (hostname.includes('.staging.nectarlabs.dev')) {
      identifier = hostname.split('.staging.nectarlabs.dev')[0];
    } else if (hostname.includes('.nectarlabs.dev')) {
      identifier = hostname.split('.nectarlabs.dev')[0];
    } else if (hostname.includes('.localhost:3000')) {
      identifier = hostname.split('.localhost:3000')[0];
    } else if (hostname.includes('.localhost:3002')) {
      identifier = hostname.split('.localhost:3002')[0];
    } else if (hostname.includes('.localhost')) {
      identifier = hostname.split('.localhost')[0];
    }

    // Filtra palabras reservadas para evitar colisiones
    if (identifier !== 'www' && identifier !== 'api' && identifier !== 'admin' && identifier !== 'staging') {

      // REESCRITURA INTERNA: Redirige la petición a la carpeta `/tenants/[subdomain]/...`
      // utilizando rewrite (conserva la URL del subdominio del cliente en la barra del navegador,
      // ej: "https://sushilo.nectarlabs.dev/" pero renderiza el contenido de "/tenants/sushilo/").
      url.pathname = `/tenants/${identifier}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// Configuración del middleware de Next.js para indicar en qué rutas ejecutarse
export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto las carpetas internas de Next.js
     * o archivos en public/ (como favicon, widget.js, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|widget.js|.*\\.).*)',
  ],
};
