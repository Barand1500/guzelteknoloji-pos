import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function openHome() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/anasayfa');
  await screen.findByRole('radiogroup', { name: 'Dönem' });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Anasayfa', () => {
  it('karşılama kartı, sayı kutuları ve tüm bloklar gelir; alt çubuk bloklara kayar', async () => {
    await openHome();
    expect(await screen.findByText('Bu ayın cirosu')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Gelir Raporu' })).toBeInTheDocument();
    for (const name of ['Sipariş Durumu', 'Son Siparişler', 'Ödeme Şekilleri', 'Ürün Hareketleri'])
      expect(await screen.findByRole('region', { name })).toBeInTheDocument();
    const dock = screen.getByRole('navigation', { name: 'Anasayfa bölümleri' });
    expect(
      within(dock)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Özet', 'Gelir', 'Sipariş', 'Ödeme', 'Ürün']);
  });

  it('dönem değişince ciro ve başlık değişir', async () => {
    const user = await openHome();
    await user.click(screen.getByRole('radio', { name: 'Bugün' }));
    expect(await screen.findByText('Bugünün cirosu')).toBeInTheDocument();
    await waitFor(() => {
      const hero = screen.getByText('Bugünün cirosu').parentElement!.parentElement!;
      expect(within(hero).getAllByText(/18\.450,00/).length).toBeGreaterThan(0);
    });
  });

  it('gelir grafiğinde seri gizlenir; ürün sekmeleri arasında geçilir', async () => {
    const user = await openHome();
    const group = await screen.findByRole('group', { name: 'Seriler' });
    await user.click(within(group).getByRole('button', { name: 'Maliyet' }));
    expect(within(group).getByRole('button', { name: 'Maliyet' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(await screen.findByRole('tab', { name: 'Fiyat Alarmı' }));
    expect(
      within(screen.getByRole('list', { name: 'Ürünler' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });

  it('üst menüde Anasayfa gerçek sayfadır ("Yakında" değil)', async () => {
    await openHome();
    expect(screen.getByRole('button', { name: 'Ana menü' })).toHaveTextContent('Anasayfa');
  });
});
