import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { stockFixture } from '../../api/src/tests/stock.fixture';

const api = process.env.STOCK_TEST_API_URL;
const token = process.env.STOCK_TEST_TOKEN;
test.skip(!api || !token, 'Gerçek MySQL için db:test:stock:browser çalıştırın.');

for (const width of [390, 768, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`Dört kalıcı ekran ${width} ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme });
      test('ürün, kategori, fırsat ve özellik yenilenince aynı kayıtlardan açılır', async ({
        page,
        context,
        request,
      }) => {
        test.setTimeout(90000);
        await context.addCookies([
          { name: 'gt_session', value: token!, domain: 'localhost', path: '/' },
        ]);
        await page.route('**/api/**', async (route) => {
          const url = new URL(route.request().url());
          const response = await route.fetch({ url: api + url.pathname + url.search });
          await route.fulfill({ response });
        });
        const headers = { Cookie: 'gt_session=' + token, Origin: 'http://localhost:5175' };
        const suffix = `${width}-${colorScheme}-${Date.now()}`;
        const draft = stockFixture();
        draft.code = 'KATALOG-' + suffix;
        draft.name = 'Kalıcı ürün ' + suffix;
        draft.units.fiyat![0]!.barcodes = [];
        const created = await request.post(api + '/api/stok/kartlar', {
          headers,
          data: { draft, requestId: randomUUID() },
        });
        expect(created.status()).toBe(201);
        const card = (await created.json()) as { id: string };
        const categoryName = 'Kategori ' + suffix;
        const dealName = 'Fırsat ' + suffix;
        const templateName = 'Şablon ' + suffix;
        const screenshot = async (name: string) => {
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          ).toBeLessThanOrEqual(0);
          await page.screenshot({
            path: `e2e/.screenshots/katalog-${width}-${colorScheme}-${name}.png`,
            fullPage: true,
          });
        };

        await page.goto('/uygulama/kategoriler');
        await page.getByRole('button', { name: 'Kategori Ekle', exact: true }).first().click();
        const categoryForm = page.getByRole('dialog', { name: 'Kategori Ekle', exact: true });
        await categoryForm.getByLabel('Kategori Adı', { exact: true }).fill(categoryName);
        await screenshot('kategori-form');
        await categoryForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
        await expect(categoryForm).toHaveCount(0);
        await page.reload();
        await page.getByRole('searchbox', { name: 'Kategori ara' }).fill(categoryName);
        await page.getByRole('button', { name: categoryName + ' işlemleri', exact: true }).click();
        await page.getByRole('button', { name: 'Ürünlere Tanımla', exact: true }).click();
        const categoryPanel = page.getByRole('dialog', {
          name: categoryName + ' · Ürünler',
          exact: true,
        });
        await categoryPanel.getByRole('tab', { name: 'Ürün Ekle', exact: true }).click();
        await categoryPanel.getByRole('radio', { name: /^Tümü/ }).click();
        await categoryPanel
          .getByRole('searchbox', { name: 'Eklenecek ürünü ara' })
          .fill(draft.code);
        await categoryPanel
          .getByRole('checkbox', { name: draft.name + ' ürününü seç', exact: true })
          .click();
        await categoryPanel.getByRole('button', { name: 'Ekle', exact: true }).click();
        await expect(
          categoryPanel.getByRole('tab', { name: 'Bu Kategoride (1)', exact: true }),
        ).toHaveAttribute('aria-selected', 'true');
        await screenshot('kategori-urun');
        await page.keyboard.press('Escape');

        await page.goto('/uygulama/urunler/firsatlar');
        await page.getByRole('button', { name: 'Fırsat Ekle', exact: true }).first().click();
        const dealForm = page.getByRole('dialog', { name: 'Fırsat Ekle', exact: true });
        await dealForm.getByLabel('Fırsat Adı', { exact: true }).fill(dealName);
        await dealForm.getByLabel('İkon dosyası seç').setInputFiles({
          name: 'rozet.svg',
          mimeType: 'image/svg+xml',
          buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>',
          ),
        });
        await screenshot('firsat-form');
        await dealForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
        await expect(dealForm).toHaveCount(0);
        await page.reload();
        await page.getByRole('searchbox', { name: 'Fırsat ara' }).fill(dealName);
        const editDeal = page.getByRole('button', {
          name: dealName + ' fırsatını düzenle',
          exact: true,
        });
        if (width >= 768) await editDeal.dblclick();
        else await editDeal.click();
        await page
          .getByRole('dialog', { name: 'Fırsatı Düzenle', exact: true })
          .getByRole('button', { name: /^Ürünler/ })
          .click();
        const dealPanel = page.getByRole('dialog', { name: dealName + ' · Ürünler', exact: true });
        await dealPanel.getByRole('tab', { name: 'Ürün Ekle', exact: true }).click();
        await dealPanel.getByRole('searchbox', { name: 'Eklenecek ürünü ara' }).fill(draft.code);
        await dealPanel
          .getByRole('checkbox', { name: draft.name + ' ürününü seç', exact: true })
          .click();
        await dealPanel.getByRole('button', { name: 'Ekle', exact: true }).click();
        await expect(
          dealPanel.getByRole('tab', { name: 'Bu Fırsatta (1)', exact: true }),
        ).toHaveAttribute('aria-selected', 'true');
        await screenshot('firsat-urun');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');

        await page.goto('/uygulama/ozellikler');
        await page.getByRole('button', { name: 'Şablon Ekle', exact: true }).first().click();
        const templateForm = page.getByRole('dialog', { name: 'Şablon Ekle', exact: true });
        await templateForm.getByLabel('Şablon Adı', { exact: true }).fill(templateName);
        await templateForm
          .getByRole('checkbox', { name: categoryName + ' kategorisini seç', exact: true })
          .click();
        await screenshot('sablon-form');
        await templateForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
        await expect(templateForm).toHaveCount(0);
        await page.reload();
        await page
          .getByRole('button', { name: templateName + ' şablonunu aç', exact: true })
          .click();
        await page.getByRole('button', { name: 'Grup Ekle', exact: true }).first().click();
        const groupForm = page.getByRole('dialog', { name: 'Grup Ekle', exact: true });
        await groupForm.getByLabel('Grup Adı', { exact: true }).fill('İşletim sistemi');
        await screenshot('grup-form');
        await groupForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
        await expect(groupForm).toHaveCount(0);
        await page.getByRole('button', { name: 'İşletim sistemi grubunu aç', exact: true }).click();
        await page.getByRole('textbox', { name: 'Yeni özellik adı' }).fill('Linux');
        await page.getByRole('textbox', { name: 'Yeni özellik adı' }).press('Enter');
        await expect(
          page.getByRole('button', { name: 'Linux özelliğini düzenle', exact: true }),
        ).toBeVisible();
        await page.reload();
        await expect(
          page.getByRole('button', { name: 'Linux özelliğini düzenle', exact: true }),
        ).toBeVisible();
        await screenshot('ozellikler');

        await page.goto('/uygulama/urunler');
        await page.getByRole('searchbox', { name: 'Ürün ara' }).fill(draft.code);
        await expect(page.getByText(draft.name, { exact: true })).toBeVisible();
        if (width < 1024)
          await page
            .getByRole('button', { name: draft.name + ' ayrıntılarını aç', exact: true })
            .click();
        await page.getByRole('switch', { name: draft.name + ' satışta', exact: true }).click();
        await expect(
          page.getByRole('switch', { name: draft.name + ' satışta', exact: true }),
        ).not.toBeChecked();
        await page.reload();
        await page.getByRole('searchbox', { name: 'Ürün ara' }).fill(draft.code);
        if (width < 1024)
          await page
            .getByRole('button', { name: draft.name + ' ayrıntılarını aç', exact: true })
            .click();
        await expect(
          page.getByRole('switch', { name: draft.name + ' satışta', exact: true }),
        ).not.toBeChecked();
        await screenshot('urunler');
        const pageResult = await request.get(api + '/api/stok/kartlar?kimlik=' + card.id, {
          headers,
        });
        const product = (await pageResult.json()).items[0];
        expect(product.categoryNames).toContain(categoryName);
        expect(product.dealIds).toHaveLength(1);
        expect(product.salesOpen).toBe(false);
        // Git'ten gelen yeni yan paneller de gerçek kart ilişkilerini okur ve yazar.
        await page.goto('/uygulama/stok-karti/' + card.id + '?ac=kategori');
        await expect(
          page.getByRole('checkbox', { name: categoryName + ' kategorisini seç', exact: true }),
        ).toBeChecked();
        await screenshot('yan-kategori');
        await page.getByRole('tab', { name: 'Fırsat', exact: true }).click();
        const dealSwitch = page.getByRole('switch', { name: dealName + ' fırsatı', exact: true });
        await expect(dealSwitch).toBeChecked();
        await dealSwitch.click();
        const updateResponse = page.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/stok/kartlar/${card.id}/guncelle`) &&
            r.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
        expect((await updateResponse).status()).toBe(200);
        await expect(page.getByText('Stok kartı güncellendi!', { exact: true })).toBeVisible();
        await page.goto('/uygulama/stok-karti/' + card.id + '?ac=firsat');
        await expect(dealSwitch).not.toBeChecked();
        await screenshot('yan-firsat');
        const extrasRead = await request.get(api + `/api/stok/kartlar/${card.id}/ekler`, {
          headers,
        });
        expect((await extrasRead.json()).categoryIds).toEqual(product.categoryIds);
      });
    });
  }
}
