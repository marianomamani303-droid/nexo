import { test, expect } from '@playwright/test';
for (const width of [320, 768, 1440]) {
  test(`acceso responsive ${width}`, async ({ page }) => {
    await page.route('**/api/v1/auth/session', (r) =>
      r.fulfill({ status: 401, json: { message: 'Iniciá sesión.' } }),
    );
    await page.setViewportSize({ width, height: 950 });
    for (const path of ['/login', '/registro']) {
      await page.goto(path);
      await expect(page.getByLabel('Correo electrónico')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    if (width === 1440)
      await page.screenshot({ path: 'test-results/nexo-register.png', fullPage: true });
  });
}
