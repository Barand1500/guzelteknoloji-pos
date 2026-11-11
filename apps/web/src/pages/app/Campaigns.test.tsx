import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { outcome, summarize } from '../../features/campaigns/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path: string) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('region', { name: 'Genel kural' });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Kampanyalar', () => {
  it('sepet indirimi: genel kural cümlesi düzenlenir, alt adada Kaydet çıkar, deneme sonucu değişir', async () => {
    const user = await open('/uygulama/kampanyalar/sepet-indirimi');
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    expect(within(dock).getByRole('button', { name: 'Kural Ekle' })).toBeInTheDocument();
    const min = screen.getByLabelText('Alt sınır (₺)');
    await user.clear(min);
    await user.type(min, '1000');
    expect(await within(dock).findByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
    // deneme: sepet tutarı eşiğin altına inince indirim kalkar
    fireEvent.change(screen.getByLabelText('Örnek sepet tutarı'), { target: { value: '500' } });
    expect(screen.getByText(/daha → indirim/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Örnek sepet tutarı'), { target: { value: '2000' } });
    await waitFor(() => expect(screen.queryByText(/daha → indirim/)).not.toBeInTheDocument());
    await user.click(within(dock).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(within(dock).queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument(),
    );
  });

  it('özel kural: sihirbazla eklenir, anahtarla kapatılır, silinir', async () => {
    const user = await open('/uygulama/kampanyalar/sepet-indirimi');
    const list = await screen.findByRole('list', { name: 'Kurallar' });
    const before = within(list).getAllByRole('listitem').length;
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'Kural Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Yeni Kural' });
    await user.click(within(dialog).getByRole('button', { name: 'İleri' }));
    const sale = within(dialog).getByLabelText('Alt sınır (₺)');
    await user.clear(sale);
    await user.type(sale, '7500');
    await user.click(within(dialog).getByRole('button', { name: 'İleri' }));
    const value = within(dialog).getByLabelText('İndirim değeri');
    await user.clear(value);
    await user.type(value, '12');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(within(screen.getByRole('list', { name: 'Kurallar' })).getAllByRole('listitem')).toHaveLength(
        before + 1,
      ),
    );
    expect(screen.getByText('7.500 ₺ ve üzeri sepette %12 indirim')).toBeInTheDocument();
    const sw = screen.getByRole('switch', { name: '7.500 ₺ ve üzeri sepette %12 indirim aktif' });
    await user.click(sw);
    await waitFor(() => expect(sw).not.toBeChecked());
    const row = sw.closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'Kuralı sil' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).getByRole('button', {
        name: 'Sil',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('7.500 ₺ ve üzeri sepette %12 indirim')).not.toBeInTheDocument(),
    );
  });

  it('ücretsiz kargo sayfası farklı cümle ve deneme gösterir', async () => {
    await open('/uygulama/kampanyalar/ucretsiz-kargo');
    expect(screen.getByText('kargo ücretsiz olsun.')).toBeInTheDocument();
    expect(screen.queryByLabelText('İndirim değeri')).not.toBeInTheDocument();
    expect(screen.getByText(/Kargo ücretsiz/)).toBeInTheDocument();
  });

  it('yardımcılar: sonuç ve özet', () => {
    const rule = {
      active: true,
      customerTypes: [],
      priceLists: [],
      minTotal: 1000,
      discountKind: 'percent' as const,
      discountValue: 10,
    };
    expect(outcome(rule, 'cart', 500).discount).toBe(0);
    expect(outcome(rule, 'cart', 2000)).toMatchObject({ discount: 200, pay: 1800 });
    expect(outcome({ ...rule, discountKind: 'amount', discountValue: 5000 }, 'cart', 2000).pay).toBe(0);
    expect(outcome(rule, 'shipping', 1000).freeShipping).toBe(true);
    expect(summarize(rule, 'shipping')).toBe('1.000 ₺ ve üzeri sepette kargo ücretsiz');
  });
});
