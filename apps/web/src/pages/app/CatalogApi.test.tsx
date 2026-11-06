import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';
import { demoProductService } from '../../features/products/services/product.demo';

const auth = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: '1', email: 'one@example.com', displayName: null, avatarUrl: null },
    }),
};

it.each([
  ['/uygulama/kategoriler', 'Kategori Ekle', 'Kategori Adı', '/api/kategoriler', null],
  [
    '/uygulama/urunler/firsatlar',
    'Fırsat Ekle',
    'Fırsat Adı',
    '/api/firsatlar',
    'Ürün Resminin Üzerinde Göster',
  ],
  [
    '/uygulama/ozellikler',
    'Şablon Ekle',
    'Şablon Adı',
    '/api/ozellikler/sablonlar',
    'Tüm Ürünlerde Kullan',
  ],
])(
  '%s kayıt hatasını açık formun içinde gösterir ve girilen adı korur',
  async (path, action, label, endpoint, toggle) => {
    mockFetch({
      ...auth,
      'GET /api/kategoriler': () => jsonResponse(200, []),
      'GET /api/firsatlar': () => jsonResponse(200, []),
      'GET /api/ozellikler': () => jsonResponse(200, { templates: [], groups: [], values: [] }),
      ['POST ' + endpoint]: () =>
        jsonResponse(409, { error: { code: 'CONFLICT', message: 'Aynı adla bir kayıt var.' } }),
    });
    const user = userEvent.setup();
    renderApp(path);
    await user.click((await screen.findAllByRole('button', { name: action }))[0]!);
    const form = await screen.findByRole('dialog', { name: action });
    await user.type(within(form).getByLabelText(label), 'Kalıcı ad');
    if (toggle) await user.click(within(form).getByRole('switch', { name: toggle }));
    await user.click(within(form).getByRole('button', { name: 'Kaydet' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Aynı adla bir kayıt var.');
    expect(within(form).getByLabelText(label)).toHaveValue('Kalıcı ad');
    expect(within(form).getByRole('button', { name: 'Kaydet' })).toBeEnabled();
  },
);
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it.each([
  ['/uygulama/urunler', '/api/stok/kartlar', { items: [], total: 0, page: 1, pageSize: 200 }],
  ['/uygulama/kategoriler', '/api/kategoriler', []],
  ['/uygulama/urunler/firsatlar', '/api/firsatlar', []],
  ['/uygulama/ozellikler', '/api/ozellikler', { templates: [], groups: [], values: [] }],
])(
  'gerçek oturumda %s API hatasını gösterir, tekrar dener ve sahte kayda dönmez',
  async (path, endpoint, empty) => {
    sessionStorage.setItem('gt-dev-access', '1');
    let failed = true;
    const fetch = mockFetch({
      ...auth,
      'GET /api/kategoriler': () => jsonResponse(200, []),
      ['GET ' + endpoint]: () =>
        failed
          ? jsonResponse(503, { error: { code: 'UNAVAILABLE', message: 'Kayıtlar okunamadı.' } })
          : jsonResponse(200, empty),
    });
    const user = userEvent.setup();
    renderApp(path);
    expect(await screen.findByRole('alert')).toHaveTextContent('Kayıtlar okunamadı.');
    expect(
      screen.queryByText('Test Kullanıcısı · Deneme verileriyle çalışıyorsunuz.'),
    ).not.toBeInTheDocument();
    failed = false;
    await user.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(
      fetch.mock.calls.filter(
        ([url]) => new URL(String(url), 'http://localhost').pathname === endpoint,
      ).length,
    ).toBeGreaterThanOrEqual(2);
  },
);

it('ürünün satışı sunucu reddederse kapanmaz ve başarılı kaydedildi denmez', async () => {
  const item = { ...(await demoProductService.list())[0]!, id: '123', salesOpen: true };
  mockFetch({
    ...auth,
    'GET /api/stok/kartlar': () =>
      jsonResponse(200, { items: [item], total: 1, page: 1, pageSize: 200 }),
    'POST /api/stok/kartlar/toplu': () =>
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'Satış durumu kaydedilemedi.' } }),
  });
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await user.click(await screen.findByRole('switch', { name: item.name + ' satışta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Satış durumu kaydedilemedi.');
  expect(screen.getByRole('switch', { name: item.name + ' satışta' })).toBeChecked();
  expect(screen.queryByText(/satışa kapatıldı/)).not.toBeInTheDocument();
});
