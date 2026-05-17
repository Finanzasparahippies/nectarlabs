export const API_URL = "/api";

export async function fetcher(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Solo agregar Authorization si el token existe y no es la cadena "null" o "undefined"
  if (token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const res = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });


  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.clear();
    window.location.href = '/login';
    throw new Error("Session expired. Please login again.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "An error occurred");
  }

  return res.json();
}
