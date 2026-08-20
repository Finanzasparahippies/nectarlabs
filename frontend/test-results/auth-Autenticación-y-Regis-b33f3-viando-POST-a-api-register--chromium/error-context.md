# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Autenticación y Registro de Usuarios (E2E) >> Debe cargar la página de registro y completar el formulario enviando POST a /api/register/
- Location: tests/auth.spec.ts:19:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupApiMocks } from './mocks/apiMockHandler';
  3  | 
  4  | test.describe('Autenticación y Registro de Usuarios (E2E)', () => {
  5  |   
  6  |   test.beforeEach(async ({ page, context }) => {
  7  |     // 1. Limpieza de estado previa para garantizar aislamiento absoluto entre pruebas
  8  |     await context.clearCookies();
> 9  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_RESET at http://localhost:3000/
  10 |     await page.evaluate(() => {
  11 |       localStorage.clear();
  12 |       sessionStorage.clear();
  13 |     });
  14 | 
  15 |     // 2. Inicializar interceptores de red para simular el Backend REST
  16 |     await setupApiMocks(page);
  17 |   });
  18 | 
  19 |   test('Debe cargar la página de registro y completar el formulario enviando POST a /api/register/', async ({ page }) => {
  20 |     await page.goto('/register');
  21 | 
  22 |     // Comprobar elementos visuales principales
  23 |     await expect(page.locator('h1')).toContainText(/Crear Cuenta/i);
  24 |     
  25 |     // Rellenar campos del formulario de registro
  26 |     await page.fill('input[placeholder="usuario123"]', 'nuevousuario');
  27 |     await page.fill('input[placeholder="nombre@empresa.com"]', 'nuevo_usuario@nectarlabs.dev');
  28 |     
  29 |     const passwords = page.locator('input[type="password"]');
  30 |     await passwords.nth(0).fill('Password123!');
  31 |     await passwords.nth(1).fill('Password123!');
  32 | 
  33 |     // Enviar el formulario
  34 |     const submitBtn = page.locator('button[type="submit"]');
  35 |     await expect(submitBtn).toBeEnabled();
  36 |     await submitBtn.click();
  37 | 
  38 |     // Tras registro exitoso debe redirigir a /login
  39 |     await expect(page).toHaveURL(/\/login/);
  40 |   });
  41 | 
  42 |   test('Debe mostrar error de validación cuando las contraseñas no coinciden', async ({ page }) => {
  43 |     await page.goto('/register');
  44 | 
  45 |     await page.fill('input[placeholder="usuario123"]', 'usuarioerror');
  46 |     await page.fill('input[placeholder="nombre@empresa.com"]', 'usuario_error@nectarlabs.dev');
  47 |     
  48 |     const passwords = page.locator('input[type="password"]');
  49 |     await passwords.nth(0).fill('Password123!');
  50 |     await passwords.nth(1).fill('Diferente456!');
  51 | 
  52 |     await page.click('button[type="submit"]');
  53 | 
  54 |     // Debe mostrar el mensaje de error defensivo
  55 |     await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  56 |   });
  57 | 
  58 |   test('Debe permitir iniciar sesión en /login y guardar JWT token en localStorage', async ({ page }) => {
  59 |     await page.goto('/login');
  60 | 
  61 |     await page.fill('input[type="email"]', 'usuario_valido@nectarlabs.dev');
  62 |     await page.fill('input[type="password"]', 'Password123!');
  63 | 
  64 |     await page.click('button[type="submit"]');
  65 | 
  66 |     // Verificar que se guarde el JWT token en localStorage tras la autenticación
  67 |     await page.waitForTimeout(500);
  68 |     const token = await page.evaluate(() => localStorage.getItem('token'));
  69 |     expect(token).toBeTruthy();
  70 |   });
  71 | });
  72 | 
```