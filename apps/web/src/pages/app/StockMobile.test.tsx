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
    // Sağ kenardaki yan sekmeler (Özet/Kategori/Fırsat) ayrıdır; burada yalnızca bölüm sekmeleri sayılır.
    const sections = screen.getByRole('tablist', { name: 'Stok kartı bölümleri' });
    const tabs = within(sections)
      .getAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Ürün', 'Fiyat', 'Barkod', 'Ölçü']);
    expect(screen.getByRole('tab', { name: 'Ürün' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Ürün Kodu')).toBeInTheDocument();
    // Yan panel kapalı başlar.
    expect(screen.queryByLabelText('Kart önizlemesi')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));
    // Fiyat sekmesi Kasa Modu: dev rakam ekranı + tuş takımı
    expect(screen.getByLabelText('Satış fiyatı')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'KDV oranı' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Ürün Kodu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ölçü' }));
    expect(screen.getByLabelText('Ağırlık')).toBeInTheDocument();
  });

  it('birim ekleyince yeni birim çipi oluşur ve Barkod/Ölçü sekmelerinde kart olarak görünür', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));
    const units = () =>
      within(screen.getByRole('radiogroup', { name: 'Birim' })).getAllByRole('radio');
    expect(units()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Birim Ekle' }));
    expect(units()).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Barkod' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(screen.getByRole('tab', { name: 'Ölçü' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('yüzen Kaydet düğmesi kaydeder', async () => {
    const user = await openStockCard();
    await user.type(screen.getByLabelText('Ürün Adı'), 'Deneme Ürünü');
    // Üstteki canlı özet adı gösterir.
    expect(
      within(screen.getByLabelText('Kart özeti')).getByText('Deneme Ürünü'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
  });

  it('listeler telefonda da açılır ve seçim yapılır (portal)', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    await user.click(screen.getByRole('option', { name: 'ASYS' }));
    expect(screen.getByRole('combobox', { name: 'Marka' })).toHaveTextContent('ASYS');
  });

  it('Kasa Modu: tuşlarla fiyat girilir (rakam, tek virgül, silme), Satış/Alış arasında geçilir', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));

    const sale = () => screen.getByLabelText('Satış fiyatı');
    for (const k of ['4', '5', '0']) await user.click(screen.getByRole('button', { name: k }));
    expect(sale()).toHaveTextContent('450');

    // Binlik ayraç yalnızca ekranda; tek virgül; en çok 2 ondalık
    await user.click(screen.getByRole('button', { name: '00' }));
    expect(sale()).toHaveTextContent('45.000');
    await user.click(screen.getByRole('button', { name: 'Virgül' }));
    await user.click(screen.getByRole('button', { name: 'Virgül' }));
    for (const k of ['5', '7', '9']) await user.click(screen.getByRole('button', { name: k }));
    expect(sale()).toHaveTextContent('45.000,57');
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    expect(sale()).toHaveTextContent('45.000,5');

    // KDV çipi + hesap
    await user.click(screen.getByRole('radio', { name: '% 10' }));
    expect(screen.getByRole('radio', { name: '% 10' })).toBeChecked();

    // Alış tarafına geç
    await user.click(screen.getByRole('button', { name: 'Alış fiyatına geç' }));
    expect(screen.getByLabelText('Alış fiyatı')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByLabelText('Alış fiyatı')).toHaveTextContent('1');
    // Satışa dönünce önceki değer korunur
    await user.click(screen.getByRole('button', { name: 'Satış fiyatına geç' }));
    expect(sale()).toHaveTextContent('45.000,5');
  });

  it('Kasa Modu: iskonto düzenlenir (en çok %100) ve Kaydet tuşu kartı kaydeder', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('tab', { name: 'Fiyat' }));
    await user.click(screen.getByRole('button', { name: /İskonto %0/ }));
    expect(screen.getByLabelText('Satış iskontosu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    expect(screen.getByLabelText('Satış iskontosu')).toHaveTextContent('100');
    // 1000 olmaz: üst sınır %100
    await user.click(screen.getByRole('button', { name: '0' }));
    expect(screen.getByLabelText('Satış iskontosu')).toHaveTextContent('100');

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Deneme tamamlandı!')).toBeInTheDocument();
  });

  it('telefonda açılır liste alttan açılan sheet olur (Kapat düğmesi ile)', async () => {
    const user = await openStockCard();
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
