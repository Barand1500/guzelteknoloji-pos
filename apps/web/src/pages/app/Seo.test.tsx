import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seoTab } from '../../features/seo/types';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path = '/uygulama/seo', region = 'Kategori') {
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

describe('SEO Ayarları', () => {
  it('satırlar URL | TITLE | DESCRIPTION tablosunda gelir; başlık kaydedilir', async () => {
    const user = await open();
    expect(await screen.findByText('ÖRNEK VERİ')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Kategori SEO kayıtları' });
    expect(within(table).getByText('URL')).toBeInTheDocument();
    expect(within(table).getByText('/elektronik')).toBeInTheDocument();
    const row = within(table).getByText('/elektronik').closest('tr')!;
    const title = within(row as HTMLElement).getByLabelText('Elektronik için SEO Başlığı');
    expect(title).toHaveValue('Elektronik Ürünler ve Fiyatları');
    await user.clear(title);
    await user.type(title, 'Elektronik Ürünler');
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(within(row as HTMLElement).queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument());
    expect(within(row as HTMLElement).getByLabelText('Elektronik için SEO Başlığı')).toHaveValue('Elektronik Ürünler');
  });

  it('yeşil + 301 yönlendirme ekler; 301 satırı düzenlenir ve çöpüyle silinir', async () => {
    const user = await open('/uygulama/seo', 'Kategori');
    const table = await screen.findByRole('table', { name: 'Kategori SEO kayıtları' });
    await user.click(within(table).getByRole('button', { name: 'Elektronik için 301 yönlendirme ekle' }));
    const dialog = await screen.findByRole('dialog', { name: '301 Yönlendirme Ekle' });
    // Eski adres "/" ile başlamalı.
    await user.type(within(dialog).getByLabelText('Eski Adres'), 'eski-elektronik');
    await user.click(within(dialog).getByRole('button', { name: 'Ekle' }));
    expect(await within(dialog).findByText('Eski adres "/" ile başlamalı.')).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Eski Adres'));
    await user.type(within(dialog).getByLabelText('Eski Adres'), '/eski-elektronik');
    await user.click(within(dialog).getByRole('button', { name: 'Ekle' }));
    const redirectRow = await within(table).findByText('/eski-elektronik').then((el) => el.closest('tr')!);
    expect(within(redirectRow as HTMLElement).getByText('301')).toBeInTheDocument();

    // 301 satırının kendi başlığı düzenlenip kaydedilir.
    const redirectTitle = within(redirectRow as HTMLElement).getByLabelText('/eski-elektronik için SEO Başlığı');
    await user.type(redirectTitle, 'Eski Sayfa');
    await user.click(within(redirectRow as HTMLElement).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(within(redirectRow as HTMLElement).queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument());

    await user.click(within(table).getByRole('button', { name: '/eski-elektronik yönlendirmesini sil' }));
    await screen.findByRole('dialog', { name: '301 Yönlendirmeyi Sil' });
    await user.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(within(table).queryByText('/eski-elektronik')).not.toBeInTheDocument());
  });

  it('sabit sayfa sekmesi de örnek satırlarla tabloyu gösterir', async () => {
    const user = await open('/uygulama/seo?sekme=sabit-sayfa', 'Sabit Sayfa');
    const table = await screen.findByRole('table', { name: 'Sabit Sayfa SEO kayıtları' });
    expect(within(table).getByText('/hakkimizda')).toBeInTheDocument();
    expect(within(table).getByText('/kurumsal/hakkimizda')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'sabit sayfa ara' }), 'yok');
    await waitFor(() => expect(screen.getByText('Aramaya uyan sabit sayfa yok')).toBeInTheDocument());
    // Ürün sekmesindeki 301 örneği kendi satırında gelir.
    await user.click(screen.getByRole('button', { name: 'Ürün' }));
    const productTable = await screen.findByRole('table', { name: 'Ürün SEO kayıtları' });
    expect(within(productTable).getByText('/urun/defter')).toBeInTheDocument();
    expect(within(productTable).getByText('/urun/ajanda-defter')).toBeInTheDocument();
  });

  it('arama örnek veriyi süzer ve boş durum gösterir', async () => {
    const user = await open();
    const box = screen.getByRole('searchbox', { name: 'kategori ara' });
    await user.type(box, 'defter');
    await waitFor(() => expect(screen.getByText('Aramaya uyan kategori yok')).toBeInTheDocument());
  });

  it('sekme yardımcısı: bilinmeyen sekmede kategoriye düşer', () => {
    expect(seoTab('yok').id).toBe('kategori');
    expect(seoTab('marka').label).toBe('Marka');
  });
});
