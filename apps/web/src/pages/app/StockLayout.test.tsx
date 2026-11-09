import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
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
    await user.selectOptions(screen.getByLabelText(/Üst kategori/), 'pos');
    await user.type(screen.getByLabelText('Yeni kategori adı'), 'Yeni Alt Grup{Enter}');
    const group = screen.getByRole('group', { name: 'Kategori seçenekleri' });
    expect(await within(group).findByRole('checkbox', { name: 'Yeni Alt Grup' })).toBeChecked();
    const created = (await demoCategoryService.list()).find((c) => c.name === 'Yeni Alt Grup');
    expect(created?.parentId).toBe('pos');
  });
});
