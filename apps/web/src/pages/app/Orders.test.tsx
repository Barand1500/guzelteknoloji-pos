import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterOrders, emptyOrderFilters, ordersToCsv } from '../../features/orders/order-filter';
import { orderSeeds, returnSeeds } from '../../mocks/orders.mock';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path: string, ready: RegExp | string) {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('radiogroup', { name: ready });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

const pending = orderSeeds.filter((o) => o.status === 'pending');

describe('Gelen Siparişler', () => {
  it('özet kutuları, sayaçlı durum hapları ve 10 satırlık ilk sayfa gelir', async () => {
    await open('/uygulama/siparisler', 'Sipariş durumu');
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const chips = screen.getByRole('radiogroup', { name: 'Sipariş durumu' });
    expect(
      within(chips).getByRole('radio', { name: new RegExp(`Tümü\\s*${orderSeeds.length}`) }),
    ).toBeChecked();
    expect(
      within(chips).getByRole('radio', { name: new RegExp(`Bekliyor\\s*${pending.length}`) }),
    ).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(1 + 10);
    expect(screen.getByRole('navigation', { name: 'Sayfalama' })).toBeInTheDocument();
  });

  it('durum hapı listeyi süzer; arama müşteri ve sipariş no üzerinde çalışır', async () => {
    const user = await open('/uygulama/siparisler', 'Sipariş durumu');
    const chips = screen.getByRole('radiogroup', { name: 'Sipariş durumu' });
    await user.click(within(chips).getByRole('radio', { name: /^Bekliyor/ }));
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
        1 + Math.min(10, pending.length),
      ),
    );
    await user.click(within(chips).getByRole('radio', { name: /^Tümü/ }));
    await user.type(screen.getByRole('searchbox', { name: 'Sipariş ara' }), orderSeeds[0]!.no);
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2),
    );
  });

  it('filtre paneli: ödeme durumu ve kaynak süzer, rozet sayıyı gösterir, Sıfırla temizler', async () => {
    const user = await open('/uygulama/siparisler', 'Sipariş durumu');
    await user.click(screen.getByRole('button', { name: 'Filtreler' }));
    const panel = screen.getByRole('region', { name: 'Filtreler' });
    await user.click(within(panel).getByRole('radio', { name: 'Ödenmedi' }));
    const unpaid = orderSeeds.filter((o) => !o.paid).length;
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: new RegExp(`^Tümü\\s*${unpaid}`) }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Filtreler' })).toHaveTextContent('1');
    await user.click(within(panel).getByRole('button', { name: 'Sıfırla' }));
    expect(
      screen.getByRole('radio', { name: new RegExp(`^Tümü\\s*${orderSeeds.length}`) }),
    ).toBeInTheDocument();
  });

  it('sipariş ayrıntısı açılır ve "sıradaki adıma geç" durumu ilerletir', async () => {
    const user = await open('/uygulama/siparisler', 'Sipariş durumu');
    const target = pending[0]!;
    await user.click(screen.getByRole('radio', { name: /^Bekliyor/ }));
    await user.click(
      await screen.findByRole('button', { name: `${target.no} numaralı siparişi görüntüle` }),
    );
    const dialog = await screen.findByRole('dialog', { name: `Sipariş #${target.no}` });
    expect(within(dialog).getByRole('list', { name: 'Siparişteki ürünler' })).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: /Sıradaki adıma geç: Hazırlanıyor/ }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: /Sıradaki adıma geç: Kargoda/ }),
      ).toBeInTheDocument(),
    );
  });

  it('filtre ve CSV yardımcıları', () => {
    const f = { ...emptyOrderFilters, paid: 'unpaid' as const };
    expect(filterOrders(orderSeeds, f).every((o) => !o.paid)).toBe(true);
    const csv = ordersToCsv(orderSeeds.slice(0, 2));
    expect(csv.startsWith('﻿"Sipariş No"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3);
  });
});

describe('İade/Değişim Talepleri', () => {
  it('bekleyen talep onaylanır; tip seçici süzer', async () => {
    const user = await open('/uygulama/siparisler/iade', 'Talep durumu');
    const chips = screen.getByRole('radiogroup', { name: 'Talep durumu' });
    const pendingCount = returnSeeds.filter((r) => r.status === 'pending').length;
    expect(
      await within(chips).findByRole('radio', {
        name: new RegExp(`Beklemede\\s*${pendingCount}`),
      }),
    ).toBeInTheDocument();
    const first = returnSeeds.find((r) => r.status === 'pending')!;
    await user.click(
      (
        await within(await screen.findByRole('table')).findAllByRole('button', {
          name: `${first.customer} talebini onayla`,
        })
      )[0]!,
    );
    await waitFor(() =>
      expect(
        within(chips).getByRole('radio', { name: new RegExp(`Beklemede\\s*${pendingCount - 1}`) }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('radio', { name: 'Değişim' }));
    const exchanges = returnSeeds.filter((r) => r.kind === 'exchange').length;
    expect(
      within(chips).getByRole('radio', { name: new RegExp(`Tümü\\s*${exchanges}`) }),
    ).toBeInTheDocument();
  });

  it('alt çubukta iki sayfa vardır', async () => {
    await open('/uygulama/siparisler/iade', 'Talep durumu');
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    expect(within(dock).getByRole('link', { name: /Gelen Siparişler/ })).toBeInTheDocument();
    expect(within(dock).getByRole('link', { name: /İade\/Değişim/ })).toBeInTheDocument();
  });
});
