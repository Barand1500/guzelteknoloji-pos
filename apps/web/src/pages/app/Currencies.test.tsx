import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRate, mockRate } from '../../features/currencies/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open() {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/tanimlamalar/para-birimleri');
  await screen.findByRole('list', { name: 'Para birimleri' });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Para Birimleri', () => {
  it('kartlar gelir; ana para birimi silinemez, otomatik olanda güncelle düğmesi vardır', async () => {
    await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    expect(screen.getByText('Ana para birimi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Türk Lirası sil' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ABD Doları kurunu şimdi güncelle' })).toBeInTheDocument();
    expect(screen.getByText(/1 USD = ₺50,30/)).toBeInTheDocument();
  });

  it('hızlı ekleme: sembol seçince ad/kısa ad dolar, kur Merkez Bankası’ndan önizlenir, aktif eklenir', async () => {
    const user = await open();
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'Para Birimi Ekle' }));
    const form = await screen.findByRole('region', { name: 'Yeni para birimi' });
    await user.click(within(form).getByRole('button', { name: 'Japon Yeni (¥)' }));
    expect(within(form).getByLabelText('Adı')).toHaveValue('Japon Yeni');
    expect(within(form).getByLabelText('Kısa Adı')).toHaveValue('JPY');
    expect(await within(form).findByText(/₺0,3373/)).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Yeni para birimi' })).not.toBeInTheDocument());
    const sw = screen.getByRole('switch', { name: 'Japon Yeni aktif' });
    expect(sw).toBeChecked();
  });

  it('elle kur: kur yazılmadan kaydedilmez; sil onay ister', async () => {
    const user = await open();
    await user.click(within(screen.getByRole('navigation', { name: 'Ana gezinme' })).getByRole('button', { name: 'Para Birimi Ekle' }));
    const form = await screen.findByRole('region', { name: 'Yeni para birimi' });
    fireEvent.change(within(form).getByLabelText('Sembol'), { target: { value: '₮' } });
    await user.type(within(form).getByLabelText('Adı'), 'Tugrik');
    await user.type(within(form).getByLabelText('Kısa Adı'), 'MNT');
    await user.click(within(form).getByRole('radio', { name: /Elle/ }));
    await user.click(within(form).getByRole('button', { name: 'Kaydet' }));
    expect(within(form).getByRole('button', { name: /Kuru yazın/ })).toBeInTheDocument();
    await user.type(within(form).getByLabelText('Kur (₺)'), '0,015');
    await user.click(within(form).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText(/1 MNT = ₺0,015/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tugrik sil' }));
    expect(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).toBeInTheDocument();
  });

  it('yardımcılar', () => {
    expect(mockRate('usd', 'efektifSatis')).toBeCloseTo(50.5514, 3);
    expect(mockRate('XYZ', 'dovizAlis')).toBeNull();
    expect(formatRate(50.3)).toBe('50,30');
  });
});
