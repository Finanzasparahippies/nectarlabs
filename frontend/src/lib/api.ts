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
 * Resuelve la URL absoluta del dominio principal del sistema de forma limpia.
 * Se utiliza para redirigir fuera de las Colmenas de los clientes (ej: mandar al /login central).
 */
export function getMainDomainUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const host = window.location.host;
  let mainDomain = 'nectarlabs.dev';
  if (host.includes('staging.nectarlabs.dev')) {
    mainDomain = 'staging.nectarlabs.dev';
  } else if (host.includes('nectarlabs.dev')) {
    mainDomain = 'nectarlabs.dev';
  } else if (host.includes('localhost')) {
    mainDomain = host.includes(':3002') ? 'localhost:3002' : 'localhost:3000';
  } else if (host.includes('127.0.0.1')) {
    mainDomain = host.includes(':3002') ? '127.0.0.1:3002' : '127.0.0.1:3000';
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (typeof window !== 'undefined') {
    console.log(`[API/fetcher] endpoint: ${endpoint}, isPublic: ${!!isPublic}, retries: ${retries}`);
  }

  const headers: Record<string, string> = {};

  if (!(fetchOptions?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (!isPublic && token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_URL}${cleanEndpoint}`;

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

      // Interceptor global de expiración de sesión (JWT inválido/caducado)
      if (res.status === 401 && !isPublic && typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = getMainDomainUrl('/login');
        throw new Error("Session expired. Please login again.");
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

