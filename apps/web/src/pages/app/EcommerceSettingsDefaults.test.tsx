import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';
import type { Brand } from '@gt/shared';
import type { Category } from '../../features/categories/types';

const authenticated = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: 'user', email: 'test@example.com', displayName: null, avatarUrl: null },
    }),
  'GET /api/hesap/ayarlar/site_defaults': () => jsonResponse(200, { values: {}, configured: [] }),
};

const categories: Category[] = [
  {
    id: '1',
    parentId: null,
    name: 'Elektronik',
    description: '',
    imageUrl: null,
    active: true,
    hidden: false,
    seoTitle: '',
    seoDescription: '',
    productCount: 0,
    childCount: 1,
  },
  {
    id: '2',
    parentId: '1',
    name: 'Telefon',
    description: '',
    imageUrl: null,
    active: true,
    hidden: false,
    seoTitle: '',
    seoDescription: '',
    productCount: 3,
    childCount: 0,
  },
];

const brands: Brand[] = [
  {
    id: '10',
    name: 'Acme',
    description: '',
    logoUrl: null,
    active: true,
    seoTitle: '',
    seoDescription: '',
    productCount: 2,
  },
];

const ok = () => jsonResponse(200, []);

const loaded = {
  ...authenticated,
  'GET /api/kategoriler': () => jsonResponse(200, categories),
  'GET /api/markalar': () => jsonResponse(200, brands),
  'GET /api/para-birimleri': ok,
  'GET /api/cari-stok/olcu-birimleri': ok,
  'GET /api/cari-stok/fiyat-listeleri': ok,
  'GET /api/cari-stok/stok-tipleri': ok,
  'GET /api/cari-stok/cari-tipleri': ok,
  'GET /api/vergi-daireleri': ok,
};

describe('Varsayılanlar ekranı gerçek listelerle çalışır', () => {
  it('kategori seçenekleri ağaç yoluyla, markalar gerçek listeyle gelir', async () => {
    mockFetch(loaded);
    renderApp('/uygulama/ayarlar/eticaret/varsayilanlar');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Kategori' }));
    const categoryList = await screen.findByRole('listbox', { name: 'Kategori' });
    expect(
      within(categoryList).getByRole('option', { name: 'Elektronik › Telefon' }),
    ).toBeVisible();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('combobox', { name: 'Marka' }));
    const brandList = await screen.findByRole('listbox', { name: 'Marka' });
    expect(within(brandList).getByRole('option', { name: 'Acme' })).toBeVisible();
  });

  it('tek liste düşse de diğerleri dolar ve eksik liste adıyla söylenir', async () => {
    mockFetch({
      ...loaded,
      'GET /api/markalar': () =>
        jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Sunucu hatası' } }),
    });
    renderApp('/uygulama/ayarlar/eticaret/varsayilanlar');
    const user = userEvent.setup();

    expect(await screen.findByText(/Şu listeler yüklenemedi: marka/)).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Kategori' }));
    const categoryList = await screen.findByRole('listbox', { name: 'Kategori' });
    expect(within(categoryList).getByRole('option', { name: 'Elektronik' })).toBeVisible();
  });
});
