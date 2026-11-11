import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeTiers, priceFor, withVat, type Tier } from '../../features/shipping/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path = '/uygulama/tanimlamalar/kargo', region = 'Firmalar') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('region', { name: region });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Kargo ve Nakliye', () => {
  it('firmalar: kart listesi, firma eklenir, fiyat penceresinde deneme çalışır', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Kargo firmaları' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'Firma Ekle' }));
    const form = await screen.findByRole('dialog', { name: 'Firma Ekle' });
    await user.type(within(form).getByLabelText('Adı'), 'Aras Kargo');
    await user.type(within(form).getByLabelText('Kısa Adı'), 'ARS');
    await user.click(within(form).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(within(screen.getByRole('list', { name: 'Kargo firmaları' })).getAllByRole('listitem')).toHaveLength(3),
    );
    // fiyatlar: DHL, 7 desi → 194,36 ₺ (6-10 basamağı)
    await user.click(within(within(list).getAllByRole('listitem')[0]!).getByRole('button', { name: 'Fiyatlar' }));
    const prices = await screen.findByRole('dialog', { name: /Fiyatlar/ });
    expect(within(prices).getByText(/194,36/)).toBeInTheDocument();
    fireEvent.change(within(prices).getByLabelText('Denenecek desi'), { target: { value: '40' } });
    // 31+ → 30 desi basamağı (389,11) + 10 ek desi × 13,96
    await waitFor(() => expect(within(prices).getByText(/528,71/)).toBeInTheDocument());
  });

  it('lokasyonlar: adım adım iner, yoldan geri çıkılır, alt düzeye eklenir', async () => {
    const user = await open('/uygulama/tanimlamalar/kargo?sekme=lokasyonlar', 'Lokasyonlar');
    await screen.findByRole('list', { name: 'Ülkeler' });
    await user.click(screen.getByRole('button', { name: 'Türkiye içine gir' }));
    const iller = await screen.findByRole('list', { name: 'İller' });
    expect(within(iller).getByText('Adana')).toBeInTheDocument();
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'İl Ekle' }));
    const sheet = await screen.findByRole('dialog', { name: 'İl Ekle' });
    await user.type(within(sheet).getByLabelText('İl adı'), 'Bursa');
    await user.click(within(sheet).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Bursa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adana içine gir' }));
    expect(await screen.findByRole('list', { name: 'İlçeler' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ülkeler' }));
    expect(await screen.findByRole('list', { name: 'Ülkeler' })).toBeInTheDocument();
  });

  it('tanımlar: liste seçilir, öğe eklenir ve silinir', async () => {
    const user = await open('/uygulama/tanimlamalar/kargo?sekme=tanimlar', 'Tanımlar');
    const tabs = await screen.findByRole('tablist', { name: 'Tanım listeleri' });
    expect(within(tabs).getAllByRole('tab')).toHaveLength(7);
    await user.click(within(tabs).getByRole('tab', { name: /Yasak Kargolar/ }));
    expect(await screen.findByText('Parlayıcı Maddeler')).toBeInTheDocument();
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'Yasak Kargo Ekle' }));
    const sheet = await screen.findByRole('dialog', { name: 'Yasak Kargo Ekle' });
    await user.type(within(sheet).getByLabelText('Başlık'), 'Silah');
    await user.click(within(sheet).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Silah')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Silah sil' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).getByRole('button', { name: 'Sil' }),
    );
    await waitFor(() => expect(screen.queryByText('Silah')).not.toBeInTheDocument());
  });

  it('yardımcılar: basamak hesabı ve düzenleme', () => {
    const tiers: Tier[] = [
      { to: 2, price: 100, perUnit: false },
      { to: 10, price: 200, perUnit: false },
      { to: null, price: 10, perUnit: true },
    ];
    expect(priceFor(tiers, 1)).toBe(100);
    expect(priceFor(tiers, 7)).toBe(200);
    expect(priceFor(tiers, 15)).toBe(250); // 200 + 5 ek × 10
    expect(withVat(100, 20)).toBe(120);
    const fixed = normalizeTiers([
      { to: 12, price: 1, perUnit: false },
      { to: 5, price: 2, perUnit: false },
      { to: 99, price: 3, perUnit: true },
    ]);
    expect(fixed.map((t) => t.to)).toEqual([12, 13, null]);
  });
});
