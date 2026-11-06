import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { stockFixture } from '../../api/src/tests/stock.fixture';

const api = process.env.STOCK_TEST_API_URL;
const token = process.env.STOCK_TEST_TOKEN;
test.skip(!api || !token, 'Gerçek MySQL için db:test:stock:browser çalıştırın.');

for (const width of [320, 390, 768, 1440]) {
  test.describe('Kalıcı marka ' + width, () => {
    test.use({ viewport: { width, height: 900 } });
    test('logo, düzenleme, aktiflik, ürün atama ve silme kalıcıdır', async ({
      page,
      context,
      request,
    }) => {
      await context.addCookies([
        { name: 'gt_session', value: token!, domain: 'localhost', path: '/' },
      ]);
      await page.route('**/api/**', async (route) => {
        const response = await route.fetch({ url: api + new URL(route.request().url()).pathname });
        await route.fulfill({ response });
      });
      const headers = { Cookie: 'gt_session=' + token, Origin: 'http://localhost:5175' };
      const draft = stockFixture();
      draft.code = 'MARKA-' + width + '-' + Date.now();
      draft.name = 'Marka Test Ürünü ' + width;
      draft.units.fiyat![0]!.barcodes = [];
      const createdProduct = await request.post(api + '/api/stok/kartlar', {
        headers,
        data: { requestId: randomUUID(), draft },
      });
      expect(createdProduct.status()).toBe(201);
      const product = (await createdProduct.json()) as { id: string };
      const name = 'Kalıcı Marka ' + width + ' ' + Date.now();
      await page.goto('/uygulama/markalar');
      await page.getByRole('button', { name: 'Marka Ekle', exact: true }).click();
      await page.getByLabel('Marka Adı', { exact: true }).fill(name);
      await page.getByLabel('Logo dosyası seç').setInputFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        buffer: await sharp({ create: { width: 1, height: 1, channels: 4, background: '#ff6600' } })
          .png()
          .toBuffer(),
      });
      await expect(page.getByAltText(name + ' logosu')).toBeVisible();
      await page.getByRole('button', { name: 'Gelişmiş: Açıklama ve SEO' }).click();
      await page.getByLabel('Açıklama', { exact: true }).fill('Türkçe marka açıklaması');
      await page.getByLabel('SEO Başlığı', { exact: true }).fill('Türkçe SEO');
      await page.getByLabel('SEO Açıklaması', { exact: true }).fill('Kalıcı açıklama');
      await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.reload();
      const row = page
        .getByRole('listitem')
        .filter({ has: page.getByRole('switch', { name: name + ' aktif', exact: true }) });
      await expect(row).toBeVisible();
      await expect(row.locator('img')).toHaveJSProperty('naturalWidth', 1);
      await row.getByRole('switch').click();
      await expect(row.getByRole('switch')).not.toBeChecked();
      await page.reload();
      await expect(row.getByRole('switch')).not.toBeChecked();
      await row.getByRole('switch').click();
      await expect(row.getByRole('switch')).toBeChecked();
      const edit = row.getByRole('button', { name: name + ' markasını düzenle', exact: true });
      if (width >= 768) await edit.dblclick();
      else await edit.click();
      const dialog = page.getByRole('dialog', { name: 'Markayı Düzenle', exact: true });
      await dialog.getByRole('button', { name: 'Gelişmiş: Açıklama ve SEO' }).click();
      await expect(dialog.getByLabel('SEO Başlığı', { exact: true })).toHaveValue('Türkçe SEO');
      await dialog.getByLabel('Açıklama', { exact: true }).fill('Güncellenen açıklama');
      await dialog.getByRole('button', { name: 'Kaydet', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      if (width >= 768) await edit.dblclick();
      else await edit.click();
      await dialog.getByRole('button', { name: /^Ürünler/ }).click();
      const panel = page.getByRole('dialog', { name: name + ' · Ürünler', exact: true });
      await panel.getByRole('tab', { name: 'Ürün Ekle', exact: true }).click();
      await panel.getByRole('searchbox', { name: 'Eklenecek ürünü ara' }).fill(draft.code);
      await panel.getByRole('checkbox', { name: draft.name + ' ürününü seç', exact: true }).click();
      await panel.getByRole('button', { name: 'Ekle', exact: true }).click();
      await expect(panel.getByRole('tab', { name: 'Bu Markada (1)', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await panel
        .getByRole('button', { name: draft.name + ' ürününü markadan çıkar', exact: true })
        .click();
      await panel.getByRole('button', { name: 'Geri Al', exact: true }).click();
      await expect(panel.getByRole('tab', { name: 'Bu Markada (1)', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      await page.screenshot({
        path: 'e2e/.screenshots/markalar-' + width + '.png',
        fullPage: true,
      });
      const brands = await request.get(api + '/api/markalar', { headers });
      const brand = (
        (await brands.json()) as { id: string; name: string; productCount: number }[]
      ).find((b) => b.name === name)!;
      expect(brand.productCount).toBe(1);
      const reloaded = await request.get(api + '/api/markalar/urunler', { headers });
      expect(
        ((await reloaded.json()) as { id: string; brandId: string | null }[]).find(
          (p) => p.id === product.id,
        )?.brandId,
      ).toBe(brand.id);
      // Markalar ekranında kaydedilen ad stok kartındaki seçimde görünmeli ve doğru markaya bağlanmalı.
      await page.goto('/uygulama/stok-karti/yeni');
      await page.getByRole('combobox', { name: 'Marka', exact: true }).click();
      await page.getByRole('option', { name, exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Marka', exact: true })).toContainText(name);
      await page
        .getByLabel('Stok Kodu', { exact: true })
        .fill('MARKA-SECIM-' + width + '-' + Date.now());
      const savedCard = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/stok/kartlar') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
      const cardResponse = await savedCard;
      expect(cardResponse.status()).toBe(201);
      const newCard = (await cardResponse.json()) as { id: string };
      const readCard = await request.get(api + '/api/stok/kartlar/' + newCard.id, { headers });
      const card = (await readCard.json()) as { brandId: string; brand: { label: string } };
      expect(card.brandId).toBe(brand.id);
      expect(card.brand.label).toBe(name);
      expect(
        (await request.post(api + '/api/markalar/' + brand.id + '/sil', { headers })).status(),
      ).toBe(204);
      const afterDelete = await request.get(api + '/api/markalar/urunler', { headers });
      expect(
        ((await afterDelete.json()) as { id: string; brandId: string | null }[]).find(
          (p) => p.id === product.id,
        )?.brandId,
      ).toBeNull();
    });
  });
}
