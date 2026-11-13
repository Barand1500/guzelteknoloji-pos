import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { WORKSPACE_RESOURCES, type WidgetDto } from '@gt/shared';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const login = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: '1', displayName: 'Test', email: 'test@example.com', avatarUrl: null },
    }),
  'GET /api/hesap': () =>
    jsonResponse(200, {
      business: { id: 1, name: 'Test' },
      user: { id: 1, name: 'Test' },
      owner: true,
      permissions: WORKSPACE_RESOURCES.map((r) => ({
        resource: r.key,
        read: true,
        save: true,
        delete: true,
      })),
    }),
};
it('Genel Ayarlar sistem alanlarını sorar, gereksiz iletişim alanlarını göstermez', async () => {
  mockFetch({
    ...login,
    'GET /api/hesap/ayarlar/general': () =>
      jsonResponse(200, { values: { name: 'Test' }, configured: [] }),
  });
  renderApp('/uygulama/ayarlar/general');
  await screen.findByLabelText('Sistem Adı');
  expect(screen.getByLabelText('Sistem Adresi')).toBeInTheDocument();
  expect(screen.getByLabelText('Web Adresi')).toBeInTheDocument();
  expect(screen.getByLabelText('Sistem Açılış Tarihi')).toBeInTheDocument();
  expect(screen.getByLabelText('Bayi Sözleşmesi PDF')).toBeInTheDocument();
  expect(screen.queryByLabelText('Telefon / GSM')).not.toBeInTheDocument();
});
it('iletişimde vergi dairesini kayıtlı listeden seçtirir', async () => {
  const user = userEvent.setup();
  mockFetch({
    ...login,
    'GET /api/hesap/ayarlar/site_iletisim': () => jsonResponse(200, { values: {}, configured: [] }),
    'GET /api/vergi-daireleri': () =>
      jsonResponse(200, [{ id: '5', name: 'Nevşehir Vergi Dairesi', builtin: false }]),
  });
  renderApp('/uygulama/ayarlar/eticaret/iletisim-bilgileri');
  await user.click(await screen.findByRole('combobox', { name: 'Vergi Dairesi' }));
  expect(await screen.findByRole('option', { name: 'Nevşehir Vergi Dairesi' })).toBeVisible();
});
it('SMTP okundan e-posta şablonlarına geçer ve konu alanını gösterir', async () => {
  const user = userEvent.setup();
  mockFetch({
    ...login,
    'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
    'GET /api/hesap/ayarlar/imap': () => jsonResponse(200, { values: {}, configured: [] }),
    'GET /api/hesap/ayarlar/whatsapp': () => jsonResponse(200, { values: {}, configured: [] }),
    'GET /api/hesap/ayarlar/sms': () => jsonResponse(200, { values: {}, configured: [] }),
    'GET /api/hesap/ayarlar/site_eposta_sablonlari': () =>
      jsonResponse(200, {
        values: {
          sablonlar: JSON.stringify([
            { id: 'e1', name: 'E-Posta Doğrulama', subject: 'Doğrulama Kodunuz', text: 'Merhaba' },
          ]),
        },
        configured: [],
      }),
  });
  renderApp('/uygulama/ayarlar/iletisim');
  await user.click(await screen.findByRole('button', { name: 'E-posta şablonlarına geç' }));
  const region = await screen.findByRole('region', { name: 'E-Posta Şablonları' });
  expect(await within(region).findByText('Doğrulama Kodunuz')).toBeInTheDocument();
});

it('menü blok adını kaydeder', async () => {
  const user = userEvent.setup();
  let stored: Record<string, string> = {};
  mockFetch({
    ...login,
    'GET /api/site/menu': () => jsonResponse(200, []),
    'GET /api/hesap/ayarlar/site_menu': () => jsonResponse(200, { values: stored, configured: [] }),
    'POST /api/hesap/ayarlar/site_menu': (init) => {
      stored = JSON.parse(String(init?.body)).values;
      return jsonResponse(200, { values: stored, configured: [] });
    },
  });
  renderApp('/uygulama/ayarlar/eticaret/menu');
  await user.click(await screen.findByText('1. Alt Menü Blok'));
  const field = await screen.findByLabelText('1. Alt Menü Blok Adı');
  await user.type(field, 'Sık Kullanılanlar');
  await user.click(screen.getByRole('button', { name: '1. Alt Menü Blok adını kaydet' }));
  expect(stored.alt1).toBe('Sık Kullanılanlar');
});

it('widget için yedi görsel düzen ve gerçek veri seçimi sunar', async () => {
  const user = userEvent.setup();
  let saved: WidgetDto[] = [];
  mockFetch({
    ...login,
    'GET /api/site/widgetlar': () => jsonResponse(200, saved),
    'GET /api/site/widget-verileri': () => jsonResponse(200, [{ value: '6', label: 'Örnek Ürün' }]),
    'POST /api/site/widgetlar': (init) => {
      saved = [{ ...JSON.parse(String(init?.body)), id: '1', imageUrl: null }];
      return jsonResponse(201, saved[0]);
    },
  });
  renderApp('/uygulama/ayarlar/eticaret/widgetlar');
  await user.click(await screen.findByRole('button', { name: 'Ekle' }));
  const dialog = await screen.findByRole('dialog', { name: 'Widget Ekle' });
  expect(within(dialog).getAllByRole('radio')).toHaveLength(7);
  await user.click(within(dialog).getByRole('radio', { name: 'Ürün Izgarası' }));
  await user.click(within(dialog).getByRole('combobox', { name: 'Ürün Ekle' }));
  await user.click(await screen.findByRole('option', { name: 'Örnek Ürün' }));
  await user.type(within(dialog).getByLabelText('Widget Adı'), 'Ana Sayfa Ürünleri');
  await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  await screen.findByText('Widget eklendi.');
  expect(saved[0]?.settings).toMatchObject({
    duzen: 'urun-izgara',
    veriTuru: 'urun',
    veriKimlikleri: '6',
  });
  await user.click(screen.getByRole('button', { name: "Ana Sayfa Ürünleri widget'ını düzenle" }));
  const editor = await screen.findByRole('dialog', { name: "Widget'ı Düzenle" });
  expect(within(editor).getByRole('radio', { name: 'Ürün Izgarası' })).toBeChecked();
  expect(await within(editor).findByText('1. Örnek Ürün')).toBeVisible();
});

it('tarih ve çalışma şeklini kaydeder ve kayıtlı değerleri yeniden gösterir', async () => {
  const user = userEvent.setup();
  let stored: Record<string, string> = {
    name: 'Test',
    website: 'https://example.com',
    webAdresi: 'https://example.com',
  };
  mockFetch({
    ...login,
    'GET /api/hesap/ayarlar/general': () => jsonResponse(200, { values: stored, configured: [] }),
    'POST /api/hesap/ayarlar/general': (init) => {
      stored = JSON.parse(String(init?.body)).values;
      return jsonResponse(200, { values: stored, configured: [] });
    },
  });
  renderApp('/uygulama/ayarlar/general');
  fireEvent.change(await screen.findByLabelText('Sistem Açılış Tarihi'), {
    target: { value: '2026-11-13' },
  });
  await user.click(screen.getByRole('combobox', { name: 'Çalışma Şekli' }));
  await user.click(screen.getByRole('option', { name: 'Katalog' }));
  await user.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByText('Ayarlar kaydedildi.');
  expect(stored.acilisTarihi).toBe('2026-11-13');
  expect(stored.calismaSekli).toBe('Katalog');
  expect(screen.getByLabelText('Sistem Açılış Tarihi')).toHaveValue('2026-11-13');
  expect(screen.getByRole('combobox', { name: 'Çalışma Şekli' })).toHaveTextContent('Katalog');
});
