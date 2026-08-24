// ==============================================================================
// CLIENTE HTTP CENTRAL (API RESOLVER & FETCH UTILITIES)
// Este archivo unifica la comunicación del Frontend Next.js hacia la API REST
// de Django, inyectando tokens JWT de autenticación y manejando errores globales.
// ==============================================================================

/**
 * Resuelve dinámicamente la URL base de la API REST respetando el contexto (SSR vs Browser),
 * variables de entorno (NEXT_PUBLIC_API_URL, INTERNAL_API_URL) y entornos en la nube / proxy.
 */
export function getApiBaseUrl(): string {
  // 1. Contexto SSR (Server-Side Rendering dentro de Node.js / Docker)
  if (typeof window === 'undefined') {
    const ssrUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://backend:8000/api";
    return ssrUrl.replace(/\/+$/, '');
  }

  // 2. Variable explícita de entorno para el cliente
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const cleanEnv = envUrl.trim().replace(/\/+$/, '');
    if (cleanEnv.startsWith('http://') || cleanEnv.startsWith('https://')) {
      return cleanEnv;
    }
    if (cleanEnv.startsWith('/')) {
      return cleanEnv;
    }
  }

  // 3. Navegador (Local, Staging, Producción, Codespaces):
  // Usar la ruta relativa /api para aprovechar el proxy perimetral del origen activo (Next.js rewrites / Nginx)
  return "/api";
}

export const API_URL = getApiBaseUrl();

export interface FetcherOptions extends RequestInit {
  isPublic?: boolean;           // Indica si el endpoint se debe llamar sin cabecera Authorization
  retries?: number;             // Número de reintentos automáticos ante fallo de red (default: 0)
  retryDelay?: number;          // Demora inicial en ms para reintentos con backoff exponencial (default: 500)
}

/**
 * Obtiene el token de autenticación JWT desde localStorage o cookies en el cliente de forma segura.
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const localToken = localStorage.getItem('token');
    if (localToken && localToken !== 'null' && localToken !== 'undefined' && localToken.trim() !== '') {
      return localToken;
    }
  } catch { }

  try {
    const match = document.cookie.match(/(?:^|; )\s*token\s*=\s*([^;]+)/);
    if (match && match[1] && match[1] !== 'null' && match[1] !== 'undefined' && match[1].trim() !== '') {
      return decodeURIComponent(match[1]);
    }
  } catch { }

  return null;
}

/**
 * Decodifica la sección payload de un token JWT para verificar si ya expiró (exp).
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') return true;
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
  const protocol = window.location.protocol;
  const host = window.location.host; // Preserva el host y puerto activo (ej: localhost:3002, nectarlabs.localhost:3002)
  const normalizedPath = path.startsWith('/') ? path : '/' + path;

  // Entornos de desarrollo local (localhost, 127.0.0.1, nectarlabs.localhost o subdominios *.localhost)
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const baseHost = host.includes('nectarlabs.localhost') ? `nectarlabs.localhost${port}` : `localhost${port}`;
    return `${protocol}//${baseHost}${normalizedPath}`;
  }

  // Entorno de Staging (subdominios colmena redirigen a staging principal)
  if (host.includes('staging.nectarlabs.dev')) {
    return `${protocol}//staging.nectarlabs.dev${normalizedPath}`;
  }

  // Entorno de Producción (subdominios colmena redirigen a producción principal)
  if (host.includes('nectarlabs.dev')) {
    return `${protocol}//nectarlabs.dev${normalizedPath}`;
  }

  // Fallback dinámico para proxies o dominios personalizados
  return `${protocol}//${host}${normalizedPath}`;
}

/**
 * Envoltorio (wrapper) de la API Fetch nativa.
 * Agrega automáticamente las cabeceras requeridas, token JWT de localStorage/cookies,
 * intercepta códigos HTTP 401 (sesión expirada), formatea errores y soporta
 * reintentos exponenciales configurables ante fallos de red.
 */
export async function fetcher(endpoint: string, options: FetcherOptions = {}): Promise<any> {
  const { isPublic, retries = 0, retryDelay = 500, ...fetchOptions } = options;
  const rawToken = typeof window !== 'undefined' ? getStoredToken() : null;
  const hasToken = rawToken && !isTokenExpired(rawToken);

  const isAbsoluteUrl = /^https?:\/\//i.test(endpoint);

  let cleanEndpoint = endpoint;
  if (!isAbsoluteUrl) {
    cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith("/api/")) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api\//, "/");
    }
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
    cleanEndpointLower.includes('/verify-email') ||
    cleanEndpointLower.includes('/tenants') ||
    cleanEndpointLower.includes('/plans') ||
    cleanEndpointLower.includes('/addons');

  // 1. Guardia previa contra solicitudes no autenticadas o tokens expirados en cliente (solo endpoints protegidos)
  if (!isKnownPublic && typeof window !== 'undefined') {
    if (!rawToken || !hasToken) {
      if (rawToken && isTokenExpired(rawToken)) {
        console.warn(`[API/fetcher] Token JWT expirado para endpoint protegido ${endpoint}. Limpiando sesión...`);
        try {
          localStorage.clear();
          document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        } catch { }
        window.location.href = getMainDomainUrl('/login');
      }
      return null;
    }
  }

  const headers: Record<string, string> = {};

  if (!(fetchOptions?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (hasToken && rawToken) {
    headers["Authorization"] = `Bearer ${rawToken}`;
  }

  let fullUrl = '';
  if (isAbsoluteUrl) {
    fullUrl = cleanEndpoint;
  } else {
    // Normalización estricta de trailing slashes respetando Query Parameters (?) y Hashes (#)
    const [basePath, ...rest] = cleanEndpoint.split(/(?=[?#])/);
    const searchAndHash = rest.join('');
    const hasFileExtension = /\.[a-z0-9]+$/i.test(basePath);
    const normalizedPath = (!basePath.endsWith('/') && !hasFileExtension)
      ? `${basePath}/`
      : basePath;
    const finalEndpoint = `${normalizedPath}${searchAndHash}`;

    // Resolución dinámica de la URL base
    const baseUrl = getApiBaseUrl();
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanPath = finalEndpoint.startsWith('/') ? finalEndpoint : `/${finalEndpoint}`;

    // Prevenir duplicación de prefijo /api si la URL base y el endpoint ambos lo contienen
    if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
      fullUrl = `${cleanBase}${cleanPath.slice(4)}`;
    } else {
      fullUrl = `${cleanBase}${cleanPath}`;
    }
  }

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
          try {
            localStorage.clear();
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          } catch { }
          window.location.href = getMainDomainUrl('/login');
        }
        return null;
      }

      // Manejo de códigos de respuesta con error (>= 400)
      if (!res.ok) {
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
      if (attempt < retries && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
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
