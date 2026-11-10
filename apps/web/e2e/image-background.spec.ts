import { test, expect } from '@playwright/test';

test('beyaz fonu gösterimde temizler ve ayar kapanınca özgün görseli gösterir', async ({
  page,
}) => {
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 20, 20);
    ctx.fillStyle = '#b84009';
    ctx.fillRect(5, 5, 10, 10);
    return canvas.toDataURL();
  });
  let enabled = true;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const user = { id: '1', displayName: 'Test', email: 'test@example.com', avatarUrl: null };
    let body: unknown = [];
    if (path === '/api/auth/me') body = { user };
    else if (path === '/api/hesap')
      body = {
        business: { id: 1, name: 'Test' },
        user: { id: 1, name: 'Test', email: user.email },
        owner: true,
        permissions: [],
        imageAppearance: { products: String(enabled) },
      };
    else if (path === '/api/hesap/ayarlar/images') {
      if (route.request().method() === 'POST')
        enabled = route.request().postDataJSON().values.products === 'true';
      body = { values: { products: String(enabled) }, configured: [] };
    } else if (path === '/api/stok/kartlar')
      body = {
        items: [
          {
            id: '1',
            code: 'A',
            name: 'Beyaz Fonlu Ürün',
            stockType: 'Basit Ürün',
            brandId: null,
            brandName: '',
            categoryIds: [],
            categoryNames: [],
            imageUrl: source,
            imageUrls: [source],
            currency: '₺',
            vatRate: 20,
            prices: [100, 100, 100],
            cost: 50,
            stock: 1,
            stockTracking: true,
            salesOpen: true,
            dealIds: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        priceLists: [],
        filterOptions: { categories: [], brands: [] },
      };
    await route.fulfill({ json: body });
  });
  const image = () => page.locator('[data-image-frame="products"] img').first();
  const alpha = () =>
    image().evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = 20;
      canvas.height = 20;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(element as HTMLImageElement, 0, 0, 20, 20);
      return ctx.getImageData(0, 0, 1, 1).data[3];
    });
  await page.goto('/uygulama/urunler');
  await expect.poll(alpha).toBe(0);
  await page.goto('/uygulama/ayarlar/images');
  await page.getByRole('switch', { name: 'Ürünlerde Şeffaf Zemin' }).click();
  await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('Ayarlar kaydedildi.', { exact: true })).toBeVisible();
  await page.goto('/uygulama/urunler');
  await expect(image()).toHaveAttribute('src', source);
  await expect.poll(alpha).toBe(255);
});
