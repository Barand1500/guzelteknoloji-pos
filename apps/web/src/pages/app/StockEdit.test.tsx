import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService as productService } from '../../features/products/services/product.demo';
import { draftFromProduct } from '../../features/products/product.draft';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const NAME_1 = 'FLEXYPOS FP-503 İ3-15.6" Dokunmatik POS';

async function openList() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByRole('searchbox', { name: 'Ürün ara' });
  await screen.findByRole('button', { name: `${NAME_1} işlemleri` });
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
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    const menu = await screen.findByRole('dialog', { name: NAME_1 });
    await user.click(within(menu).getByRole('button', { name: 'Düzenle' }));

    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('FLEXYPOS.FP-503');
    expect(screen.getByLabelText('Stok Adı')).toHaveValue(NAME_1);
    expect(screen.getByRole('heading', { name: 'Stok Kartını Düzenle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ürünlere dön' })).toBeInTheDocument();
    expect(screen.getByText('Düzenleniyor')).toBeInTheDocument();
  });

  it('Düzenle: kaydedince aynı ürün güncellenir, yeni ürün eklenmez', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    await user.click(
      within(await screen.findByRole('dialog', { name: NAME_1 })).getByRole('button', {
        name: 'Düzenle',
      }),
    );
    const name = await screen.findByLabelText('Stok Adı');
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
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    await user.click(
      within(await screen.findByRole('dialog', { name: NAME_1 })).getByRole('button', {
        name: 'Kopya Oluştur',
      }),
    );
    expect(await screen.findByLabelText('Stok Adı')).toHaveValue(`${NAME_1} (Kopya)`);
    expect(screen.getByLabelText('Stok Kodu')).toHaveValue('FLEXYPOS.FP-503-KOPYA');
    expect(screen.getByText(/kaydedene kadar yeni ürün oluşmaz/)).toBeInTheDocument();
    expect(await productService.list()).toHaveLength(16); // henüz kayıt yok
  });

  it('Kopya: Kaydet ile yeni ürün eklenir, asıl ürün değişmez', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    await user.click(
      within(await screen.findByRole('dialog', { name: NAME_1 })).getByRole('button', {
        name: 'Kopya Oluştur',
      }),
    );
    await screen.findByLabelText('Stok Adı');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();

    const list = await productService.list();
    expect(list).toHaveLength(17);
    expect(list.find((p) => p.id === 'p1')?.name).toBe(NAME_1);
    expect(list.at(-1)?.name).toBe(`${NAME_1} (Kopya)`);
    expect(list.at(-1)?.prices).toEqual([265, 275, 375]);
  });

  it('Ürün Ekle: boş açılır, kaydedince listeye yeni ürün düşer', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: 'Ürün Ekle' }));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Stok Kodu'), 'NEW-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Yepyeni Ürün');
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
    });
    const user = userEvent.setup();
    renderApp('/uygulama/urunler');
    await user.dblClick(await screen.findByText(item.name));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue(item.code);
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/api/stok/kartlar/123'))).toBe(
      true,
    );
    expect(screen.queryByText(/Deneme ürünü/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('kayıttan sonra "Ayrıntıları Doldur" kaydedilen kartı dolu düzenleme ekranında açar', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: 'Ürün Ekle' }));
    await user.type(await screen.findByLabelText('Stok Kodu'), 'DETAY-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Detay Ürünü');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    expect(screen.getByText('Detay Ürünü')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ayrıntıları Doldur' }));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('DETAY-1');
    expect(screen.getByRole('heading', { name: 'Stok Kartını Düzenle' })).toBeInTheDocument();
  });

  it('düzenleme kaydından sonra yeni kart önerilmez; düzenlemeye devam edilebilir', async () => {
    const user = await openList();
    await user.click(screen.getByRole('button', { name: `${NAME_1} işlemleri` }));
    await user.click(
      within(await screen.findByRole('dialog', { name: NAME_1 })).getByRole('button', {
        name: 'Düzenle',
      }),
    );
    await screen.findByLabelText('Stok Adı');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    expect(screen.queryByRole('button', { name: 'Ayrıntıları Doldur' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Düzenlemeye Devam Et' }));
    expect(await screen.findByLabelText('Stok Adı')).toHaveValue(NAME_1);
  });
});
