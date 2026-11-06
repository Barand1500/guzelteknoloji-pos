import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productService } from '../../features/products/services/product.service';
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

  it('gerçek hesapla da sahte listeden Düzenle çalışır (sunucuya gitmez, deneme ürünü olarak açılır)', async () => {
    mockFetch({
      ...anonymousRoutes,
      'GET /api/auth/me': () =>
        jsonResponse(200, {
          user: { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null },
        }),
    });
    const user = userEvent.setup();
    renderApp('/uygulama/urunler');
    await user.dblClick(await screen.findByText(NAME_1));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('FLEXYPOS.FP-503');
    expect(screen.getByText(/Deneme ürünü/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
