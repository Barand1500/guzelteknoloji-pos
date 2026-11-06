import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProductService as productService } from '../../features/products/services/product.demo';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

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

/** Sağ kenardaki dikey sekme. */
const tab = (name: string) => screen.getByRole('tab', { name });
/** Açılan yan panel (telefon düzeninin kendi sekme içeriğinden ayırt edilir). */
const panel = () => screen.queryByRole('tabpanel', { name: /^(Özet|Kategori|Fırsat)$/ });

async function openNew(path = '/uygulama/stok-karti/yeni') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByLabelText('Stok Kodu');
  return user;
}

beforeEach(() => productService.reset());
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Stok kartı yan sekmeleri (masaüstü)', () => {
  it('açılışta panel kapalıdır; sağ kenarda Özet, Kategori ve Fırsat sekmeleri durur', async () => {
    await openNew();
    const rail = screen.getByRole('tablist', { name: 'Yan sekmeler' });
    expect(
      within(rail)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Özet', 'Kategori', 'Fırsat']);
    expect(panel()).not.toBeInTheDocument();
    expect(tab('Özet')).toHaveAttribute('aria-selected', 'false');
    // Kaydet formun altındadır.
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
  });

  it('sekmeye tıklayınca panel açılır; aynı sekmeye, ✕ ya da Esc ile kapanır', async () => {
    const user = await openNew();
    await user.click(tab('Özet'));
    expect(panel()).toBeInTheDocument();
    expect(tab('Özet')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Kart önizlemesi')).toBeInTheDocument();

    await user.click(tab('Özet'));
    expect(panel()).not.toBeInTheDocument();

    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('button', { name: 'Paneli kapat' }));
    expect(panel()).not.toBeInTheDocument();

    await user.click(tab('Fırsat'));
    expect(panel()).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(panel()).not.toBeInTheDocument();
  });

  it('başka sekmeye basınca panel o sekmeye döner (tek panel, tek açık sekme)', async () => {
    const user = await openNew();
    await user.click(tab('Kategori'));
    expect(screen.getByRole('heading', { name: 'Kategori' })).toBeInTheDocument();
    await user.click(tab('Fırsat'));
    expect(screen.getAllByRole('tabpanel', { name: /^(Özet|Kategori|Fırsat)$/ })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Fırsat Yönetimi' })).toBeInTheDocument();
    expect(tab('Kategori')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Fırsat')).toHaveAttribute('aria-selected', 'true');
  });

  it('panel açıkken Kaydet yalnızca panelin içindedir (iki tane görünmez)', async () => {
    const user = await openNew();
    await user.click(tab('Kategori'));
    expect(screen.getAllByRole('button', { name: 'Kaydet' })).toHaveLength(1);
    expect(within(panel()!).getByRole('button', { name: 'Kaydet' })).toBeVisible();
  });

  it('kategori seçilir, çip olarak görünür, aranır, ✕ ile kaldırılır; sekmede sayı görünür', async () => {
    const user = await openNew();
    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(screen.getByRole('checkbox', { name: 'Barkod Okuyucular kategorisini seç' }));
    expect(
      screen.getByRole('button', { name: 'Dokunmatik POS kategorisini kaldır' }),
    ).toBeVisible();
    expect(screen.getByText('2 seçili')).toBeInTheDocument();
    expect(tab('Kategori')).toHaveTextContent('2');

    await user.type(screen.getByRole('searchbox', { name: 'Kategori ara' }), 'yazıcı');
    const list = screen.getByRole('list', { name: 'Kategoriler' });
    expect(within(list).getAllByRole('checkbox')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Barkod Okuyucular kategorisini kaldır' }));
    expect(screen.getByText('1 seçili')).toBeInTheDocument();
  });

  it('seçimler panel kapanıp açılınca korunur', async () => {
    const user = await openNew();
    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(tab('Kategori')); // kapat
    await user.click(tab('Kategori')); // aç
    expect(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' })).toBeChecked();
  });

  it('fırsat tek dokunuşla açılıp kapanır ve sekmede sayı görünür', async () => {
    const user = await openNew();
    await user.click(tab('Fırsat'));
    const sw = screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('1 açık')).toBeInTheDocument();
    expect(tab('Fırsat')).toHaveTextContent('1');
  });

  it('kaydedince seçilen kategori ve fırsat ürüne yazılır; kayıt sonrası kartlar durumu gösterir', async () => {
    const user = await openNew();
    await user.type(screen.getByLabelText('Stok Kodu'), 'KUTU-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Kutulu Ürün');
    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(tab('Fırsat'));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' })); // panelin içindeki Kaydet

    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    const saved = (await productService.list()).find((p) => p.code === 'KUTU-1');
    expect(saved?.categoryIds).toEqual(['pos']);
    expect(saved?.dealIds).toEqual(['yeni']);

    expect(screen.getByRole('link', { name: /Kategori.*1 kategori/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fırsat Yönetimi.*1 fırsat/ })).toBeInTheDocument();
  });

  it('kayıt sonrası karta dokununca düzenleme ekranında o panel açık ve seçim korunmuş gelir', async () => {
    const user = await openNew();
    await user.type(screen.getByLabelText('Stok Kodu'), 'KUTU-2');
    await user.type(screen.getByLabelText('Stok Adı'), 'Kutulu Ürün 2');
    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');

    await user.click(screen.getByRole('link', { name: /Ürün hangi kategorilerde/ }));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('KUTU-2');
    expect(screen.getByRole('heading', { name: 'Stok Kartını Düzenle' })).toBeInTheDocument();
    expect(tab('Kategori')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' })).toBeChecked();
  });

  it('düzenlemede ürünün kayıtlı kategorisi ve fırsatı dolu gelir; değişiklik kaydedilir', async () => {
    const user = await openNew('/uygulama/stok-karti/p1');
    await waitFor(() => expect(tab('Kategori')).toHaveTextContent('1'));
    expect(tab('Fırsat')).toHaveTextContent('1');

    await user.click(tab('Fırsat'));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' })); // kapat
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    expect((await productService.list()).find((p) => p.id === 'p1')?.dealIds).toEqual([]);
  });

  it('adresteki ?ac= değeri ilgili paneli açık getirir', async () => {
    await openNew('/uygulama/stok-karti/p1?ac=firsat');
    expect(await screen.findByRole('heading', { name: 'Fırsat Yönetimi' })).toBeInTheDocument();
    expect(tab('Fırsat')).toHaveAttribute('aria-selected', 'true');
  });

  it('gerçek hesapta kategori ve fırsat sekmeleri API seçenekleriyle açıktır, Özet çalışır', async () => {
    mockFetch({
      ...anonymousRoutes,
      'GET /api/auth/me': () =>
        jsonResponse(200, {
          user: { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null },
        }),
    });
    const user = userEvent.setup();
    renderApp('/uygulama/stok-karti/yeni');
    await screen.findByLabelText('Stok Kodu');
    expect(tab('Kategori')).toBeEnabled();
    expect(tab('Fırsat')).toBeEnabled();
    await user.click(tab('Kategori'));
    expect(panel()).toBeInTheDocument();
    await user.click(tab('Özet'));
    expect(screen.getByLabelText('Kart önizlemesi')).toBeInTheDocument();
  });
});

describe('Stok kartı yan sekmeleri (telefon)', () => {
  it('sağ kenarda sekmeler durur, panel açılınca yüzen Kaydet gizlenir', async () => {
    stubNarrowScreen();
    const user = await openNew();
    expect(screen.getByRole('tablist', { name: 'Yan sekmeler' })).toBeInTheDocument();
    expect(panel()).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Kaydet' })).toHaveLength(1); // yüzen düğme

    await user.click(tab('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    expect(tab('Kategori')).toHaveTextContent('1');
    // Panel açıkken tek Kaydet vardır ve panelin içindedir.
    expect(screen.getAllByRole('button', { name: 'Kaydet' })).toHaveLength(1);
    expect(within(panel()!).getByRole('button', { name: 'Kaydet' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Paneli kapat' }));
    expect(panel()).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Kaydet' })).toHaveLength(1);
  });
});
