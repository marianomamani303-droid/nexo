import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session'))
      return route.fulfill({
        json: { user: { id: 'qa', name: 'Persona', email: 'qa@example.com', handle: 'persona' } },
      });
    return route.fulfill({ json: { items: [], nextCursor: null } });
  });
});

test('preferencias persisten y el movimiento reducido deja el contenido visible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/configuracion');
  await page.getByRole('radio', { name: 'Oscuro' }).check();
  await page.getByRole('switch', { name: 'Vista compacta' }).click();
  await page.getByRole('switch', { name: 'Reducir movimiento' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByRole('switch', { name: 'Vista compacta' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Todavía no hay publicaciones.' })).toBeVisible();
  expect(
    await page
      .locator('[data-reveal]')
      .evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity === '1'),
      ),
  ).toBe(true);
});

test('el modal contiene el foco y lo devuelve al cerrar', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Crear publicación', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Dale lugar a una idea' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Cerrar ventana').focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
