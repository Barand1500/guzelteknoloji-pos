import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path: string) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('button', { name: 'Ana menü' });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Üst menü (bölüm gezgini)', () => {
  it('düğme bulunulan bölümü gösterir; menü bölümleri listeler ve Esc ile kapanır', async () => {
    const user = await open('/uygulama/urunler');
    const trigger = screen.getByRole('button', { name: 'Ana menü' });
    expect(trigger).toHaveTextContent('Ürünler');
    await user.click(trigger);
    const menu = await screen.findByRole('dialog', { name: 'Ana menü' });
    const tabs = within(menu).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/[0-9—]+$/, ''))).toEqual([
      'Anasayfa',
      'Siparişler',
      'Müşteriler',
      'Ürünler',
      'Kampanyalar',
      'Tanımlamalar',
      'Mobil Bildirimler',
      'Seo',
    ]);
    // Ürünler sayfaları kart olarak çıkar.
    const panel = within(menu).getByRole('tabpanel', { name: 'Ürünler' });
    for (const name of ['Kategoriler', 'Markalar', 'Özellikler', 'Fırsatlar', 'Toplu Görsel'])
      expect(within(panel).getByRole('link', { name: new RegExp(name) })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Ana menü' })).not.toBeInTheDocument();
  });

  it('sayfa kartına basınca gidilir ve menü kapanır; alt çubuk bölüme göre değişir', async () => {
    const user = await open('/uygulama/urunler');
    await user.click(screen.getByRole('button', { name: 'Ana menü' }));
    await user.click(await screen.findByRole('button', { name: 'Ayarlar' }));
    const panel = screen.getByRole('tabpanel', { name: 'Ayarlar' });
    await user.click(within(panel).getByRole('link', { name: /Roller/ }));
    expect(screen.queryByRole('dialog', { name: 'Ana menü' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana menü' })).toHaveTextContent('Ayarlar');
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    expect(within(dock).getByRole('link', { name: /Kullanıcılar/ })).toBeInTheDocument();
    expect(within(dock).queryByRole('link', { name: /Kategoriler/ })).not.toBeInTheDocument();
  });

  it('yapılmamış bölüm "Yakında" sayfasına gider ve alt çubuk görünmez', async () => {
    const user = await open('/uygulama/urunler');
    await user.click(screen.getByRole('button', { name: 'Ana menü' }));
    await user.click(await screen.findByRole('tab', { name: /Siparişler/ }));
    await user.click(
      within(screen.getByRole('tabpanel', { name: 'Siparişler' })).getByRole('link', {
        name: /Siparişler/,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Siparişler' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Ana gezinme' })).not.toBeInTheDocument();
  });

  it('arama tüm bölümlerin sayfalarında çalışır', async () => {
    const user = await open('/uygulama/urunler');
    await user.click(screen.getByRole('button', { name: 'Ana menü' }));
    await user.type(screen.getByRole('searchbox', { name: 'Menüde ara' }), 'rol');
    const panel = screen.getByRole('tabpanel', { name: 'Arama sonuçları' });
    expect(within(panel).getByRole('link', { name: /Roller/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('link', { name: /Markalar/ })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Menüde ara' }));
    await user.type(screen.getByRole('searchbox', { name: 'Menüde ara' }), 'zzz');
    expect(screen.getByText(/ile eşleşen sayfa yok/)).toBeInTheDocument();
  });
});
