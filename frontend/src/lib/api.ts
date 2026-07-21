// ==============================================================================
// CLIENTE HTTP CENTRAL (API RESOLVER & FETCH UTILITIES)
// Este archivo unifica la comunicación del Frontend Next.js hacia la API REST
// de Django, inyectando tokens JWT de autenticación y manejando errores globales.
// ==============================================================================

let resolvedApiUrl = "/api";

// Soporte para entornos de desarrollo en Codespaces de GitHub (redirige puertos automáticamente)
if (typeof window !== "undefined") {
  const origin = window.location.origin;
  if (origin.includes("github.dev")) {
    resolvedApiUrl = origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api";
  }
}

export const API_URL = resolvedApiUrl;

export interface FetcherOptions extends RequestInit {
  isPublic?: boolean;           // Indica si el endpoint se debe llamar sin cabecera Authorization
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
 * intercepta códigos HTTP 401 (sesión expirada) y formatea diccionarios de error.
 */
export async function fetcher(endpoint: string, options: FetcherOptions = {}) {
  const { isPublic, ...fetchOptions } = options;
  // Recuperar token JWT persistido en el cliente
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (typeof window !== 'undefined') {
    console.log(`[API/fetcher] endpoint: ${endpoint}, isPublic: ${!!isPublic}, token: ${token ? `${token.substring(0, 15)}...` : 'none'}`);
  }

  const headers: Record<string, string> = {};

  // No sobreescribir Content-Type si enviamos archivos (FormData) para permitir que
  // el navegador establezca los boundaries multipart/form-data correctos.
  if (!(fetchOptions?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Inyección condicional de la cabecera Bearer Token
  if (!isPublic && token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  // Ejecución de la consulta HTTP fetch
  const res = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...fetchOptions.headers,
    },
  });

  // Interceptor global de expiración de sesión (JWT inválido/caducado)
  if (res.status === 401 && !isPublic && typeof window !== 'undefined') {
    localStorage.clear();
    // Redirige al inicio de sesión en el dominio principal del sistema
    window.location.href = getMainDomainUrl('/login');
    throw new Error("Session expired. Please login again.");
  }

  // Manejo de códigos de respuesta con error (>= 400)
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    let errMsg = error.detail || error.error || error.message;

    // Si Django DRF devuelve un error de validación de formulario (objeto con claves/valores de campo)
    // los mapea a una cadena legible dividida por plecas (|) para renderizar en UI
    if (!errMsg && error && typeof error === 'object') {
      errMsg = Object.entries(error)
        .map(([field, msgs]) => {
          const messageStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          return `${field}: ${messageStr}`;
        })
        .join(' | ');
    }
    throw new Error(errMsg || "An error occurred");
  }

  // Respuesta exitosa vacía (204 No Content)
  if (res.status === 204) return null;
  return res.json();
}
