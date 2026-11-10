import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`barkod girişi ve penceresi ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem('gt-dev-access', '1');
      localStorage.setItem('gt-theme', 'dark');
    });
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED', message: 'test' } } }),
    );
    await page.goto('/uygulama/stok-karti/yeni');
    await page.getByLabel('Ürün Adı', { exact: true }).fill('Barkod Kontrol Ürünü');
    if (width < 1280) await page.getByRole('tab', { name: 'Barkod', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Barkod', exact: true });
    await input.fill('8690001123456');
    await input.press('Enter');
    const eye = page.getByRole('button', { name: 'Barkodları görüntüle (1)' });
    await expect(eye).toBeVisible();
    const inputBox = (await input.boundingBox())!;
    const eyeBox = (await eye.boundingBox())!;
    expect(eyeBox.x).toBeGreaterThanOrEqual(inputBox.x);
    expect(eyeBox.x + eyeBox.width).toBeLessThanOrEqual(inputBox.x + inputBox.width);
    await expect(page.getByRole('list', { name: 'Eklenen barkodlar' })).toHaveCount(0);
    expect((await input.boundingBox())!.width).toBeGreaterThan(80);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('barcode-entry.png'), fullPage: true });
    await eye.click();
    const modal = page.getByRole('dialog', { name: 'Barkodlar', exact: true });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('8690001123456', { exact: true })).toBeVisible();
    const box = (await modal.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath('barcodes-modal.png') });
    await modal.getByRole('button', { name: 'Kapat', exact: true }).click();
    await page.goto('/uygulama/urunler');
    const direction = page.getByRole('radiogroup', { name: 'Fiyat yönü' });
    await direction.getByRole('radio', { name: 'Alış', exact: true }).click();
    await expect(direction.getByRole('radio', { name: 'Alış', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    if (width >= 1280) {
      await page.getByRole('button', { name: 'Tabloda gösterilecek fiyat' }).click();
      await expect(
        page
          .getByRole('listbox', { name: 'Fiyat listeleri' })
          .getByRole('option', { name: 'Alış', exact: true }),
      ).toHaveCount(0);
      await page.getByRole('option', { name: 'PERAKENDE', exact: true }).click();
    } else
      await page
        .getByRole('radiogroup', { name: 'Listede gösterilecek fiyat' })
        .getByRole('radio', { name: 'PERAKENDE', exact: true })
        .click();
    await page.screenshot({ path: testInfo.outputPath('products-prices.png'), fullPage: true });
    await page.getByRole('button', { name: 'Süzgeçler', exact: true }).click();
    const filters = page.getByRole('dialog', { name: 'Süzgeçler', exact: true });
    await filters.getByLabel('Kategori', { exact: true }).click();
    await page
      .getByRole('button', { name: 'OT/VT Ürünleri alt kategorileri', exact: true })
      .click();
    await expect(page.getByRole('checkbox', { name: 'Dokunmatik POS', exact: true })).toBeVisible();
    await expect(page.getByRole('checkbox', {name:'El Terminalleri',exact:true}).getByText('Pasif', {exact:true})).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('category-filter.png') });
  });
}
