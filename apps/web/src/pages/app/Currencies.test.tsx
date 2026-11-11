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
  it('kur panosu gelir: ana para birimi, kurlar ve tek dokunuşla ekleme şeridi', async () => {
    await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const board = screen.getByRole('list', { name: 'Para birimleri' });
    expect(within(board).getAllByRole('listitem')).toHaveLength(4);
    expect(within(board).getByText('Ana')).toBeInTheDocument();
    expect(within(board).getByText('₺50,30')).toBeInTheDocument();
    // hazır sembollerden zaten ekli olanlar şeritte görünmez
    expect(screen.queryByRole('button', { name: 'ABD Doları ekle' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Japon Yeni ekle' })).toBeInTheDocument();
  });

  it('tek dokunuşla ekleme: Merkez Bankası kuruyla ve aktif olarak eklenir', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Japon Yeni ekle' }));
    const board = screen.getByRole('list', { name: 'Para birimleri' });
    await waitFor(() => expect(within(board).getAllByRole('listitem')).toHaveLength(5));
    expect(within(board).getByText('₺0,3373')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Japon Yeni ekle' })).not.toBeInTheDocument();
  });

  it('satıra basınca düzenleyici açılır: elle kur zorunlu, kaydedilir, pasifleştirilir ve silinir', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'ABD Doları düzenle' }));
    await user.click(screen.getByRole('radio', { name: 'Elle' }));
    const dock = screen.getByRole('navigation', { name: 'Ana gezinme' });
    await user.click(within(dock).getByRole('button', { name: 'Kaydet' }));
    expect(screen.getByText(/Kuru yazın/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Kur (₺)'), '51,5');
    await user.click(within(dock).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('₺51,50')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ABD Doları düzenle' }));
    await user.click(screen.getByRole('switch', { name: 'ABD Doları aktif' }));
    await waitFor(() => expect(screen.getAllByText('Pasif')).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'ABD Doları sil' }));
    expect(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).toBeInTheDocument();
  });

  it('özel ekleme: dock “+” sembol-öncelikli pencereyi açar; sembol seçince ad dolar', async () => {
    const user = await open();
    await user.click(within(screen.getByRole('navigation', { name: 'Ana gezinme' })).getByRole('button', { name: 'Para Birimi Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Para Birimi Ekle' });
    await user.click(within(dialog).getByRole('button', { name: 'Hindistan Rupisi (₹)' }));
    expect(within(dialog).getByLabelText('Adı')).toHaveValue('Hindistan Rupisi');
    expect(within(dialog).getByLabelText('Kısa Adı')).toHaveValue('INR');
    fireEvent.change(within(dialog).getByLabelText('Sembol'), { target: { value: '₮' } });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Para birimleri' })).getByText('INR')).toBeInTheDocument());
  });

  it('yardımcılar', () => {
    expect(mockRate('usd', 'efektifSatis')).toBeCloseTo(50.5514, 3);
    expect(mockRate('XYZ', 'dovizAlis')).toBeNull();
    expect(formatRate(50.3)).toBe('50,30');
  });
});
