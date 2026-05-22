let resolvedApiUrl = "/api";

if (typeof window !== "undefined") {
  const origin = window.location.origin;
  if (origin.includes("github.dev")) {
    resolvedApiUrl = origin.replace("-3000", "-8080").replace("-3002", "-8080") + "/api";
  }
}

export const API_URL = resolvedApiUrl;

export interface FetcherOptions extends RequestInit {
  isPublic?: boolean;
}

export async function fetcher(endpoint: string, options: FetcherOptions = {}) {
  const { isPublic, ...fetchOptions } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Solo agregar Authorization si no es público, el token existe y no es la cadena "null" o "undefined"
  if (!isPublic && token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const res = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...fetchOptions.headers,
    },
  });


  if (res.status === 401 && !isPublic && typeof window !== 'undefined') {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error("Session expired. Please login again.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    let errMsg = error.message || error.detail;
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

  return res.json();
}
