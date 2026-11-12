import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calcTax, letterOf } from '../../features/taxes/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path = '/uygulama/tanimlamalar/vergiler', region = 'Vergiler') {
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

describe('Vergiler', () => {
  it('vergi türü kartları oranlarıyla gelir; oran eklenir ve silinir', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const kdv = within(screen.getByRole('list', { name: 'Katma Değer Vergisi oranları' }));
    expect(kdv.getByText('%20')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Katma Değer Vergisi için oran ekle' }));
    await user.type(screen.getByLabelText('Katma Değer Vergisi yeni oran'), '8{Enter}');
    expect(await kdv.findByText('%8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'KDV %8 oranını sil' }));
    await waitFor(() => expect(kdv.queryByText('%8')).not.toBeInTheDocument());
  });

  it('hesaplayıcı: vergi hariçten dahile ve tersine', async () => {
    const user = await open();
    const box = screen.getByRole('region', { name: 'Vergi hesaplayıcı' });
    expect(within(box).getByText('₺1.200,00')).toBeInTheDocument();
    await user.click(within(box).getByRole('radio', { name: 'Vergi dahil' }));
    expect(within(box).getByText('₺833,33')).toBeInTheDocument();
    await user.click(within(box).getByRole('radio', { name: 'KDV %10' }));
    fireEvent.change(within(box).getByLabelText('Tutar'), { target: { value: '1100' } });
    await waitFor(() => expect(within(box).getByText('₺1.000,00')).toBeInTheDocument());
  });

  it('vergi türü eklenir (dock +)', async () => {
    const user = await open();
    await user.click(within(screen.getByRole('navigation', { name: 'Ana gezinme' })).getByRole('button', { name: 'Vergi Türü Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Vergi Türü Ekle' });
    await user.type(within(dialog).getByLabelText('Adı'), 'Konaklama Vergisi');
    await user.type(within(dialog).getByLabelText('Kısa Adı'), 'KON');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Konaklama Vergisi')).toBeInTheDocument();
  });

  it('vergi daireleri: harf süzgeci, arama, sayfalama ve ekleme', async () => {
    const user = await open('/uygulama/tanimlamalar/vergiler?sekme=daireler', 'Vergi Daireleri');
    const list = await screen.findByRole('list', { name: 'Vergi daireleri' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).getByText('Belirtilmemiş')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ş' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Vergi daireleri' })).queryByText('Belirtilmemiş')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Tümü' }));
    await user.type(screen.getByRole('searchbox', { name: 'Vergi dairesi ara' }), 'ceyhan');
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Vergi daireleri' })).getAllByRole('listitem')).toHaveLength(1));
    await user.click(within(screen.getByRole('navigation', { name: 'Ana gezinme' })).getByRole('button', { name: 'Vergi Dairesi Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Vergi Dairesi Ekle' });
    await user.type(within(dialog).getByLabelText('Adı'), 'Ceyhan Yeni V.D.');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Vergi daireleri' })).getAllByRole('listitem')).toHaveLength(2));
  });

  it('yardımcılar', () => {
    expect(calcTax(1000, 20, 'net')).toEqual({ net: 1000, vat: 200, gross: 1200 });
    expect(calcTax(1200, 20, 'gross')).toEqual({ net: 1000, vat: 200, gross: 1200 });
    expect(letterOf('çukurova V.D.')).toBe('Ç');
    expect(letterOf('5 Ocak V.D.')).toBe('#');
  });
});
