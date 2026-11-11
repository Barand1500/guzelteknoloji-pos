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

async function openOrders() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/siparisler');
  await screen.findByRole('table');
  return user;
}

describe('Gelen Siparişler', () => {
  it('özet kutuları, 10 satırlık ilk sayfa ve sipariş sahnesi gelir; durum hapları yoktur', async () => {
    await openOrders();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Sipariş durumu' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1 + 10);
    expect(screen.getByRole('navigation', { name: 'Sayfalama' })).toBeInTheDocument();
    const scene = screen.getByRole('region', { name: 'Sipariş sahnesi' });
    expect(within(scene).getByRole('list', { name: 'Sipariş adımları' })).toBeInTheDocument();
    expect(within(scene).getByRole('img')).toBeInTheDocument();
  });

  it('arama müşteri ve sipariş no üzerinde çalışır', async () => {
    const user = await openOrders();
    await user.type(screen.getByRole('searchbox', { name: 'Sipariş ara' }), orderSeeds[0]!.no);
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2),
    );
  });

  it('Süzgeçler penceresi: ödeme durumu seçilir, canlı sayı yazar, etiket çıkar ve kaldırılır', async () => {
    const user = await openOrders();
    await user.click(screen.getByRole('button', { name: 'Süzgeçler' }));
    const dialog = await screen.findByRole('dialog', { name: 'Süzgeçler' });
    await user.click(within(dialog).getByRole('radio', { name: /Ödenmedi/ }));
    const unpaid = orderSeeds.filter((o) => !o.paid).length;
    await user.click(within(dialog).getByRole('button', { name: `${unpaid} Siparişi Göster` }));
    const chips = await screen.findByRole('list', { name: 'Açık süzgeçler' });
    expect(within(chips).getByText('Ödenmedi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Süzgeçler, 1 açık' })).toBeInTheDocument();
    await user.click(within(chips).getByRole('button', { name: 'Ödenmedi süzgecini kaldır' }));
    expect(screen.queryByRole('list', { name: 'Açık süzgeçler' })).not.toBeInTheDocument();
  });

  it('sahne: satıra basınca sipariş sahneye gelir; adım ilerler, iptal koliyi çöpe atar', async () => {
    const user = await openOrders();
    const target = pending[0]!;
    await user.type(screen.getByRole('searchbox', { name: 'Sipariş ara' }), target.no);
    const scene = screen.getByRole('region', { name: 'Sipariş sahnesi' });
    await waitFor(() =>
      expect(within(scene).getByText(new RegExp(`#${target.no}`))).toBeInTheDocument(),
    );
    expect(within(scene).getByRole('img')).toHaveAccessibleName(/koli hazırlanıyor/);
    await user.click(within(scene).getByRole('button', { name: /Sıradaki adım: Hazırlanıyor/ }));
    await waitFor(() =>
      expect(within(scene).getByRole('img')).toHaveAccessibleName(/koli bantlanıyor/),
    );
    await user.click(within(scene).getByRole('button', { name: /Sıradaki adım: Kargoda/ }));
    await waitFor(() => expect(within(scene).getByRole('img')).toHaveAccessibleName(/yolda/));
    await user.click(within(scene).getByRole('button', { name: 'İptal Et' }));
    await waitFor(() => expect(within(scene).getByRole('img')).toHaveAccessibleName(/çöpe gitti/));
    expect(within(scene).getByText('İptal Edildi')).toBeInTheDocument();
  });

  it('sipariş ayrıntısı açılır ve "sıradaki adıma geç" durumu ilerletir', async () => {
    const user = await openOrders();
    const target = pending[0]!;
    await user.type(screen.getByRole('searchbox', { name: 'Sipariş ara' }), target.no);
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

  it('dışa aktarma sihirbazı: ne indirilsin → sütunlar → özet; belirli durum seçilebilir', async () => {
    const user = await openOrders();
    await user.click(screen.getByRole('button', { name: 'Dışa aktar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Siparişleri Dışa Aktar' });
    expect(within(dialog).getByRole('list', { name: 'Adımlar' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: /Belirli bir durum/ }));
    await user.click(within(dialog).getByRole('radio', { name: 'Bekliyor' }));
    expect(within(dialog).getByText(`${pending.length} sipariş`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Devam' }));
    await user.click(within(dialog).getByRole('switch', { name: 'Ürünler' }));
    await user.click(within(dialog).getByRole('button', { name: 'Devam' }));
    expect(within(dialog).getByText('siparisler.csv (Excel)')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'İndir' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Siparişleri Dışa Aktar' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('filtre, CSV ve dışa aktarma seçici yardımcıları', async () => {
    const { selectForExport, distinctProducts } =
      await import('../../features/orders/order-filter');
    const f = { ...emptyOrderFilters, paid: 'unpaid' as const };
    expect(filterOrders(orderSeeds, f).every((o) => !o.paid)).toBe(true);
    const csv = ordersToCsv(orderSeeds.slice(0, 2));
    expect(csv.startsWith('\uFEFF"Sipariş No"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(ordersToCsv(orderSeeds.slice(0, 1), ['no', 'lines']).split('\r\n')[0]).toBe(
      '﻿"Sipariş No";"Ürünler"',
    );
    const code = distinctProducts(orderSeeds)[0]!.code;
    expect(
      selectForExport(orderSeeds, [], { kind: 'product', code }).every((o) =>
        o.lines.some((l) => l.code === code),
      ),
    ).toBe(true);
    expect(selectForExport(orderSeeds, [], { kind: 'all' })).toHaveLength(orderSeeds.length);
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
    // İade sayfasındayken yalnızca İade düğmesi seçilidir (Gelen Siparişler değil).
    expect(within(dock).getByRole('link', { name: /İade\/Değişim/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(dock).getByRole('link', { name: /Gelen Siparişler/ })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
