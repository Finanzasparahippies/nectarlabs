import { test, expect } from '@playwright/test';
import { setupApiMocks } from './mocks/apiMockHandler';

test.describe('Autenticación y Registro de Usuarios (E2E)', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // 1. Limpieza de estado previa para garantizar aislamiento absoluto entre pruebas
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 2. Inicializar interceptores de red para simular el Backend REST
    await setupApiMocks(page);
  });

  test('Debe cargar la página de registro y completar el formulario enviando POST a /api/register/', async ({ page }) => {
    await page.goto('/register');

    // Comprobar elementos visuales principales
    await expect(page.locator('h1')).toContainText(/Crear Cuenta/i);
    
    // Rellenar campos del formulario de registro
    await page.fill('input[placeholder="usuario123"]', 'nuevousuario');
    await page.fill('input[placeholder="nombre@empresa.com"]', 'nuevo_usuario@nectarlabs.dev');
    
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill('Password123!');
    await passwords.nth(1).fill('Password123!');

    // Enviar el formulario
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Tras registro exitoso debe redirigir a /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('Debe mostrar error de validación cuando las contraseñas no coinciden', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder="usuario123"]', 'usuarioerror');
    await page.fill('input[placeholder="nombre@empresa.com"]', 'usuario_error@nectarlabs.dev');
    
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill('Password123!');
    await passwords.nth(1).fill('Diferente456!');

    await page.click('button[type="submit"]');

    // Debe mostrar el mensaje de error defensivo
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  });

  test('Debe permitir iniciar sesión en /login y guardar JWT token en localStorage', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'usuario_valido@nectarlabs.dev');
    await page.fill('input[type="password"]', 'Password123!');

    await page.click('button[type="submit"]');

    // Verificar que se guarde el JWT token en localStorage tras la autenticación
    await page.waitForTimeout(500);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
