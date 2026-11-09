import { expect, test, type Locator } from '@playwright/test';

for (const width of [390, 768, 1440])
  for (const mode of ['light', 'dark'] as const) {
    test.describe(`Tema ${mode} ${width}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme: mode });
      test('marka pencereleri, stok listesi ve hesaplayıcılar temayı alır ve ekrana sığar', async ({
        page,
      }) => {
        await page.addInitScript((theme) => {
          sessionStorage.setItem('gt-dev-access', '1');
          localStorage.setItem('gt-theme', theme);
        }, mode);
        await page.route('**/api/auth/me', (route) =>
          route.fulfill({
            status: 401,
            json: { error: { code: 'UNAUTHENTICATED', message: 'test' } },
          }),
        );
        await page.route('**/api/markalar', (route) => route.fulfill({ json: [] }));
        const screenshot = async (part: string) =>
          page.screenshot({
            path: `e2e/.screenshots/tema-${mode}-${width}-${part}.png`,
            fullPage: true,
          });
        const check = async (panel: Locator) => {
          await expect(panel).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
          const box = await panel.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(-1);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
          const surface = await panel.evaluate((el) =>
            getComputedStyle(el).getPropertyValue('--color-surface-raised').trim(),
          );
          expect(surface).toBe(mode === 'dark' ? '#1c1c1f' : '#ffffff');
        };
        await page.goto('/uygulama/markalar');
        const edit = page.getByRole('button', { name: 'ALATEL markasını düzenle', exact: true });
        if (width < 768) await edit.click();
        else await edit.dblclick();
        const main = page.getByRole('dialog', { name: 'Markayı Düzenle', exact: true });
        await check(main);
        await screenshot('marka');
        await main.getByRole('button', { name: 'Kaydet', exact: true }).click();
        await expect(page.getByRole('status')).toBeVisible();
        await screenshot('bildirim');
        if (width < 768) {
          const box = (await edit.boundingBox())!;
          await edit.dispatchEvent('pointerdown', {
            pointerId: 1,
            pointerType: 'touch',
            clientX: box.x + 250,
            clientY: box.y + 20,
          });
          await edit.dispatchEvent('pointermove', {
            pointerId: 1,
            pointerType: 'touch',
            clientX: box.x + 20,
            clientY: box.y + 20,
          });
          await edit.dispatchEvent('pointerup', {
            pointerId: 1,
            pointerType: 'touch',
            clientX: box.x + 20,
            clientY: box.y + 20,
          });
          await page
            .getByRole('listitem')
            .filter({ has: edit })
            .getByRole('button', { name: 'Ürünler', exact: true })
            .click();
        } else {
          await page
            .getByRole('button', { name: 'ALATEL markasının ürünlerini yönet', exact: true })
            .click();
        }
        const products = page.getByRole('dialog', { name: 'ALATEL · Ürünler', exact: true });
        await check(products);
        await screenshot('urunler');
        await page.keyboard.press('Escape');
        await page.goto('/uygulama/stok-karti/yeni');
        await page.getByRole('combobox', { name: 'Marka', exact: true }).click();
        const list = page.getByRole('listbox');
        await check(list);
        await screenshot('liste');
        await page.keyboard.press('Escape');
        if (width < 1280) await page.getByRole('tab', { name: 'Ölçü', exact: true }).click();
        for (const name of ['Ağırlık Hesapla', 'Desi Hesapla']) {
          await page.getByRole('button', { name, exact: true }).first().click();
          const calc = page.getByRole('dialog', { name, exact: true });
          await check(calc);
          await expect
            .poll(async () => {
              const box = await calc.boundingBox();
              return !!box && box.y >= 0 && box.y + box.height <= 1001;
            })
            .toBe(true);
          await screenshot(name === 'Desi Hesapla' ? 'desi' : 'agirlik');
          await calc.getByRole('button', { name: 'Kapat', exact: true }).click();
        }
      });
    });
  }

for (const width of [390, 768, 1440])
  for (const mode of ['light', 'dark'] as const) {
    test.describe(`Kategori ve fırsat ${mode} ${width}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme: mode });
      test('listeler ve ekleme pencereleri temaya uyar, ekrana sığar', async ({ page }) => {
        await page.addInitScript((theme) => {
          sessionStorage.setItem('gt-dev-access', '1');
          localStorage.setItem('gt-theme', theme);
        }, mode);
        await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
        for (const [url, label] of [
          ['/uygulama/kategoriler', 'Kategori Ekle'],
          ['/uygulama/urunler/firsatlar', 'Fırsat Ekle'],
        ]) {
          await page.goto(url!);
          await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
          await page.getByRole('button', { name: label, exact: true }).first().click();
          const dialog = page.getByRole('dialog', { name: label, exact: true });
          await expect(dialog).toBeVisible();
          const box = await dialog.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(-1);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          ).toBeLessThanOrEqual(0);
          expect(
            await dialog.evaluate((element) =>
              getComputedStyle(element).getPropertyValue('--color-surface-raised').trim(),
            ),
          ).toBe(mode === 'dark' ? '#1c1c1f' : '#ffffff');
          await page.screenshot({
            path: `e2e/.screenshots/yeni-${label}-${mode}-${width}.png`,
            fullPage: true,
          });
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
        }
      });
    });
  }
