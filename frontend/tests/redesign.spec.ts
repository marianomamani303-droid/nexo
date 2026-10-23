import { test, expect } from '@playwright/test';
const person = {
  id: 'qa-user',
  name: 'Persona QA',
  handle: 'persona',
  email: 'qa@example.com',
  bio: 'Ideas fuera del molde',
  followersCount: 3,
  followingCount: 2,
};
const community = {
  id: 'qa-community',
  ownerId: person.id,
  name: 'Taller abierto',
  slug: 'taller',
  description: 'Un lugar para experimentar',
  category: 'Diseño',
  visibility: 'public',
  membersCount: 3,
  memberRole: 'owner',
};
const post = {
  id: 'qa-post',
  author: person,
  content: 'Una idea abre otra conversación.',
  createdAt: '2026-10-20T12:00:00Z',
  communityId: null,
  visibility: 'public',
  category: null,
  reactionsCount: 2,
  commentsCount: 0,
  viewerReaction: null,
  bookmarked: false,
};
async function fixture(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/session') return route.fulfill({ json: { user: person } });
    if (path === '/users/me' || path === '/users/qa-user') return route.fulfill({ json: person });
    if (path === '/communities/qa-community') return route.fulfill({ json: community });
    if (path === '/posts/qa-post') return route.fulfill({ json: post });
    let items: unknown[] = [];
    if (path === '/posts' || path === '/feed' || path === '/posts/bookmarks') items = [post];
    if (path === '/communities') items = [community];
    if (path === '/users') items = [person];
    return route.fulfill({ json: { items, nextCursor: null } });
  });
}
for (const width of [320, 375, 768, 1440])
  test(`rutas y responsive con sesión realista ${width}`, async ({ page }) => {
    await fixture(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
    });
    for (const path of [
      '/',
      '/explorar',
      '/comunidades',
      '/comunidades/qa-community',
      '/perfil',
      '/perfil/qa-user',
      '/notificaciones',
      '/mensajes',
      '/guardados',
      '/proyectos',
      '/publicacion/qa-post',
      '/crear',
      '/comunidades/nueva',
      '/configuracion',
      '/no-existe',
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1,main h2').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
    }
    await page.goto('/');
    await page.screenshot({ path: `test-results/nexo-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
test('publicar, comentarios, búsqueda, teclado y modal', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await page.getByLabel('Contenido de la publicación').fill('Nueva señal');
  let payload: unknown;
  await page.route('**/api/v1/posts', async (route) => {
    if (route.request().method() === 'POST') {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: post });
    }
    return route.fulfill({ json: { items: [post], nextCursor: null } });
  });
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByLabel('Contenido de la publicación')).toHaveValue('');
  expect(payload).toMatchObject({ content: 'Nueva señal' });
  await page.getByLabel('Ver comentarios').click();
  await expect(page.getByLabel('Escribir comentario')).toBeVisible();
  await page.getByRole('button', { name: 'Crear publicación', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Dale lugar a una idea' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('tab', { name: 'Para vos' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Siguiendo' })).toBeFocused();
  await page.getByLabel('Buscar en Nexo').fill('diseño');
  await page.getByLabel('Buscar en Nexo').press('Enter');
  await expect(page).toHaveURL(/q=dise/);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByLabel('Abrir navegación').click();
  await page
    .getByRole('dialog', { name: 'Tu espacio', exact: true })
    .getByRole('link', { name: 'Mensajes', exact: true })
    .click();
  await expect(page).toHaveURL('/mensajes');
});
test('tema, estados vacíos y recuperación de error', async ({ page }) => {
  await fixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/configuracion');
  await page.getByRole('radio', { name: 'Oscuro' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/');
  await page.screenshot({ path: 'test-results/nexo-dark.png', fullPage: true });
  await page.route('**/api/v1/posts', (route) =>
    route.fulfill({ status: 503, json: { message: 'Servicio temporalmente no disponible' } }),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await page.route('**/api/v1/posts', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Todavía no hay publicaciones.' })).toBeVisible();
});
