import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
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

describe('Diğer Vergi Ekle', () => {
  it('seçilen vergi için oran alanı belirir; eklenen vergi listeden düşer; ✕ ile kaldırılır', async () => {
    const user = await openNewCard();
    await user.click(screen.getByRole('combobox', { name: 'Diğer Vergi Ekle' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Seçilmedi',
      'ÖTV',
      'MTV',
      'ÖİV',
      'Alış ÖTV',
      'Satış ÖTV',
      'Konaklama Vergisi',
    ]);
    await user.click(screen.getByRole('option', { name: 'ÖTV' }));
    await user.type(screen.getByLabelText('ÖTV'), '18');
    expect(screen.getByLabelText('ÖTV')).toHaveValue('18');

    await user.click(screen.getByRole('combobox', { name: 'Diğer Vergi Ekle' }));
    expect(screen.queryByRole('option', { name: 'ÖTV' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'MTV' }));
    expect(screen.getByLabelText('MTV')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ÖTV vergisini kaldır' }));
    expect(screen.queryByLabelText('ÖTV')).not.toBeInTheDocument();
    expect(screen.getByLabelText('MTV')).toBeInTheDocument();
  });
});
