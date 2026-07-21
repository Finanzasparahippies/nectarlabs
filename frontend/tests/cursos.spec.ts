import { test, expect } from '@playwright/test';

test.describe('Curso de Python - Dashboard Interactivo (Enfoque A)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar directamente a la ruta pública del curso embebido con index.html para evitar ruteos 404 del dev server de Next.js
    await page.goto('/cursos/ingeniero-python/index.html');
  });

  test('Debe cargar el curso con título,Badge y los Módulos de la barra lateral', async ({ page }) => {
    // Verificar que cargue el nombre del módulo activo en el badge superior
    const badge = page.locator('#current-module-id');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('MÓDULO 01');

    // Verificar el título principal
    const title = page.locator('#current-module-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Python Avanzado y Edge Cases');

    // Verificar la lista de módulos en el sidebar
    const modules = page.locator('#modules-list li');
    await expect(modules).toHaveCount(13); // Módulo 00 al Módulo 12
  });

  test('Debe renderizar la teoría con resaltado de sintaxis (comentarios coloreados)', async ({ page }) => {
    // Asegurar que la teoría se carga dinámicamente
    const teoriaContainer = page.locator('#teoria-container');
    await expect(teoriaContainer).toBeVisible();
    
    // El texto cargado debe contener palabras clave del README del módulo 01
    await expect(teoriaContainer).toContainText('Mutabilidad');

    // Comprobar que PrismJS aplicó las clases de resaltado sintáctico a los comentarios de código
    const commentToken = page.locator('#teoria-container pre code .token.comment');
    await expect(commentToken.first()).toBeVisible();
  });

  test('Debe permitir la navegación fluida entre pestañas (Teoría, Ejemplos, Ejercicios)', async ({ page }) => {
    // 1. Clic en la pestaña Ejemplos
    const tabEjemplos = page.locator('button[data-tab="tab-ejemplos"]');
    await tabEjemplos.click();
    await expect(page.locator('#tab-ejemplos')).toHaveClass(/active/);
    await expect(page.locator('#tab-teoria')).not.toHaveClass(/active/);

    // 2. Clic en la pestaña Ejercicios
    const tabEjercicios = page.locator('button[data-tab="tab-ejercicios"]');
    await tabEjercicios.click();
    await expect(page.locator('#tab-ejercicios')).toHaveClass(/active/);
  });

  test('Debe evaluar offline mostrando feedback de keywords si no está autenticado', async ({ page }) => {
    // Navegar a la pestaña de Ejercicios
    await page.locator('button[data-tab="tab-ejercicios"]').click();

    // El botón de evaluación debe estar presente
    const btnEvaluar = page.locator('#btn-evaluar-ejercicio');
    await expect(btnEvaluar).toBeVisible();
    await expect(btnEvaluar).toContainText('Ejecutar y Evaluar');

    // Esperar a que el editor CodeMirror esté listo en el DOM y expuesto
    await page.waitForFunction(() => (window as any).cmEditor !== undefined && (window as any).cmEditor !== null);

    // Escribir código válido para desencadenar la detección de palabras clave locales
    await page.evaluate(() => {
        (window as any).cmEditor.setValue(`
import functools
def mi_decorador(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
        `);
    });

    // Simular clic en evaluar (sin token se evalúa offline de forma local)
    await btnEvaluar.click();

    // Debe mostrar la caja de resultados
    const resultadosBox = page.locator('#resultados-ejercicio');
    await expect(resultadosBox).toBeVisible();

    // Debe contener feedback de evaluación offline
    const feedback = page.locator('#resultado-feedback');
    await expect(feedback).toContainText('Evaluación offline');
  });

});
