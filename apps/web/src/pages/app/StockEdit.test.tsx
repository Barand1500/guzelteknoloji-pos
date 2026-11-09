import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService as productService } from '../../features/products/services/product.demo';
import { draftFromProduct } from '../../features/products/product.draft';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const NAME_1 = 'FLEXYPOS FP-503 İ3-15.6" Dokunmatik POS';

it('ana Kaydet varyant değişikliklerini kaybetmez; stok toplamı salt okunur ve ayrılırken uyarılır', async () => {
  const item = { ...(await productService.list())[0]!, id: '123' };
  const draft = draftFromProduct(item);
  draft.inventoryTracking = 'normal';
  const variant = { code: 'V-1', barcode: '00123', price: '10', quantity: '5', valueIds: ['1'] };
  let revision = 'a'.repeat(64);
  const fetch = mockFetch({
    ...anonymousRoutes,
    'GET /api/auth/me': () =>
      jsonResponse(200, {
        user: { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null },
      }),
    'GET /api/stok/kartlar': () =>
      jsonResponse(200, { items: [item], total: 1, page: 1, pageSize: 200 }),
    'GET /api/stok/kartlar/123': () => jsonResponse(200, draft),
    'GET /api/stok/kartlar/123/ekler': () =>
      jsonResponse(200, { categoryIds: [], dealIds: [], attributeValueIds: ['1'] }),
    'GET /api/ozellikler': () =>
      jsonResponse(200, {
        templates: [{ id: '1', name: 'Şablon', allProducts: true, categoryIds: [], groupCount: 1 }],
        groups: [
          {
            id: '10',
            templateId: '1',
            name: 'Renk',
            kind: 'color',
            filter: false,
            multiple: true,
            variant: true,
            showOnImage: false,
            position: 'tl',
            size: 'medium',
            valueCount: 1,
          },
        ],
        values: [
          {
            id: '1',
            groupId: '10',
            code: 'siyah',
            name: 'Siyah',
            color: '#000000',
            imageUrl: null,
          },
        ],
      }),
    'GET /api/stok/kartlar/123/varyantlar': () =>
      jsonResponse(200, { variants: [variant], revision }),
    'POST /api/stok/kartlar/123/guncelle': () => {
      revision = 'b'.repeat(64);
      return jsonResponse(200, { id: '123' });
    },
    'POST /api/stok/kartlar/123/varyantlar': () =>
      jsonResponse(200, { variants: [{ ...variant, price: '25' }], revision: 'c'.repeat(64) }),
  });
  const user = userEvent.setup();
  renderApp('/uygulama/stok-karti/123');
  const price = await screen.findByLabelText('Fiyat');
  await waitFor(() => expect(price).toBeEnabled());
  expect(screen.getByLabelText('Stok Miktarı')).toHaveValue('5.000000');
  expect(screen.getByLabelText('Stok Miktarı')).toHaveAttribute('readonly');
  await user.clear(price);
  await user.type(price, '25');
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await user.click(screen.getByRole('link', { name: 'Ürünlere dön' }));
  expect(confirm).toHaveBeenCalled();
  confirm.mockRestore();
  await user.type(screen.getByLabelText('Ürün Adı'), ' değişti');
  await user.click(screen.getByRole('button', { name: 'Kaydet' }));
  await screen.findByText(
    'Stok kartı kaydedildi. Varyant değişiklikleri için “Varyantları kaydet” düğmesine basın.',
  );
  await waitFor(() => expect(price).toBeEnabled());
  expect(price).toHaveValue('25');
  expect(price).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Varyantları kaydet' }));
  await screen.findByText('Varyantlar kaydedildi.');
  const call = fetch.mock.calls.find(
    ([url, init]) => String(url).endsWith('/varyantlar') && init?.method === 'POST',
  )!;
  expect(JSON.parse(String(call[1]?.body))).toMatchObject({
    revision: 'b'.repeat(64),
    variants: [{ price: '25' }],
  });
});

async function openList() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByRole('searchbox', { name: 'Ürün ara' });
  await screen.findByRole('button', { name: `${NAME_1} ürününü düzenle` });
  return user;
}

beforeEach(() => productService.reset());
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Stok kartı ekranı: ekle, düzenle ve kopya aynı ekrandır', () => {
  it('Düzenle: stok kartı ürünün bilgileriyle dolu açılır, başlık düzenlemeyi söyler', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününü düzenle` }));

    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('FLEXYPOS.FP-503');
    expect(screen.getByLabelText('Ürün Adı')).toHaveValue(NAME_1);
    expect(screen.getByRole('heading', { name: 'Stok Kartını Düzenle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ürünlere dön' })).toBeInTheDocument();
    expect(screen.getByText('Düzenleniyor')).toBeInTheDocument();
  });

  it('Düzenle: kaydedince aynı ürün güncellenir, yeni ürün eklenmez', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününü düzenle` }));
    const name = await screen.findByLabelText('Ürün Adı');
    await user.clear(name);
    await user.type(name, 'Yeni Ad POS');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yeni Stok Kartı' })).not.toBeInTheDocument();

    const list = await productService.list();
    expect(list).toHaveLength(16);
    expect(list.find((p) => p.id === 'p1')?.name).toBe('Yeni Ad POS');
    // Fiyatlar formdan geri okunur: değişmedi.
    expect(list.find((p) => p.id === 'p1')?.prices).toEqual([265, 275, 375]);
  });

  it('Kopya Oluştur: dolu ama yeni kayıt olarak açılır; vazgeçilirse hiçbir şey eklenmez', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününün kopyasını oluştur` }));
    expect(await screen.findByLabelText('Ürün Adı')).toHaveValue(`${NAME_1} (Kopya)`);
    expect(screen.getByLabelText('Ürün Kodu')).toHaveValue('FLEXYPOS.FP-503-KOPYA');
    expect(screen.getByText(/kaydedene kadar yeni ürün oluşmaz/)).toBeInTheDocument();
    expect(await productService.list()).toHaveLength(16); // henüz kayıt yok
  });

  it('Kopya: Kaydet ile yeni ürün eklenir, asıl ürün değişmez', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününün kopyasını oluştur` }));
    await screen.findByLabelText('Ürün Adı');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();

    const list = await productService.list();
    expect(list).toHaveLength(17);
    expect(list.find((p) => p.id === 'p1')?.name).toBe(NAME_1);
    expect(list.at(-1)?.name).toBe(`${NAME_1} (Kopya)`);
    expect(list.at(-1)?.prices).toEqual([265, 275, 375]);
  });

  it('Ürün Ekle: boş açılır, kaydedince listeye yeni ürün düşer', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: 'Ürün Ekle' }));
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ürün Kodu'), 'NEW-1');
    await user.type(screen.getByLabelText('Ürün Adı'), 'Yepyeni Ürün');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    await waitFor(async () => expect(await productService.list()).toHaveLength(17));
    expect((await productService.list()).at(-1)).toMatchObject({
      code: 'NEW-1',
      name: 'Yepyeni Ürün',
    });
  });

  it('olmayan kart açılınca hata gösterilir ve tekrar denenebilir', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yok-boyle-bir-urun');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tekrar Dene' })).toBeInTheDocument();
  });

  it('gerçek hesapta liste ve düzenleme sunucudan açılır; deneme girişi bunu değiştirmez', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    const item = { ...(await productService.list())[0]!, id: '123' };
    const draft = draftFromProduct(item);
    const fetch = mockFetch({
      ...anonymousRoutes,
      'GET /api/auth/me': () =>
        jsonResponse(200, {
          user: { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null },
        }),
      'GET /api/stok/kartlar': () =>
        jsonResponse(200, { items: [item], total: 1, page: 1, pageSize: 200 }),
      'GET /api/stok/kartlar/123': () => jsonResponse(200, draft),
      'GET /api/stok/kartlar/123/ekler': () => jsonResponse(200, { categoryIds: [], dealIds: [] }),
      'GET /api/ozellikler': () => jsonResponse(200, { templates: [], groups: [], values: [] }),
      'GET /api/stok/kartlar/123/varyantlar': () =>
        jsonResponse(200, { variants: [], revision: 'a'.repeat(64) }),
    });
    const user = userEvent.setup();
    renderApp('/uygulama/urunler');
    await user.dblClick(await screen.findByText(item.name));
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue(item.code);
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/api/stok/kartlar/123'))).toBe(
      true,
    );
    expect(screen.queryByText(/Deneme ürünü/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('düzenleme kaydından sonra yeni kart önerilmez; düzenlemeye devam edilebilir', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} ürününü düzenle` }));
    await screen.findByLabelText('Ürün Adı');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    expect(screen.queryByRole('button', { name: 'Ayrıntıları Doldur' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Düzenlemeye Devam Et' }));
    expect(await screen.findByLabelText('Ürün Adı')).toHaveValue(NAME_1);
  });
});
