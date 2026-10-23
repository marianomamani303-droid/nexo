import { test, expect } from '@playwright/test';
const user = { id: 'test-id', email: 'test@example.com', handle: 'test', name: 'Persona Prueba' };
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/posts', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ status: 401, json: { message: 'Iniciá sesión.' } }),
  );
});
test('login conecta, muestra identidad y cierra sesión', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: user.email, password: 'prueba-12345' });
    expect(route.request().headers()['x-nexo-csrf']).toBe('1');
    await route.fulfill({ json: { user } });
  });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba-12345');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: user.name })).toBeVisible();
  await page.route('**/api/v1/auth/logout', (route) => route.fulfill({ status: 204 }));
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL('/login');
});
test('registro valida confirmación y crea cuenta', async ({ page }) => {
  await page.route('**/api/v1/auth/register', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: user.name,
      email: user.email,
      password: 'prueba-12345',
    });
    await route.fulfill({ status: 201, json: { user } });
  });
  await page.goto('/registro');
  await page.getByLabel('Nombre completo').fill(user.name);
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba-12345');
  await page.getByLabel('Repetí tu contraseña').fill('otra-clave');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  await page.getByLabel('Repetí tu contraseña').fill('prueba-12345');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page).toHaveURL('/');
});
test('muestra errores del backend', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({ status: 401, json: { message: 'Correo o contraseña incorrectos.' } }),
  );
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos.');
});
