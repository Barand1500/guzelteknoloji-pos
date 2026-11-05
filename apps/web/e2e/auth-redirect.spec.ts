import { expect, test } from '@playwright/test';
import { DEFAULT_STOCK_LOOKUPS } from '@gt/shared';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/stok/secenekler', (route) =>
    route.fulfill({ json: DEFAULT_STOCK_LOOKUPS }),
  );
});
for (const width of [390, 1440]) {
  test.describe('login redirect ' + width, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const method of ['password', 'code'] as const) {
      test(method + ' opens stock screen without test access', async ({ page }) => {
        const user = {
          id: 'verified-user',
          email: 'user@example.com',
          displayName: 'Test',
          avatarUrl: null,
        };
        await page.route('**/api/auth/me', (route) =>
          route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED', message: '' } } }),
        );
        await page.route('**/api/auth/email/start', (route) =>
          route.fulfill({
            json:
              method === 'password'
                ? { step: 'password' }
                : { step: 'code', resendAfterSeconds: 60, expiresInSeconds: 600 },
          }),
        );
        await page.route('**/api/auth/login', (route) => route.fulfill({ json: { user } }));
        await page.route('**/api/auth/email/verify', (route) => route.fulfill({ json: { user } }));
        await page.goto('/login/e-posta');
        await page.getByLabel('E-Posta', { exact: true }).fill(user.email);
        await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
        await page
          .getByLabel(method === 'password' ? 'Şifre' : 'Doğrulama Kodu', { exact: true })
          .fill(method === 'password' ? 'Test-password-123' : '123456');
        await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
        await expect(page).toHaveURL(/\/uygulama\/stok-karti\/yeni$/);
        await expect(page.getByRole('heading', { name: 'Yeni Stok Kartı' })).toBeVisible();
        expect(await page.evaluate(() => sessionStorage.getItem('gt-dev-access'))).toBeNull();
      });
    }
    test('existing session opens stock screen on return from social login', async ({ page }) => {
      await page.route('**/api/auth/me', (route) =>
        route.fulfill({
          json: {
            user: {
              id: 'social-user',
              email: 'user@example.com',
              displayName: null,
              avatarUrl: null,
            },
          },
        }),
      );
      await page.goto('/login');
      await expect(page).toHaveURL(/\/uygulama\/stok-karti\/yeni$/);
      await expect(page.getByRole('heading', { name: 'Yeni Stok Kartı' })).toBeVisible();
    });
  });
}
