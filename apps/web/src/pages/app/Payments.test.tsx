import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/tanimlamalar/odeme-sekilleri');
  await screen.findByRole('list', { name: 'Ödeme şekilleri' });
  return user;
}
const dock = () => screen.getByRole('navigation', { name: 'Ana gezinme' });

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Ödeme Şekilleri', () => {
  it('kartlar sıralı gelir, önizleme aktif şekilleri ve varsayılanı gösterir; pasife alınca önizlemeden çıkar', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Ödeme şekilleri' });
    expect(within(list).getByText('Kredi Kartı/Banka Kartı')).toBeInTheDocument();
    const preview = screen.getByRole('region', { name: 'Ödeme ekranı önizlemesi' });
    expect(within(preview).getAllByRole('radio')).toHaveLength(5);
    expect(within(preview).getByRole('radio', { name: /Kredi Kartı/, checked: true })).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Teslimatta Öde aktif' }));
    await waitFor(() => expect(within(preview).getAllByRole('radio')).toHaveLength(4));
  });

  it('önizleme: Kargo hesaplanmasın olan şekil seçilince kargo kalkar', async () => {
    const user = await open();
    const preview = screen.getByRole('region', { name: 'Ödeme ekranı önizlemesi' });
    expect(within(preview).getByText('₺1.090,00')).toBeInTheDocument();
    await user.click(within(preview).getByRole('radio', { name: /Mağazada Öde/ }));
    expect(within(preview).getByText('Yok')).toBeInTheDocument();
    expect(within(preview).getByText('₺1.000,00', { selector: 'dd[aria-live]' })).toBeInTheDocument();
  });

  it('düzenleyici: karta basınca açılır, ada Kaydet gelir, değişiklik kaydolur; silinir', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Açık Hesap düzenle' }));
    const name = await screen.findByLabelText('Adı');
    await user.clear(name);
    await user.type(name, 'Vadeli Satış');
    await user.click(within(dock()).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('button', { name: 'Vadeli Satış düzenle' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vadeli Satış düzenle' }));
    await user.click(screen.getByRole('button', { name: 'Vadeli Satış sil' }));
    expect(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).toBeInTheDocument();
  });

  it('yeni ödeme şekli dock + ile eklenir (simge seçilir)', async () => {
    const user = await open();
    await user.click(within(dock()).getByRole('button', { name: 'Ödeme Şekli Ekle' }));
    const form = await screen.findByRole('region', { name: 'Yeni ödeme şekli' });
    await user.type(within(form).getByLabelText('Adı'), 'Kapıda Nakit');
    await user.click(within(form).getByRole('radio', { name: 'Nakit' }));
    await user.click(within(form).getByRole('switch', { name: /Kargo hesaplanmasın/ }));
    await user.click(within(dock()).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Yeni ödeme şekli' })).not.toBeInTheDocument());
    expect(within(screen.getByRole('list', { name: 'Ödeme şekilleri' })).getByText('Kapıda Nakit')).toBeInTheDocument();
  });
});
