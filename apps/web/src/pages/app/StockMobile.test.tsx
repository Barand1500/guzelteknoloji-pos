import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

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

beforeEach(() => {
  mockFetch(anonymousRoutes);
  stubNarrowScreen();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

async function openStockCard() {
  const user = userEvent.setup();
  renderApp();
  await user.click(await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }));
  await screen.findByRole('tablist', { name: 'Stok kartı bölümleri' });
  return user;
}

describe('Telefon düzeni (sekmeler + yana kaydırmalı birim kartları)', () => {
  it('4 sekme gösterir; Ürün sekmesi açık başlar ve sekmeler arası geçilir', async () => {
    const user = await openStockCard();
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Ürün', 'Fiyat', 'Barkod', 'Ölçü']);
    expect(screen.getByRole('tab', { name: 'Ürün' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Stok Kodu')).toBeInTheDocument();
    // Masaüstü özeti telefonda yoktur.
    expect(screen.queryByLabelText('Kart önizlemesi')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));
    expect(screen.getByLabelText('Alış Fiyatı')).toBeInTheDocument();
    expect(screen.queryByLabelText('Stok Kodu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ölçü' }));
    expect(screen.getByLabelText('Ağırlık')).toBeInTheDocument();
  });

  it('birim ekleyince yeni kart oluşur ve Barkod/Ölçü sekmelerinde de görünür', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Birim Ekle' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Barkod' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(screen.getByRole('tab', { name: 'Ölçü' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('yüzen Kaydet düğmesi kaydeder', async () => {
    const user = await openStockCard();
    await user.type(screen.getByLabelText('Stok Adı'), 'Deneme Ürünü');
    // Üstteki canlı özet adı gösterir.
    expect(
      within(screen.getByLabelText('Kart özeti')).getByText('Deneme Ürünü'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Stok kartı kaydedildi!')).toBeInTheDocument();
  });

  it('listeler telefonda da açılır ve seçim yapılır (portal)', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    await user.click(screen.getByRole('option', { name: 'ASYS' }));
    expect(screen.getByRole('combobox', { name: 'Marka' })).toHaveTextContent('ASYS');
  });
});
