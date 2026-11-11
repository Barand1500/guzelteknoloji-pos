import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  customersToCsv,
  emptyCustomerFilters,
  filterCustomers,
} from '../../features/customers/customer-filter';
import { customerSeeds } from '../../mocks/customers.mock';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path = '/uygulama/musteriler') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Müşteriler listesi', () => {
  it('özet kutuları ve 10 satır gelir; arama ve süzgeç çalışır', async () => {
    const user = await open();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 10);
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Müşteri ara' }), 'belpos');
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2),
    );
    await user.clear(screen.getByRole('searchbox', { name: 'Müşteri ara' }));
    await user.click(screen.getByRole('button', { name: 'Süzgeçler' }));
    const dialog = await screen.findByRole('dialog', { name: 'Süzgeçler' });
    await user.click(within(dialog).getByRole('radio', { name: /Tüzel Kişi/ }));
    const corp = customerSeeds.filter((c) => c.kind === 'corporate').length;
    await user.click(within(dialog).getByRole('button', { name: `${corp} Müşteriyi Göster` }));
    const chips = await screen.findByRole('list', { name: 'Açık süzgeçler' });
    expect(within(chips).getByText('Tüzel Kişi')).toBeInTheDocument();
  });

  it('müşteriye basınca müşteri sayfası açılır; 5 sekme vardır ve sekmeler geçiş yapar', async () => {
    const user = await open();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', { name: 'Müşteri ara' }), 'yunus');
    await user.click(await screen.findByText('Yunus Durgun'));
    expect(await screen.findByRole('region', { name: 'Müşteri özeti' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Müşteri bölümleri' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Bilgiler', 'Adresler', 'Hesap', 'Alışveriş', 'Geri Bildirim']);
    // Bilgiler: giriş hesapları + anahtar
    const users = await screen.findByRole('list', { name: 'Kullanıcılar' });
    const toggle = within(users).getByRole('switch', { name: 'Yunus Durgun girişi' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    await user.click(within(tabs).getByRole('tab', { name: 'Hesap' }));
    expect(await screen.findByRole('list', { name: 'Hesap hareketleri' })).toBeInTheDocument();
    await user.click(within(tabs).getByRole('tab', { name: 'Alışveriş' }));
    const sub = await screen.findByRole('tablist', { name: 'Alışveriş bölümleri' });
    expect(within(sub).getAllByRole('tab')).toHaveLength(6);
    await user.click(within(sub).getByRole('tab', { name: /Favoriler/ }));
    expect(await screen.findByRole('list', { name: 'Favoriler' })).toBeInTheDocument();
    await user.click(within(tabs).getByRole('tab', { name: 'Geri Bildirim' }));
    const fb = await screen.findByRole('tablist', { name: 'Geri bildirim bölümleri' });
    expect(within(fb).getAllByRole('tab')).toHaveLength(3);
  });

  it('düzenle: kişi tipi tüzel olunca etiketler değişir; geçersiz e-posta engellenir; sil onay ister', async () => {
    const user = await open('/uygulama/musteriler/c1');
    await screen.findByRole('region', { name: 'Müşteri özeti' });
    await user.click(screen.getByRole('button', { name: 'Düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Müşteriyi Düzenle' });
    await user.click(within(dialog).getByRole('radio', { name: /Tüzel Kişi/ }));
    expect(within(dialog).getByLabelText('Ünvan')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Vergi No/)).toBeInTheDocument();
    const email = within(dialog).getByLabelText('E-posta');
    await user.clear(email);
    await user.type(email, 'yanlis');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByRole('button', { name: /Geçerli bir e-posta/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }));
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    expect(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).toBeInTheDocument();
  });

  it('yardımcılar: süzgeç ve CSV', () => {
    expect(
      filterCustomers(customerSeeds, { ...emptyCustomerFilters, balance: 'debtor' }).every(
        (c) => c.debt > c.credit,
      ),
    ).toBe(true);
    const csv = customersToCsv(customerSeeds.slice(0, 2));
    expect(csv.startsWith('\uFEFF"Müşteri Kodu"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3);
  });
});
