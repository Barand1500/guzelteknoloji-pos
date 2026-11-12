import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bridgeFor, groupBlocks, parseNager, type OfficialDay } from '../../features/holidays/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/tanimlamalar/resmi-tatiller');
  await screen.findByRole('region', { name: 'Takvim' });
  return user;
}
const dock = () => screen.getByRole('navigation', { name: 'Ana gezinme' });

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Resmi Tatil Günleri', () => {
  it('yıl listesi art arda günleri tek tatil olarak birleştirir; listeden seçince ayrıntı açılır', async () => {
    const user = await open();
    const list = await screen.findByRole('list', { name: 'Tatil listesi' });
    // yedek liste (2026): Kurban Bayramı 4 günlük tek kayıt
    const kurban = await within(list).findByRole('button', { name: /Kurban Bayramı, 27 Mayıs – 30 Mayıs/ });
    await user.click(kurban);
    const cal = screen.getByRole('region', { name: 'Takvim' });
    expect(within(cal).getByText(/4 gün/)).toBeInTheDocument();
    expect(within(cal).getByText('Resmî tatil · otomatik güncellenir')).toBeInTheDocument();
    expect(within(cal).getByRole('heading', { name: /Mayıs 2026/ })).toBeInTheDocument();
  });

  it('takvimde boş güne basınca seçilir, ad yazılıp dock Kaydet ile özel tatil eklenir ve silinir', async () => {
    const user = await open();
    const list = await screen.findByRole('list', { name: 'Tatil listesi' });
    await user.click(await within(list).findByRole('button', { name: /Zafer Bayramı/ })); // Ağustos'a git
    await user.click(screen.getByRole('button', { name: '2026-08-10' }));
    await user.click(screen.getByRole('button', { name: '2026-08-12' }));
    expect(screen.getByText(/· 3 gün/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tatilin adı'), 'Sayım');
    await user.click(within(dock()).getByRole('button', { name: 'Kaydet' }));
    expect(await within(screen.getByRole('list', { name: 'Tatil listesi' })).findByRole('button', { name: /Sayım/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /2026-08-11/ }));
    await user.click(await screen.findByRole('button', { name: 'Sayım sil' }));
    await user.click(within(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).getByRole('button', { name: 'Sil' }));
    await waitFor(() =>
      expect(within(screen.getByRole('list', { name: 'Tatil listesi' })).queryByRole('button', { name: /Sayım/ })).not.toBeInTheDocument(),
    );
  });

  it('dock + ile aralık takvimden başlangıç-bitiş seçilerek eklenir', async () => {
    const user = await open();
    await user.click(within(dock()).getByRole('button', { name: 'Tatil Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tatil Ekle' });
    await user.type(within(dialog).getByLabelText('Tatilin Adı'), 'Yıllık bakım');
    await user.click(within(dialog).getByRole('button', { name: '1 hafta' }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(
      await within(screen.getByRole('list', { name: 'Tatil listesi' })).findByRole('button', { name: /Yıllık bakım/ }),
    ).toBeInTheDocument();
  });

  it('yardımcılar: Nager yanıtı, birleştirme ve köprü önerisi', () => {
    const days = parseNager([
      { date: '2027-03-10', localName: 'Ramazan Bayramı 1. Gün (Tentative Date)' },
      { date: '2027-03-11', localName: 'Ramazan Bayramı 2. Gün (Tentative Date)' },
      { date: 'x' },
    ]);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ name: 'Ramazan Bayramı 1. Gün', tentative: true });
    const blocks = groupBlocks(days, [{ id: 'c1', name: 'Sayım', start: '2027-04-01', end: '2027-04-02' }]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ name: 'Ramazan Bayramı', days: 2, start: '2027-03-10', end: '2027-03-11' });
    const thursday: OfficialDay[] = [{ date: '2026-10-29', name: 'Cumhuriyet Bayramı', tentative: false }];
    const b = groupBlocks(thursday, [])[0]!;
    expect(bridgeFor(b, new Set())).toEqual({ day: '2026-10-30', total: 4 });
    expect(bridgeFor(b, new Set(['2026-10-30']))).toBeNull();
  });
});
