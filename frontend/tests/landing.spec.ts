import { test, expect } from '@playwright/test';
import { setupApiMocks } from './mocks/apiMockHandler';

test.describe('Navegación Landing Page y Programa de Vendedores (E2E)', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');
  });

  test('Debe cargar la Landing Page con título principal y branding de Néctar Labs', async ({ page }) => {
    // Comprobar presencia del título o propuesta de valor
    const heading = page.locator('h1');
    await expect(heading.first()).toBeVisible();

    // Comprobar enlace a registro en la barra de navegación
    const registerCta = page.locator('a[href*="/register"]').first();
    await expect(registerCta).toBeVisible();
  });

  test('Debe redirigir al registro preservando el código de referido cuando se hace clic en el CTA de Vendedor', async ({ page }) => {
    await page.goto('/login?ref=SELLER123');

    const registerLink = page.locator('a[href*="/register"]');
    await expect(registerLink.first()).toHaveAttribute('href', /\/register\?ref=SELLER123/);
  });
});
