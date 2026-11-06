import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productService } from '../../features/products/services/product.service';
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

/** Başlık düğmesi: erişilebilir adı "Başlık + durum yazısı" olduğu için başlangıca göre aranır. */
const box = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) });

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

describe('Stok kartı yan kutuları (masaüstü)', () => {
  it('açılışta yalnızca Özet açıktır; Kategori ve Fırsat kapalı tek satırdır', async () => {
    await openNew();
    expect(box('Özet')).toHaveAttribute('aria-expanded', 'true');
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'false');
    expect(box('Fırsat Yönetimi')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Kart önizlemesi')).toBeInTheDocument();
    expect(box('Kategori')).toHaveTextContent('Seçilmedi');
  });

  it('bir kutuyu açmak diğerini kapatır; tekrar tıklayınca kendisi kapanır', async () => {
    const user = await openNew();
    await user.click(box('Kategori'));
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'true');
    expect(box('Özet')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Kart önizlemesi')).not.toBeInTheDocument();

    await user.click(box('Fırsat Yönetimi'));
    expect(box('Fırsat Yönetimi')).toHaveAttribute('aria-expanded', 'true');
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'false');

    await user.click(box('Fırsat Yönetimi'));
    expect(box('Fırsat Yönetimi')).toHaveAttribute('aria-expanded', 'false');
  });

  it('kategori seçilir, çip olarak görünür, aranır ve ✕ ile kaldırılır', async () => {
    const user = await openNew();
    await user.click(box('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(screen.getByRole('checkbox', { name: 'Barkod Okuyucular kategorisini seç' }));
    expect(
      screen.getByRole('button', { name: 'Dokunmatik POS kategorisini kaldır' }),
    ).toBeVisible();
    expect(box('Kategori')).toHaveTextContent('Dokunmatik POS +1');

    await user.type(screen.getByRole('searchbox', { name: 'Kategori ara' }), 'yazıcı');
    const list = screen.getByRole('list', { name: 'Kategoriler' });
    expect(within(list).getAllByRole('checkbox')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Barkod Okuyucular kategorisini kaldır' }));
    expect(box('Kategori')).toHaveTextContent('Dokunmatik POS');
    expect(box('Kategori')).not.toHaveTextContent('+1');
  });

  it('fırsat tek dokunuşla açılıp kapanır ve durum yazısı güncellenir', async () => {
    const user = await openNew();
    await user.click(box('Fırsat Yönetimi'));
    const sw = screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(box('Fırsat Yönetimi')).toHaveTextContent('1 seçili');
  });

  it('kaydedince seçilen kategori ve fırsat ürüne yazılır; kayıt sonrası kartlar durumu gösterir', async () => {
    const user = await openNew();
    await user.type(screen.getByLabelText('Stok Kodu'), 'KUTU-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Kutulu Ürün');
    await user.click(box('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(box('Fırsat Yönetimi'));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    const saved = (await productService.list()).find((p) => p.code === 'KUTU-1');
    expect(saved?.categoryIds).toEqual(['pos']);
    expect(saved?.dealIds).toEqual(['yeni']);

    expect(screen.getByRole('link', { name: /Kategori.*1 kategori/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fırsat Yönetimi.*1 fırsat/ })).toBeInTheDocument();
  });

  it('kayıt sonrası karta dokununca düzenleme ekranında o kutu açık ve seçim korunmuş gelir', async () => {
    const user = await openNew();
    await user.type(screen.getByLabelText('Stok Kodu'), 'KUTU-2');
    await user.type(screen.getByLabelText('Stok Adı'), 'Kutulu Ürün 2');
    await user.click(box('Kategori'));
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');

    await user.click(screen.getByRole('link', { name: /Ürün hangi kategorilerde/ }));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('KUTU-2');
    expect(screen.getByRole('heading', { name: 'Stok Kartını Düzenle' })).toBeInTheDocument();
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' })).toBeChecked();
  });

  it('düzenlemede ürünün kayıtlı kategorisi ve fırsatı dolu gelir; değişiklik kaydedilir', async () => {
    const user = await openNew('/uygulama/stok-karti/p1');
    await waitFor(() => expect(box('Kategori')).toHaveTextContent('Dokunmatik POS'));
    expect(box('Fırsat Yönetimi')).toHaveTextContent('1 seçili');

    await user.click(box('Fırsat Yönetimi'));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' })); // kapat
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Deneme tamamlandı!');
    expect((await productService.list()).find((p) => p.id === 'p1')?.dealIds).toEqual([]);
  });

  it('gerçek hesapta kategori ve fırsat kutuları kilitlidir ve seçim gönderilmez', async () => {
    mockFetch({
      ...anonymousRoutes,
      'GET /api/auth/me': () =>
        jsonResponse(200, {
          user: { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null },
        }),
    });
    renderApp('/uygulama/stok-karti/yeni');
    await screen.findByLabelText('Stok Kodu');
    expect(screen.getAllByText('Sunucuya bağlanınca açılır')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Kategori/ })).not.toBeInTheDocument();
    expect(box('Özet')).toBeInTheDocument();
  });
});

describe('Stok kartı yan kutuları (telefon)', () => {
  it('Kategori ve Fırsat kutuları kapalı tek satırdır; Özet ayrı şerittir', async () => {
    stubNarrowScreen();
    const user = await openNew();
    expect(screen.queryByRole('button', { name: /^Özet/ })).not.toBeInTheDocument();
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'false');
    await user.click(box('Kategori'));
    expect(box('Kategori')).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('checkbox', { name: 'Dokunmatik POS kategorisini seç' }));
    expect(box('Kategori')).toHaveTextContent('Dokunmatik POS');
  });
});
