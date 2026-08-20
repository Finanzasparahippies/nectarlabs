import { Page, Route } from '@playwright/test';

/**
 * Handler de interceptores de red para Playwright (Mocks de API REST).
 * Evita el error ECONNREFUSED interceptando llamadas a /api/* y devuelve respuestas deterministas.
 * Incluye validación de regresión para trailing slashes en peticiones POST/PUT/PATCH.
 */
export async function setupApiMocks(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;

    // 1. Validación de Regresión de Trailing Slash en peticiones mutativas (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!pathname.endsWith('/') && !pathname.match(/\.[a-z0-9]+$/i)) {
        console.warn(`[PLAYWRIGHT MOCK REGRESSION FAIL] ${method} request to '${pathname}' missing trailing slash!`);
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: "RuntimeError: You called this URL via POST, but the URL doesn't end in a slash and you have APPEND_SLASH set.",
          }),
        });
      }
    }

    // 2. Mocks específicos por Endpoint
    if (pathname.includes('/register/')) {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          email: 'testuser@example.com',
          username: 'testuser',
          role: 'CUSTOMER',
          message: 'Usuario registrado exitosamente',
        }),
      });
    }

    if (pathname.includes('/token/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock_jwt_access_token_xyz123',
          refresh: 'mock_jwt_refresh_token_abc456',
        }),
      });
    }

    if (pathname.includes('/users/me/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@nectarlabs.dev',
          username: 'admin',
          role: 'SUPERADMIN',
        }),
      });
    }

    if (pathname.includes('/courses/modules/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '01',
          title: 'Python Avanzado y Edge Cases',
          content: 'Contenido teórico con Mutabilidad y sintaxis coloreada.',
        }),
      });
    }

    if (pathname.includes('/tenants/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'tenant-123',
          name: 'Colmena Demo',
          subdomain: 'demo',
          theme: 'dark',
        }),
      });
    }

    if (pathname.includes('/support-chats/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chat-999',
          status: 'OPEN',
          messages: [],
        }),
      });
    }

    // 3. Fallback genérico para cualquier otro endpoint /api/
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', mocked: true }),
    });
  });
}
