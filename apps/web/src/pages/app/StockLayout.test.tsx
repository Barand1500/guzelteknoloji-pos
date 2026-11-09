import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { demoProductService } from '../../features/products/services/product.demo';
import { demoBrandService } from '../../features/brands/services/brand.demo';
import { demoCategoryService } from '../../features/categories/services/category.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

afterEach(() => sessionStorage.clear());

async function openNewCard() {
  sessionStorage.setItem('gt-dev-access', '1');
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/stok-karti/yeni');
  await screen.findByLabelText('Ürün Kodu');
  return user;
}

describe('Stok kartı: Fiyat ve Birimler düzeni', () => {
  it('barkod (tür + barkod + ekle) birim ve çarpanın yanındaki üst satırdadır; ayrı satır yoktur', async () => {
    const user = await openNewCard();
    const unit = screen.getByRole('article', { name: '1. birim' });
    const group = within(unit).getByRole('group', { name: 'Barkod ekle' });
    expect(within(group).getByRole('combobox', { name: 'Barkod Türü' })).toBeInTheDocument();
    // Birim ve Çarpan ile aynı üst satırda (aynı kapsayıcı).
    const header = group.closest('.flex-wrap') as HTMLElement;
    expect(within(header).getByRole('combobox', { name: 'Birim' })).toBeInTheDocument();
    expect(within(header).getByLabelText('Çarpan')).toBeInTheDocument();

    await user.type(within(group).getByLabelText('Barkod'), '8690001{Enter}');
    expect(within(unit).getByRole('list', { name: 'Eklenen barkodlar' })).toHaveTextContent(
      '8690001',
    );
  });

  it('Birim Açıklama ve Ek Alış/Satış Fiyatları kalktı; KDV Dahil büyük D ile yazılır', async () => {
    await openNewCard();
    expect(screen.queryByLabelText('Birim Açıklama')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ek (Alış|Satış) Fiyatları/ })).toBeNull();
    expect(screen.getAllByText(/KDV Dahil:/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/KDV dahil/)).not.toBeInTheDocument();
  });
});

describe('Alt çubuk: "+" düğmesi stok kartında Kaydet olur', () => {
  it('stok kartında tek Kaydet (alt çubuk) vardır, "+" bağlantısı görünmez', async () => {
    await openNewCard();
    expect(screen.getAllByRole('button', { name: 'Kaydet' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Yeni Stok Kartı' })).not.toBeInTheDocument();
  });

  it('başka sayfaya geçince tekrar "+" olur', async () => {
    const user = await openNewCard();
    await user.click(screen.getByRole('link', { name: 'Ürünler' }));
    expect(await screen.findByRole('link', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument();
  });
});

describe('Ürün Bilgisi: Kategori seçici ve hızlı ekleme', () => {
  it('Kategori kutusundan çoklu seçilir; seçilenler kutunun içinde çip olarak görünür; yan sekmede Kategori yoktur', async () => {
    const user = await openNewCard();
    expect(screen.queryByLabelText('Diğer Vergi Ekle')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Kategori' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kategori' }));
    const group = screen.getByRole('group', { name: 'Kategori seçenekleri' });
    await user.click(within(group).getByRole('checkbox', { name: 'Dokunmatik POS' }));
    expect(within(group).getByRole('checkbox', { name: 'Dokunmatik POS' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Kategori' })).toHaveTextContent('Dokunmatik POS');
  });

  it('Marka: listede olmayan marka adı yazılıp hemen eklenir ve seçilir', async () => {
    const user = await openNewCard();
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    await user.type(screen.getByPlaceholderText('Yeni marka adı…'), 'Yepyeni Marka{Enter}');
    expect(await screen.findByRole('combobox', { name: 'Marka' })).toHaveTextContent(
      'Yepyeni Marka',
    );
    expect((await demoBrandService.list()).some((b) => b.name === 'Yepyeni Marka')).toBe(true);
  });

  it('Kategori: üst kategori (isteğe bağlı) ve ad yazılınca eklenir ve seçili gelir', async () => {
    const user = await openNewCard();
    await user.click(screen.getByRole('button', { name: 'Kategori' }));
    await user.click(screen.getByRole('button', { name: 'Yeni kategori ekle' }));
    await user.click(screen.getByRole('button', { name: 'Üst kategori seç' }));
    await user.click(screen.getByRole('option', { name: 'Dokunmatik POS' }));
    expect(screen.getByRole('button', { name: 'Üst kategori seç' })).toHaveTextContent(
      'Dokunmatik POS',
    );
    await user.type(screen.getByLabelText('Yeni kategori adı'), 'Yeni Alt Grup{Enter}');
    const group = screen.getByRole('group', { name: 'Kategori seçenekleri' });
    expect(await within(group).findByRole('checkbox', { name: 'Yeni Alt Grup' })).toBeChecked();
    const created = (await demoCategoryService.list()).find((c) => c.name === 'Yeni Alt Grup');
    expect(created?.parentId).toBe('pos');
  });
});

describe('Ürün Bilgisi: Fırsat ekle / Özellik ekle satırı', () => {
  it('yan sekme yoktur; satırdaki bağlantılar altta seçim alanı açar, seçim sayısı yanında görünür', async () => {
    const user = await openNewCard();
    expect(screen.queryByRole('tablist', { name: 'Yan sekmeler' })).not.toBeInTheDocument();
    const deal = screen.getByRole('button', { name: 'Fırsat ekle' });
    const attr = screen.getByRole('button', { name: 'Özellik ekle' });
    expect(deal).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('switch', { name: 'Yeni Ürünler fırsatı' })).not.toBeInTheDocument();

    await user.click(deal);
    expect(deal).toHaveAttribute('aria-expanded', 'true');
    const pill = screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' });
    expect(pill).toHaveAttribute('aria-checked', 'false');
    await user.click(pill);
    expect(pill).toHaveAttribute('aria-checked', 'true');
    expect(deal).toHaveTextContent('1');

    // Özellik açılınca fırsat alanı kapanır (tek alan açık).
    await user.click(attr);
    expect(attr).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('switch', { name: 'Yeni Ürünler fırsatı' })).not.toBeInTheDocument();
  });

  it('kaydedilince seçilen fırsat ürüne yazılır', async () => {
    const user = await openNewCard();
    await user.type(screen.getByLabelText('Ürün Kodu'), 'HIZLI-1');
    await user.type(screen.getByLabelText('Ürün Adı'), 'Hızlı Ürün');
    await user.click(screen.getByRole('button', { name: 'Fırsat ekle' }));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    const saved = (await demoProductService.list()).find((p) => p.code === 'HIZLI-1');
    expect(saved?.dealIds).toEqual(['yeni']);
  });
});

describe('Özellik ekle: gruplar açılır kapanır', () => {
  it('gruplar başta kapalıdır; grup açılınca değerleri çıkar, seçim kapalıyken de özette görünür', async () => {
    const user = await openNewCard();
    await user.click(screen.getByRole('button', { name: 'Özellik ekle' }));
    // Başta hiçbir grubun değeri görünmez.
    expect(screen.queryByRole('checkbox', { name: 'Siyah' })).not.toBeInTheDocument();
    const group = screen.getByRole('button', { name: /^Renk/ });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await user.click(group);
    await user.click(screen.getByRole('checkbox', { name: 'Siyah' }));
    await user.click(screen.getByRole('button', { name: /^Renk/ })); // kapat
    expect(screen.queryByRole('checkbox', { name: 'Siyah' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Renk/ })).toHaveTextContent('Siyah');
  });
});

describe('Kayıt sonrası ekran: ürün önizlemesi', () => {
  it('ürün bilgisi, fiyat, fırsat ve seçilen özellikler alt alta özetlenir', async () => {
    const user = await openNewCard();
    await user.type(screen.getByLabelText('Ürün Kodu'), 'ONIZ-1');
    await user.type(screen.getByLabelText('Ürün Adı'), 'Önizleme Ürünü');
    await user.click(screen.getByRole('button', { name: 'Fırsat ekle' }));
    await user.click(screen.getByRole('switch', { name: 'Yeni Ürünler fırsatı' }));
    await user.click(screen.getByRole('button', { name: 'Özellik ekle' }));
    await user.click(screen.getByRole('button', { name: /^Renk/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Siyah' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
    expect(screen.getByLabelText('Ürün önizlemesi')).toBeInTheDocument();
    expect(screen.getByText('Önizleme Ürünü')).toBeInTheDocument();
    expect(screen.getByText('Renk:')).toBeInTheDocument();
    expect(screen.getAllByText('Siyah').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yeni Ürünler').length).toBeGreaterThan(0);
  });
});
