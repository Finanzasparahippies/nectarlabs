# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tenants.spec.ts >> Ecosistema Multi-Tenant y Colmenas de Clientes (E2E) >> Debe cargar la vista de Colmena para un subdominio de cliente
- Location: tests/tenants.spec.ts:10:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/tenants/demo
Call log:
  - navigating to "http://localhost:3000/tenants/demo", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupApiMocks } from './mocks/apiMockHandler';
  3  | 
  4  | test.describe('Ecosistema Multi-Tenant y Colmenas de Clientes (E2E)', () => {
  5  | 
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await setupApiMocks(page);
  8  |   });
  9  | 
  10 |   test('Debe cargar la vista de Colmena para un subdominio de cliente', async ({ page }) => {
> 11 |     await page.goto('/tenants/demo');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/tenants/demo
  12 | 
  13 |     // Debe cargar el contenedor principal de la colmena o loader
  14 |     const tenantContainer = page.locator('body');
  15 |     await expect(tenantContainer).toBeVisible();
  16 |   });
  17 | });
  18 | 
```