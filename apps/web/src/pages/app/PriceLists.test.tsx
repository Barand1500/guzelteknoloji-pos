import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService } from '../../features/products/services/product.demo';
import { resetDemoStock } from '../../features/stock/services/stock.demo';
import {
  grossOf,
  listPricesOf,
  matchesFilters,
  emptyFilters,
  netOf,
  priceListsOf,
  type ListPrice,
  type ProductItem,
} from '../../features/products/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

const NAME_1 = 'FLEXYPOS FP-503 İ3-15.6" Dokunmatik POS';

/** Dar ekranı taklit eder: hiçbir min-width sorgusu eşleşmez → telefon düzeni çizilir. */
function stubNarrowScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

const price = (id: string, name: string, net: number | null): ListPrice => ({
  id,
  code: id,
  name,
  net,
  vatRate: 20,
  currency: 'TRY',
});

beforeEach(() => {
  demoProductService.reset();
  resetDemoStock();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

async function openProducts(phone = false) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  if (phone) stubNarrowScreen();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByRole('searchbox', { name: 'Ürün ara' });
  await screen.findByText(NAME_1);
  return user;
}

describe('Fiyat listesi yardımcıları', () => {
  const base = { prices: [1, 2, 3], priceVatRates: [20, 20, 20], vatRate: 20, currency: '₺' };

  it('kullanıcının listeleri kendi adı ve sırasıyla gelir; fiyatı girilmeyen liste null kalır', () => {
    const p = {
      ...base,
      listPrices: [price('a', 'FİYAT', 100), price('b', 'BARAN', null)],
    } as unknown as ProductItem;
    expect(listPricesOf(p).map((l) => l.name)).toEqual(['FİYAT', 'BARAN']);
    expect(netOf(p, 'a')).toBe(100);
    expect(netOf(p, 'b')).toBeNull();
    expect(grossOf(p, 'a')).toBe(120);
    expect(grossOf(p, 'b')).toBeNull();
  });

  it('eski sunucu yanıtında (listPrices yok) üç varsayılan listeye düşer', () => {
    const p = { ...base, cost: 0 } as unknown as ProductItem;
    expect(listPricesOf(p).map((l) => l.name)).toEqual(['FİYAT', 'PERAKENDE', 'TOPTAN']);
    expect(netOf(p, 'perakende')).toBe(2);
  });
  it('sunucunun yuvarladığı KDV dahil tutarı fiyat süzgecinde ve görünümde kullanır', () => {
    const p = {
      ...base,
      listPrices: [{ ...price('a', 'A', 1.005), vatRate: 0, gross: 1.01 }],
    } as unknown as ProductItem;
    expect(grossOf(p, 'a')).toBe(1.01);
    expect(matchesFilters(p, { ...emptyFilters(), minPrice: '1.01', maxPrice: '1.01' })).toBe(true);
  });

  it('ürünlerdeki listelerin birleşimi tekrarsız ve ilk görülen sırayla çıkar', () => {
    const a = {
      ...base,
      listPrices: [price('x', 'X', 1), price('y', 'Y', 2)],
    } as unknown as ProductItem;
    const b = {
      ...base,
      listPrices: [price('x', 'X', 1), price('z', 'BARAN', 3)],
    } as unknown as ProductItem;
    expect(priceListsOf([a, b]).map((c) => c.name)).toEqual(['X', 'Y', 'BARAN']);
  });

  it('fiyat aralığı ilk listeye uygulanır; fiyatı olmayan ürün aralığa girmez', () => {
    const withPrice = { ...base, listPrices: [price('a', 'A', 100)] } as unknown as ProductItem;
    const without = { ...base, listPrices: [price('a', 'A', null)] } as unknown as ProductItem;
    const filters = { ...emptyFilters(), minPrice: '50', maxPrice: '150' };
    expect(matchesFilters(withPrice, filters)).toBe(true); // 120 dahil
    expect(matchesFilters(without, filters)).toBe(false);
  });
});

describe('Ürün listesinde dinamik fiyat listeleri', () => {
  /** FİYAT, PERAKENDE, TOPTAN'a ek olarak kullanıcının BARAN listesi olan bir ürün ekler. */
  async function addBaranProduct(baranNet: number | null) {
    const first = (await demoProductService.list())[0]!;
    const { id: _id, ...seed } = first;
    void _id;
    await demoProductService.applyCard(null, {
      ...(seed as ProductItem),
      code: 'BARAN-1',
      name: 'Baran Listeli Ürün',
      listPrices: [
        ...listPricesOf(first),
        { id: 'baran', code: 'baran', name: 'BARAN', net: baranNet, vatRate: 20, currency: 'TRY' },
      ],
    });
  }

  it('tabloda yalnızca ilk liste (FİYAT) görünür; başlıktaki seçici tüm listeleri kendi adlarıyla sunar', async () => {
    const user = await openProducts();
    const header = document.querySelector('thead') as HTMLElement;
    const picker = within(header).getByRole('button', { name: 'Tabloda gösterilecek fiyat' });
    expect(picker).toHaveTextContent('FİYAT');
    expect(within(header).queryByText('PERAKENDE')).not.toBeInTheDocument();
    expect(within(header).queryByText(/Fiyat \d/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Gösterilen fiyat sütunları' }),
    ).not.toBeInTheDocument();
    await user.click(picker);
    const options = within(screen.getByRole('listbox', { name: 'Fiyat listeleri' }))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['FİYAT', 'PERAKENDE', 'TOPTAN', 'Alış']);
  });

  it('kullanıcı yeni liste (BARAN) açınca başlıktan seçilir; fiyatı olmayana "—" yazar', async () => {
    await addBaranProduct(450);
    const user = await openProducts();
    const header = document.querySelector('thead') as HTMLElement;
    await user.click(within(header).getByRole('button', { name: 'Tabloda gösterilecek fiyat' }));
    await user.click(screen.getByRole('option', { name: 'BARAN' }));
    expect(
      within(header).getByRole('button', { name: 'Tabloda gösterilecek fiyat' }),
    ).toHaveTextContent('BARAN');

    // Yeni ürünün BARAN fiyatı 450 + %20 = 540; diğer ürünlerde BARAN fiyatı yok → "—".
    const old = document.querySelector('tr[data-product-id="p1"]') as HTMLElement;
    expect(within(old).getByText('—')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Ürün ara' }), 'Baran Listeli');
    const added = (await screen.findByText('Baran Listeli Ürün')).closest('tr') as HTMLElement;
    expect(within(added).getByText('540,00 ₺')).toBeInTheDocument();
    expect(within(added).getByText(/KDV Hariç/)).toBeInTheDocument();
  });

  it('fiyatın üzerine gelince ürünün tüm listeleri (BARAN dahil) açılır', async () => {
    await addBaranProduct(450);
    const user = await openProducts();
    await user.type(screen.getByRole('searchbox', { name: 'Ürün ara' }), 'Baran Listeli');
    const added = (await screen.findByText('Baran Listeli Ürün')).closest('tr') as HTMLElement;
    await user.hover(within(added).getByRole('button', { name: 'Baran Listeli Ürün fiyatları' }));
    const card = await screen.findByRole('tooltip');
    for (const name of ['FİYAT', 'PERAKENDE', 'TOPTAN', 'BARAN'])
      expect(within(card).getByText(name)).toBeInTheDocument();
  });

  it('telefonda dörtten fazla seçenek açılır listeye döner; yeni liste seçilebilir', async () => {
    await addBaranProduct(450);
    const user = await openProducts(true);
    const select = await screen.findByRole('combobox', { name: 'Listede gösterilecek fiyat' });
    await user.click(select);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['FİYAT', 'PERAKENDE', 'TOPTAN', 'BARAN', 'Alış']);
    await user.click(screen.getByRole('option', { name: 'BARAN' }));
    // Eski ürünün BARAN fiyatı yok; satırın sağında "—" ve liste adı görünür.
    const row = screen.getByRole('button', { name: `${NAME_1} ayrıntılarını aç` });
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('BARAN · KDV Dahil')).toBeInTheDocument();
  });

  it('telefonda açılan satır tüm listeleri kendi adlarıyla gösterir', async () => {
    await addBaranProduct(450);
    const user = await openProducts(true);
    await user.type(screen.getByRole('searchbox', { name: 'Ürün ara' }), 'Baran Listeli');
    await user.click(
      await screen.findByRole('button', { name: 'Baran Listeli Ürün ayrıntılarını aç' }),
    );
    const lists = screen.getByLabelText('Fiyat listeleri');
    for (const name of ['FİYAT', 'PERAKENDE', 'TOPTAN', 'BARAN'])
      expect(within(lists).getByText(name)).toBeInTheDocument();
  });
});

describe('Formda eklenen fiyat listesi ürün listesine yansır (deneme)', () => {
  it('BARAN listesi eklenip fiyatı girilince kaydedilen ürün listede BARAN sütunuyla görünür', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );
    await user.type(await screen.findByLabelText('Ürün Kodu'), 'B-1');
    await user.type(screen.getByLabelText('Ürün Adı'), 'Baran Ürünü');
    await user.type(screen.getByLabelText('Satış Fiyatı'), '50');

    await user.click(screen.getByRole('button', { name: 'Fiyat Adı Ekle' }));
    await user.type(screen.getByLabelText('Yeni fiyat adı'), 'BARAN{Enter}');
    await user.click(await screen.findByRole('tab', { name: 'BARAN' }));
    await user.type(screen.getByLabelText('Satış Fiyatı'), '100');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');

    const saved = (await demoProductService.list()).find((p) => p.code === 'B-1')!;
    const names = listPricesOf(saved).map((l) => l.name);
    expect(names).toEqual(['FİYAT', 'BARAN']);
    const baran = listPricesOf(saved).find((l) => l.name === 'BARAN')!;
    expect(baran.net).toBe(100);
    // Öteki listelerin fiyatları korunur.
    expect(listPricesOf(saved)[0]!.net).toBe(50);
  }, 20000);
});
