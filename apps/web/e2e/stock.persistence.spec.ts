import { expect, test } from '@playwright/test';

// check-stock-db.ts ayrı bir MySQL veritabanı ve gerçek API başlatır; bu testler sahte kayıt kullanmaz.
const api = process.env.STOCK_TEST_API_URL;
const token = process.env.STOCK_TEST_TOKEN;
test.skip(!api || !token, 'Gerçek MySQL testi için db:test:stock:browser komutunu kullanın.');

for (const width of [320, 390, 768, 1440]) {
  test.describe('Kalıcı stok kaydı ' + width, () => {
    test.use({ viewport: { width, height: 900 } });
    test('formdan MySQL’e kaydeder ve API üzerinden geri okur', async ({ page, context }) => {
      await context.addCookies([
        { name: 'gt_session', value: token!, domain: 'localhost', path: '/' },
      ]);
      await page.route('**/api/**', async (route) => {
        const response = await route.fetch({ url: api + new URL(route.request().url()).pathname });
        await route.fulfill({ response });
      });
      await page.goto('/uygulama/stok-karti/yeni');
      const code = 'BROWSER-' + width + '-' + Date.now();
      await page.getByLabel('Ürün Kodu', { exact: true }).fill(code);
      await page.getByLabel('Ürün Adı', { exact: true }).fill('Tarayıcıdan Kalıcı Ürün');
      await expect(
        page.getByText('Test Kullanıcısı · Deneme verileriyle çalışıyorsunuz.'),
      ).toHaveCount(0);
      if (width < 1280) {
        await page.getByRole('tab', { name: 'Fiyat', exact: true }).click();
        for (const digit of ['1', '2', '0'])
          await page.getByRole('button', { name: digit, exact: true }).click();
      } else {
        await page.getByLabel('Satış Fiyatı', { exact: true }).fill('120');
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      await page.screenshot({
        path: 'e2e/.screenshots/stok-kayit-' + width + '.png',
        fullPage: true,
      });
      const savedResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/stok/kartlar') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
      const response = await savedResponse;
      expect(response.status()).toBe(201);
      const { id } = (await response.json()) as { id: string };
      await expect(page.getByText('Stok kartı kaydedildi!', { exact: true })).toBeVisible();
      const card = await page.evaluate(async (cardId) => {
        const result = await fetch('/api/stok/kartlar/' + cardId);
        return (await result.json()) as {
          code: string;
          name: string;
          units: Record<
            string,
            { sale: { amount: string; vatRate: string; vatIncluded: boolean } }[]
          >;
        };
      }, id);
      expect(card.code).toBe(code);
      expect(card.name).toBe('Tarayıcıdan Kalıcı Ürün');
      const sale = card.units.fiyat![0]!.sale;
      expect(sale?.amount).toBe('120');
      expect(sale.vatRate).toBe('20');
      expect(sale.vatIncluded).toBe(false);
    });
  });
}
