import { test, expect, type Page } from '@playwright/test';
import { DEFAULT_STOCK_LOOKUPS } from '@gt/shared';

async function widgets(page: Page) {
  for (const [pattern, name] of [
    ['**/turnstile/v0/api.js*', 'turnstile'],
    ['**/recaptcha/api.js*', 'grecaptcha'],
  ])
    await page.route(pattern!, (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `window.${name}={ready:fn=>fn(),render:(element,options)=>{const button=document.createElement('button');button.type='button';button.textContent='Robot doğrulamasını tamamla';button.onclick=()=>options.callback('verified-widget-token');element.appendChild(button);return '1';},remove:()=>{}};`,
      }),
    );
}
const user = { id: '1', displayName: 'Yunus', email: 'user@example.com', avatarUrl: null };
for (const width of [390, 1440])
  test(`entegrasyon ayarları ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await widgets(page);
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path === '/api/auth/me') body = { user };
      else if (path === '/api/hesap')
        body = {
          business: { id: 1, name: 'İşletme' },
          user: { id: 1, name: 'Yunus', email: user.email },
          owner: true,
          permissions: [],
        };
      else if (path.endsWith('/test')) {
        expect(route.request().postDataJSON()?.challengeToken ?? '').toBe(
          path.includes('whatsapp') ? '' : 'verified-widget-token',
        );
        body = { message: 'Bağlantı doğrulandı.' };
      } else if (path.includes('/ayarlar/'))
        body = path.endsWith('/whatsapp')
          ? {
              values: {
                enabled: 'true',
                appId: '12345678',
                phoneNumberId: '987654321',
                apiVersion: 'v25.0',
              },
              configured: ['appSecret', 'accessToken', 'verifyToken'],
              webhookUrl: 'https://pos.example.com/api/webhooks/whatsapp/1',
            }
          : { values: { siteKey: 'public-site', enabled: 'false' }, configured: ['secretKey'] };
      await route.fulfill({ json: body });
    });
    for (const section of ['cloudflare', 'recaptcha', 'whatsapp']) {
      await page.goto(`/uygulama/ayarlar/${section}`);
      if (section === 'whatsapp') {
        await expect(page.getByLabel('Meta Uygulama Kimliği', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Onaylı OTP Şablon Adı', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Kayıtlı Bağlantıyı Test Et', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Robot doğrulamasını tamamla' }).click();
        await page.getByRole('button', { name: 'Doğrulamayı Test Et', exact: true }).click();
      }
      await expect(page.getByText('Bağlantı doğrulandı.', { exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath(`${section}.png`), fullPage: true });
    }
  });

for (const provider of ['cloudflare', 'recaptcha'])
  test(`${provider} girişte token olmadan geçilemez`, async ({ page }) => {
    await widgets(page);
    let loggedIn = false;
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me')
        return route.fulfill({
          status: loggedIn ? 200 : 401,
          json: loggedIn ? { user } : { error: { code: 'UNAUTHENTICATED', message: '' } },
        });
      let body: unknown = [];
      if (path === '/api/auth/email/start' || path === '/api/auth/login') {
        if (route.request().postDataJSON().challengeToken !== 'verified-widget-token')
          return route.fulfill({
            status: 400,
            json: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Robot doğrulamasını tamamlayın.',
                challenge: { provider, siteKey: 'public-site' },
              },
            },
          });
        if (path.endsWith('/login')) {
          loggedIn = true;
          body = { user };
        } else body = { step: 'password' };
      } else if (path === '/api/hesap')
        body = {
          business: { id: 1, name: 'Test' },
          user: { id: 1, name: 'Test', email: user.email },
          owner: true,
          permissions: [],
        };
      else if (path === '/api/stok/secenekler') body = DEFAULT_STOCK_LOOKUPS;
      else if (path === '/api/auth/providers') body = { google: false, apple: false };
      await route.fulfill({ json: body });
    });
    await page.goto('/login/e-posta');
    await page.getByLabel('E-Posta', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await page.getByRole('button', { name: 'Robot doğrulamasını tamamla' }).click();
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await page.getByLabel('Şifre', { exact: true }).fill('password-123');
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await page.getByRole('button', { name: 'Robot doğrulamasını tamamla' }).click();
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await expect(page).toHaveURL(/\/uygulama\/stok-karti\/yeni$/);
  });
