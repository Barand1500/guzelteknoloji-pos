import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await user.click(await screen.findByRole('button', { name: 'Ana menü' }));
  return { user, menu: await screen.findByRole('dialog', { name: 'Ana menü' }) };
}

beforeEach(() => {
  // Telefon: geniş ekran sorgusu eşleşmez.
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
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Başlat Menüsü (telefon: alttan açılan kadran)', () => {
  it('kadranda 8 bölüm vardır (Ayarlar çarktadır); bulunulan bölüm seçili gelir', async () => {
    const { menu } = await open();
    const tabs = within(menu).getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Anasayfa',
      'Siparişler',
      'Müşteriler',
      'Ürünler',
      'Kampanyalar',
      'Tanımlamalar',
      'Bildirimler',
      'Seo',
    ]);
    expect(within(menu).getByRole('tab', { selected: true })).toHaveAttribute(
      'aria-label',
      'Ürünler',
    );
    const panel = within(menu).getByRole('tabpanel', { name: 'Ürünler' });
    expect(within(panel).getByRole('link', { name: /Kategoriler/ })).toBeInTheDocument();
  });

  it('kadrandan bölüm seçilince sayfalar değişir; sayfaya basınca gidilir ve menü kapanır', async () => {
    const { user, menu } = await open();
    await user.click(within(menu).getByRole('tab', { name: 'Siparişler' }));
    const panel = within(menu).getByRole('tabpanel', { name: 'Siparişler' });
    await user.click(within(panel).getByRole('link', { name: /İade\/Değişim/ }));
    expect(screen.queryByRole('dialog', { name: 'Ana menü' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana menü' })).toHaveTextContent('Siparişler');
  });

  it('çark Ayarlar sayfalarını açar; arama tüm bölümlerde çalışır; ✕ kapatır', async () => {
    const { user, menu } = await open();
    await user.click(within(menu).getByRole('button', { name: 'Ayarlar' }));
    expect(
      within(within(menu).getByRole('tabpanel', { name: 'Ayarlar' })).getByRole('link', {
        name: /Roller/,
      }),
    ).toBeInTheDocument();
    await user.type(within(menu).getByRole('searchbox', { name: 'Menüde ara' }), 'marka');
    expect(
      within(within(menu).getByRole('tabpanel', { name: 'Arama sonuçları' })).getByRole('link', {
        name: /Markalar/,
      }),
    ).toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Menüyü kapat' }));
    expect(screen.queryByRole('dialog', { name: 'Ana menü' })).not.toBeInTheDocument();
  });
});
