import { expect, test, type Page } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e/.screenshots';

const viewports = [
  { name: '320-kucuk', width: 320, height: 568 },
  { name: '360-android', width: 360, height: 740 },
  { name: '375-iphone-se', width: 375, height: 667 },
  { name: '390-iphone', width: 390, height: 844 },
  { name: '430-iphone-max', width: 430, height: 932 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '1024-tablet-yatay', width: 1024, height: 768 },
  { name: '1440-masaustu', width: 1440, height: 900 },
  { name: '1920-genis', width: 1920, height: 1080 },
  // Yatay telefon, %200 zoom (1280x720 → 640x360 CSS px) ve açık klavye (görünür yükseklik azalır).
  { name: 'telefon-yatay', width: 844, height: 390 },
  { name: 'zoom-200', width: 640, height: 360 },
  { name: 'klavye-acik', width: 390, height: 400 },
] as const;

/** Gömülü destek formunu (dış site) deterministik sahte bir sayfayla taklit eder. */
async function mockSupportForm(page: Page) {
  await page.route('https://destek.guzelteknoloji.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="tr"><body style="font-family:sans-serif;margin:0;padding:24px;background:#fff">
        <h1 style="font-size:20px;margin:0 0 16px">Destek Talebi (sahte test formu)</h1>
        <label>Ad Soyad<br><input style="width:100%;height:44px;margin:6px 0 16px"></label>
        <label>Mesajınız<br><textarea style="width:100%;height:160px;margin-top:6px"></textarea></label>
        <button style="margin-top:16px;height:44px;padding:0 24px">Gönder</button></body></html>`,
    }),
  );
}

async function mockAnonymousApi(page: Page) {
  await mockSupportForm(page);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'UNAUTHENTICATED', message: 'Oturum bulunamadı.' } },
    }),
  );
  await page.route('**/api/auth/providers', (route) =>
    route.fulfill({ status: 200, json: { google: true, apple: false } }),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'yatay taşma olmamalı').toBeLessThanOrEqual(0);
}

/** Öğe sayfa kaydırılarak tamamen görünür olabilmeli ve en az 44x44 dokunma hedefi sunmalı. */
async function expectReachable(page: Page, name: RegExp | string) {
  const el = page.getByRole('button', { name, exact: typeof name === 'string' });
  await el.scrollIntoViewIfNeeded();
  await expect(el).toBeInViewport({ ratio: 1 });
  const box = await el.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}

const shot = (page: Page, file: string, fullPage = false) =>
  page.screenshot({ path: `${SCREENSHOT_DIR}/${file}.png`, fullPage, animations: 'disabled' });

for (const vp of viewports) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 1024 });

    test('seçenekler ekranı taşmadan ve erişilebilir biçimde görünür', async ({ page }) => {
      await mockAnonymousApi(page);
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Hesabınıza giriş yapın!' })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      await expectNoHorizontalOverflow(page);

      await shot(page, `${vp.name}-secenekler`);
      await shot(page, `${vp.name}-secenekler-tam`, true);

      await expectReachable(page, /Google ile Devam Et/);
      await expectReachable(page, /Apple ile Devam Et/);
      await expectReachable(page, /E-Posta ile Devam Et/);
      await expectReachable(page, /Yardıma mı İhtiyacınız Var/);
    });

    test('kod ekranı taşmaz ve tekrar gönder bağlantısı butona yakın kalır', async ({ page }) => {
      await mockAnonymousApi(page);
      await page.route('**/api/auth/email/start', (route) =>
        route.fulfill({
          status: 200,
          json: { step: 'code', resendAfterSeconds: 60, expiresInSeconds: 600 },
        }),
      );
      await page.goto('/login/e-posta');
      await page.getByLabel('E-Posta', { exact: true }).fill('uzun.eposta.adresi@example.com');
      await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Kodu girin' })).toBeVisible();
      await expect(page.getByLabel('Doğrulama Kodu')).toBeFocused();
      await expectNoHorizontalOverflow(page);
      const submit = page.getByRole('button', { name: 'Devam Et', exact: true });
      const resend = page.getByRole('button', { name: /Kodu Tekrar Gönder/ });
      await expectReachable(page, 'Devam Et');
      await expectReachable(page, /Kodu Tekrar Gönder/);
      const submitBox = (await submit.boundingBox())!;
      const resendBox = (await resend.boundingBox())!;
      expect(resendBox.y - submitBox.y - submitBox.height).toBeGreaterThanOrEqual(0);
      expect(resendBox.y - submitBox.y - submitBox.height).toBeLessThanOrEqual(8);
      expect(await resend.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(
        await submit.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
      await shot(page, vp.name + '-kod', true);
    });

    test('e-posta formu ve yardım sayfası taşmadan çalışır', async ({ page }) => {
      await mockAnonymousApi(page);
      await page.goto('/login/e-posta');
      await expect(page.getByLabel('E-Posta', { exact: true })).toBeFocused();
      await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
      await expect(page.getByLabel('E-Posta', { exact: true })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await expectNoHorizontalOverflow(page);
      await expectReachable(page, 'Devam Et');
      await shot(page, `${vp.name}-eposta`, true);

      await page.getByRole('button', { name: /Yardıma mı İhtiyacınız Var/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeInViewport();
      // Destek formu pencerenin içinde yüklenir ve taşmaz.
      const frame = dialog.locator('iframe[title="Destek Talebi"]');
      await expect(frame).toBeVisible();
      await expect(
        page.frameLocator('iframe[title="Destek Talebi"]').getByText('Destek Talebi'),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await shot(page, `${vp.name}-yardim`);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });
  });
}

test.describe('klavye ile gezinme', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Tab sırası mantıklı ve odak görünür', async ({ page }) => {
    await mockAnonymousApi(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Hesabınıza giriş yapın!' })).toBeVisible();

    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => (document.activeElement as HTMLElement).innerText.trim()),
      );
      const outline = await page.evaluate(
        () => getComputedStyle(document.activeElement as Element).outlineStyle,
      );
      expect(outline, 'odak halkası görünür olmalı').not.toBe('none');
    }
    expect(order).toEqual([
      'Google ile Devam Et',
      'Apple ile Devam Et',
      'E-Posta ile Devam Et',
      'Yardıma mı İhtiyacınız Var?',
    ]);
  });
});

test.describe('hata konuşma kutusu', () => {
  for (const width of [320, 390]) {
    test(`ünleme dokununca kutu açılır ve ekran içinde kalır (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await mockAnonymousApi(page);
      await page.goto('/login/e-posta');
      await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
      const icon = page.getByRole('button', { name: 'E-posta adresinizi girin.' });
      await icon.click();
      const tip = page.getByRole('tooltip').first();
      await expect(tip).toBeVisible();
      await expect(tip).toBeInViewport({ ratio: 1 });
      await expectNoHorizontalOverflow(page);
      await shot(page, `${width}-hata-kutusu`);
      await page.keyboard.press('Escape');
      await expect(icon).toHaveAttribute('aria-expanded', 'false');
      // Dışarı dokununca (odak ve hover kalkınca) kutu tamamen kapanır.
      await page.mouse.click(2, 2);
      await expect(tip).toBeHidden();
    });
  }
});

test.describe('buton hover animasyonu (yalnızca fare olan cihazlar)', () => {
  test('masaüstünde hover ile ok belirir ve dolgu büyür', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockAnonymousApi(page);
    await page.goto('/login');
    const button = page.getByRole('button', { name: /E-Posta ile Devam Et/ });
    const arrow = button.locator('svg').last();
    await expect(arrow).toHaveCSS('opacity', '0');
    await button.hover();
    await expect(arrow).toHaveCSS('opacity', '1', { timeout: 3000 });
    await shot(page, 'hover-eposta');
  });

  test('dokunmatik cihazda hover animasyonu devreye girmez', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await mockAnonymousApi(page);
    await page.goto('/login');
    const button = page.getByRole('button', { name: /Apple ile Devam Et/ });
    await button.tap();
    // Dokunma sonrası takılı kalan hover olmaz: ok görünmez.
    await expect(button.locator('svg').last()).toHaveCSS('opacity', '0');
    await context.close();
  });
});
