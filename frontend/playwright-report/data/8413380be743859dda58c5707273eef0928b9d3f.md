# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Navegación Landing Page y Programa de Vendedores (E2E) >> Debe redirigir al registro preservando el código de referido cuando se hace clic en el CTA de Vendedor
- Location: tests/landing.spec.ts:21:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupApiMocks } from './mocks/apiMockHandler';
  3  | 
  4  | test.describe('Navegación Landing Page y Programa de Vendedores (E2E)', () => {
  5  |   
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await setupApiMocks(page);
> 8  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  9  |   });
  10 | 
  11 |   test('Debe cargar la Landing Page con título principal y branding de Néctar Labs', async ({ page }) => {
  12 |     // Comprobar presencia del título o propuesta de valor
  13 |     const heading = page.locator('h1');
  14 |     await expect(heading.first()).toBeVisible();
  15 | 
  16 |     // Comprobar enlace a registro en la barra de navegación
  17 |     const registerCta = page.locator('a[href*="/register"]').first();
  18 |     await expect(registerCta).toBeVisible();
  19 |   });
  20 | 
  21 |   test('Debe redirigir al registro preservando el código de referido cuando se hace clic en el CTA de Vendedor', async ({ page }) => {
  22 |     await page.goto('/login?ref=SELLER123');
  23 | 
  24 |     const registerLink = page.locator('a[href*="/register"]');
  25 |     await expect(registerLink.first()).toHaveAttribute('href', /\/register\?ref=SELLER123/);
  26 |   });
  27 | });
  28 | 
```