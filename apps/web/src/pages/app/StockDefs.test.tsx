import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { periodProgress, periodState, type PriceList } from '../../features/stockdefs/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(sekme = '', region = 'Cari Tipleri') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(`/uygulama/tanimlamalar/cari-stok${sekme}`);
  await screen.findByRole('region', { name: region });
  return user;
}
const dock = () => screen.getByRole('navigation', { name: 'Ana gezinme' });

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Cari ve Stok Tanımları', () => {
  it('dört sekme simetriktir; cari tipi etiketle eklenir, adı değişir, silinir', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    expect(
      within(dock())
        .getAllByRole('button')
        .map((b) => b.textContent)
        .filter((t) => t),
    ).toEqual(['Cari Tipleri', 'Stok Tipleri', 'Fiyat Listeleri', 'Ölçü Birimleri']);
    await user.click(within(dock()).getByRole('button', { name: 'Cari Tipi Ekle' }));
    await user.type(await screen.findByLabelText('Yeni cari tipi adı'), 'Kurumsal{Enter}');
    expect(await screen.findByText('Kurumsal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kurumsal adını değiştir' }));
    const edit = await screen.findByLabelText('Kurumsal yeni adı');
    await user.clear(edit);
    await user.type(edit, 'Holding{Enter}');
    expect(await screen.findByText('Holding')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Holding sil' }));
    await user.click(within(await screen.findByRole('dialog', { name: /Silinsin Mi/ })).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(screen.queryByText('Holding')).not.toBeInTheDocument());
  });

  it('fiyat listeleri: varsayılan yıldızı değişir; özel liste tarihle eklenir; varsayılan silinemez', async () => {
    const user = await open('?sekme=fiyat', 'Fiyat Listeleri');
    const list = await screen.findByRole('list', { name: 'Fiyat listeleri' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'FİYAT sil' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'TOPTAN varsayılan yap' }));
    expect(await screen.findByRole('button', { name: 'TOPTAN varsayılan liste' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FİYAT sil' })).toBeInTheDocument();
    await user.click(within(dock()).getByRole('button', { name: 'Fiyat Listesi Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fiyat Listesi Ekle' });
    await user.type(within(dialog).getByLabelText('Adı'), 'bayram');
    await user.click(within(dialog).getByRole('radio', { name: /Özel/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(within(dialog).getByRole('button', { name: /Başlangıç tarihi gerekli/ })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Başlangıç Tarihi'), '2026-12-01');
    await user.type(within(dialog).getByLabelText('Bitiş Tarihi'), '2026-12-10');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('BAYRAM')).toBeInTheDocument();
  });

  it('ölçü birimleri: hazır birim tek dokunuşla eklenir ve şeritten kalkar; kendi birimi eklenir', async () => {
    const user = await open('?sekme=birim', 'Ölçü Birimleri');
    await user.click(await screen.findByRole('button', { name: 'KİLOGRAM ekle' }));
    const list = screen.getByRole('list', { name: 'Ölçü birimleri' });
    await waitFor(() => expect(within(list).getByText('KG')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'KİLOGRAM ekle' })).not.toBeInTheDocument();
    await user.click(within(dock()).getByRole('button', { name: 'Ölçü Birimi Ekle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ölçü Birimi Ekle' });
    await user.type(within(dialog).getByLabelText('Adı'), 'bidon');
    await user.type(within(dialog).getByLabelText('Kısa Adı'), 'bdn');
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await within(screen.getByRole('list', { name: 'Ölçü birimleri' })).findByText('BİDON')).toBeInTheDocument();
  });

  it('yardımcılar: dönem durumu ve ilerleme', () => {
    const l: PriceList = { id: 'x', name: 'X', kind: 'special', start: '2026-11-01', end: '2026-11-21', isDefault: false };
    expect(periodState(l, '2026-10-30')).toBe('upcoming');
    expect(periodState(l, '2026-11-10')).toBe('running');
    expect(periodState(l, '2026-12-01')).toBe('ended');
    expect(periodState({ ...l, kind: 'general' }, '2030-01-01')).toBe('always');
    expect(periodProgress(l, '2026-11-11')).toBe(50);
  });
});
