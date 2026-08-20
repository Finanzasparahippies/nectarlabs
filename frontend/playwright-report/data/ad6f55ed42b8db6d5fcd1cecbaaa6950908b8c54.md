# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cursos.spec.ts >> Curso de Python - Dashboard Interactivo (Enfoque A) >> Debe renderizar la teoría con resaltado de sintaxis (comentarios coloreados)
- Location: tests/cursos.spec.ts:28:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/cursos/ingeniero-python/index.html
Call log:
  - navigating to "http://localhost:3000/cursos/ingeniero-python/index.html", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupApiMocks } from './mocks/apiMockHandler';
  3  | 
  4  | test.describe('Curso de Python - Dashboard Interactivo (Enfoque A)', () => {
  5  |   
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await setupApiMocks(page);
  8  |     // Navegar directamente a la ruta pública del curso embebido con index.html para evitar ruteos 404 del dev server de Next.js
> 9  |     await page.goto('/cursos/ingeniero-python/index.html');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/cursos/ingeniero-python/index.html
  10 |   });
  11 | 
  12 |   test('Debe cargar el curso con título,Badge y los Módulos de la barra lateral', async ({ page }) => {
  13 |     // Verificar que cargue el nombre del módulo activo en el badge superior
  14 |     const badge = page.locator('#current-module-id');
  15 |     await expect(badge).toBeVisible();
  16 |     await expect(badge).toContainText('MÓDULO 01');
  17 | 
  18 |     // Verificar el título principal
  19 |     const title = page.locator('#current-module-title');
  20 |     await expect(title).toBeVisible();
  21 |     await expect(title).toContainText('Python Avanzado y Edge Cases');
  22 | 
  23 |     // Verificar la lista de módulos en el sidebar
  24 |     const modules = page.locator('#modules-list li');
  25 |     await expect(modules).toHaveCount(13); // Módulo 00 al Módulo 12
  26 |   });
  27 | 
  28 |   test('Debe renderizar la teoría con resaltado de sintaxis (comentarios coloreados)', async ({ page }) => {
  29 |     // Asegurar que la teoría se carga dinámicamente
  30 |     const teoriaContainer = page.locator('#teoria-container');
  31 |     await expect(teoriaContainer).toBeVisible();
  32 |     
  33 |     // El texto cargado debe contener palabras clave del README del módulo 01
  34 |     await expect(teoriaContainer).toContainText('Mutabilidad');
  35 | 
  36 |     // Comprobar que PrismJS aplicó las clases de resaltado sintáctico a los comentarios de código
  37 |     const commentToken = page.locator('#teoria-container pre code .token.comment');
  38 |     await expect(commentToken.first()).toBeVisible();
  39 |   });
  40 | 
  41 |   test('Debe permitir la navegación fluida entre pestañas (Teoría, Ejemplos, Ejercicios)', async ({ page }) => {
  42 |     // 1. Clic en la pestaña Ejemplos
  43 |     const tabEjemplos = page.locator('button[data-tab="tab-ejemplos"]');
  44 |     await tabEjemplos.click();
  45 |     await expect(page.locator('#tab-ejemplos')).toHaveClass(/active/);
  46 |     await expect(page.locator('#tab-teoria')).not.toHaveClass(/active/);
  47 | 
  48 |     // 2. Clic en la pestaña Ejercicios
  49 |     const tabEjercicios = page.locator('button[data-tab="tab-ejercicios"]');
  50 |     await tabEjercicios.click();
  51 |     await expect(page.locator('#tab-ejercicios')).toHaveClass(/active/);
  52 |   });
  53 | 
  54 |   test('Debe evaluar offline mostrando feedback de keywords si no está autenticado', async ({ page }) => {
  55 |     // Navegar a la pestaña de Ejercicios
  56 |     await page.locator('button[data-tab="tab-ejercicios"]').click();
  57 | 
  58 |     // El botón de evaluación debe estar presente
  59 |     const btnEvaluar = page.locator('#btn-evaluar-ejercicio');
  60 |     await expect(btnEvaluar).toBeVisible();
  61 |     await expect(btnEvaluar).toContainText('Ejecutar y Evaluar');
  62 | 
  63 |     // Esperar a que el editor CodeMirror esté listo en el DOM y expuesto
  64 |     await page.waitForFunction(() => (window as any).cmEditor !== undefined && (window as any).cmEditor !== null);
  65 | 
  66 |     // Escribir código válido para desencadenar la detección de palabras clave locales
  67 |     await page.evaluate(() => {
  68 |         (window as any).cmEditor.setValue(`
  69 | import functools
  70 | def mi_decorador(func):
  71 |     @functools.wraps(func)
  72 |     def wrapper(*args, **kwargs):
  73 |         return func(*args, **kwargs)
  74 |     return wrapper
  75 |         `);
  76 |     });
  77 | 
  78 |     // Simular clic en evaluar (sin token se evalúa offline de forma local)
  79 |     await btnEvaluar.click();
  80 | 
  81 |     // Debe mostrar la caja de resultados
  82 |     const resultadosBox = page.locator('#resultados-ejercicio');
  83 |     await expect(resultadosBox).toBeVisible();
  84 | 
  85 |     // Debe contener feedback de evaluación offline
  86 |     const feedback = page.locator('#resultado-feedback');
  87 |     await expect(feedback).toContainText('Evaluación offline');
  88 |   });
  89 | 
  90 | });
  91 | 
```