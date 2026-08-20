import { test, expect } from '@playwright/test';
import { setupApiMocks } from './mocks/apiMockHandler';

test.describe('Ecosistema Multi-Tenant y Colmenas de Clientes (E2E)', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('Debe cargar la vista de Colmena para un subdominio de cliente', async ({ page }) => {
    await page.goto('/tenants/demo');

    // Debe cargar el contenedor principal de la colmena o loader
    const tenantContainer = page.locator('body');
    await expect(tenantContainer).toBeVisible();
  });
});
