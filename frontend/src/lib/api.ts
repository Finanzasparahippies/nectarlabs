// ==============================================================================
// CLIENTE HTTP CENTRAL (API RESOLVER & FETCH UTILITIES)
// Este archivo unifica la comunicación del Frontend Next.js hacia la API REST
// de Django, inyectando tokens JWT de autenticación y manejando errores globales.
// ==============================================================================

let resolvedApiUrl = "/api";

if (typeof window !== "undefined") {
  const origin = window.location.origin;
  if (origin.includes("github.dev")) {
    resolvedApiUrl = origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api";
  } else {
    // En el navegador, siempre usamos la ruta relativa /api para aprovechar los
    // rewrites de Next.js / Nginx sin incurrir en bloqueos CORS cross-origin.
    resolvedApiUrl = "/api";
  }
} else {
  // En SSR (Server-Side Rendering dentro de Node/Docker), usamos la URL de red interna
  resolvedApiUrl = process.env.INTERNAL_API_URL || process.env.API_URL || "http://backend:8000/api";
}

export const API_URL = resolvedApiUrl;

export interface FetcherOptions extends RequestInit {
  isPublic?: boolean;           // Indica si el endpoint se debe llamar sin cabecera Authorization
  retries?: number;             // Número de reintentos automáticos ante fallo de red (default: 0)
  retryDelay?: number;          // Demora inicial en ms para reintentos con backoff exponencial (default: 500)
}

/**
 * Decodifica la sección payload de un token JWT para verificar si ya expiró (exp).
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token || token === 'null' || token === 'undefined') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload && typeof payload.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Resuelve la URL absoluta del dominio principal del sistema de forma limpia.
 * Se utiliza para redirigir fuera de las Colmenas de los clientes (ej: mandar al /login central).
 */
export function getMainDomainUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const host = window.location.host;
  let mainDomain = host;
  if (host.includes('staging.nectarlabs.dev')) {
    mainDomain = 'staging.nectarlabs.dev';
  } else if (host.includes('nectarlabs.dev')) {
    mainDomain = 'nectarlabs.dev';
  }
  return `${window.location.protocol}//${mainDomain}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Envoltorio (wrapper) de la API Fetch nativa.
 * Agrega automáticamente las cabeceras requeridas, token JWT de localStorage,
 * intercepta códigos HTTP 401 (sesión expirada), formatea errores y soporta
 * reintentos exponenciales configurables ante fallos de red.
 */
export async function fetcher(endpoint: string, options: FetcherOptions = {}): Promise<any> {
  const { isPublic, retries = 0, retryDelay = 500, ...fetchOptions } = options;
  const rawToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const hasToken = rawToken && rawToken !== 'null' && rawToken !== 'undefined';

  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith("/api/")) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api\//, "/");
  }

  const cleanEndpointLower = cleanEndpoint.toLowerCase();
  const isKnownPublic = isPublic || 
    cleanEndpointLower.includes('/register') || 
    cleanEndpointLower.includes('/token') || 
    cleanEndpointLower.includes('/confirm-email') || 
    cleanEndpointLower.includes('/public-config') || 
    cleanEndpointLower.includes('/guest-auth') || 
    cleanEndpointLower.includes('/subscribe') || 
    cleanEndpointLower.includes('/unsubscribe') || 
    cleanEndpointLower.includes('/verify-email');

  // 1. Guardia previa contra solicitudes no autenticadas o tokens expirados en cliente (solo endpoints protegidos)
  if (!isKnownPublic && typeof window !== 'undefined') {
    if (!hasToken) {
      return null;
    }
    if (isTokenExpired(rawToken)) {
      console.warn(`[API/fetcher] Token JWT expirado para endpoint protegido ${endpoint}. Limpiando sesión...`);
      localStorage.clear();
      window.location.href = getMainDomainUrl('/login');
      return null;
    }
  }

  const headers: Record<string, string> = {};

  if (!(fetchOptions?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (!isKnownPublic && hasToken) {
    headers["Authorization"] = `Bearer ${rawToken}`;
  }

  // Normalización estricta de trailing slashes respetando Query Parameters (?) y Hashes (#)
  const [basePath, ...rest] = cleanEndpoint.split(/(?=[?#])/);
  const searchAndHash = rest.join('');
  const normalizedPath = (!basePath.endsWith('/') && !basePath.match(/\.[a-z0-9]+$/i))
    ? `${basePath}/`
    : basePath;
  const finalEndpoint = `${normalizedPath}${searchAndHash}`;

  const fullUrl = `${API_URL}${finalEndpoint}`;

  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(fullUrl, {
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
      });

      // Interceptor global de expiración de sesión (JWT rechazado por backend)
      if (res.status === 401 && !isKnownPublic && typeof window !== 'undefined') {
        if (hasToken) {
          localStorage.clear();
          window.location.href = getMainDomainUrl('/login');
        }
        return null;
      }

      // Manejo de códigos de respuesta con error (>= 400)
      if (!res.ok) {
        // Para errores 5xx del servidor y si quedan reintentos, reintentar con backoff
        if (res.status >= 500 && attempt < retries) {
          attempt++;
          const backoff = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        const error = await res.json().catch(() => ({}));
        let errMsg = error.detail || error.error || error.message;

        if (!errMsg && error && typeof error === 'object') {
          errMsg = Object.entries(error)
            .map(([field, msgs]) => {
              const messageStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${field}: ${messageStr}`;
            })
            .join(' | ');
        }
        throw new Error(errMsg || `HTTP Error ${res.status}`);
      }

      if (res.status === 204) return null;
      return await res.json();
    } catch (err: any) {
      if (attempt < retries && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        attempt++;
        const backoff = retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[API/fetcher] Fallo de red en ${cleanEndpoint}. Reintento ${attempt}/${retries} en ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
}

