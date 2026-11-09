import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { anonymousRoutes, jsonResponse, renderApp } from '../../test/utils';
import { productItemSeeds } from '../../mocks/product.mock';
import { emptyFilters, type ProductItem } from '../../features/products/types';
import { filterDemoProducts } from '../../features/products/product.query';

const metadata = {
  priceLists: [{ id: 'fiyat', name: 'FİYAT' }],
  filterOptions: {
    categories: [
      { id: '21', name: 'Kategori A' },
      { id: '22', name: 'Kategori B' },
    ],
    brands: [
      { id: '11', name: 'Marka A' },
      { id: '12', name: 'Marka B' },
    ],
  },
};

function server() {
  let items: ProductItem[] = Array.from({ length: 25 }, (_, index) => ({
    ...structuredClone(productItemSeeds[0]!),
    id: String(index + 1),
    name: `Sunucu ürünü ${index + 1}`,
    code: `KOD-${index + 1}`,
    categoryIds: [index === 24 ? '22' : '21'],
    categoryNames: [index === 24 ? 'Kategori B' : 'Kategori A'],
    brandId: index === 24 ? '12' : '11',
    brandName: index === 24 ? 'Marka B' : 'Marka A',
  }));
  const queries: URLSearchParams[] = [];
  const mutations: { ids: number[]; islem: string }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/auth/me')
      return jsonResponse(200, {
        user: { id: '1', email: 'test@example.com', displayName: null, avatarUrl: null },
      });
    if (url.pathname === '/api/stok/kartlar/toplu') {
      const body = JSON.parse(String(init?.body)) as (typeof mutations)[number];
      mutations.push(body);
      if (body.islem === 'sil') items = items.filter((p) => !body.ids.includes(Number(p.id)));
      return jsonResponse(200, {});
    }
    if (url.pathname.startsWith('/api/stok/kartlar')) {
      const params = url.searchParams;
      queries.push(params);
      const filters = {
        ...emptyFilters(),
        categoryIds: params.get('kategoriler')?.split(',').filter(Boolean) ?? [],
        brandIds: params.get('markalar')?.split(',').filter(Boolean) ?? [],
        deal: (params.get('firsat') ?? 'all') as 'all' | 'with' | 'without',
        minPrice: params.get('en_az') ?? '',
        maxPrice: params.get('en_cok') ?? '',
      };
      const result = filterDemoProducts(items, {
        filters,
        search: params.get('arama') ?? '',
        page: 1,
        pageSize: 10,
      });
      if (url.pathname.endsWith('/secim'))
        return jsonResponse(200, { ids: result.map((p) => Number(p.id)), total: result.length });
      const size = Number(params.get('boyut') ?? 10);
      const page = Math.min(
        Number(params.get('sayfa') ?? 1),
        Math.max(1, Math.ceil(result.length / size)),
      );
      return jsonResponse(200, {
        ...metadata,
        items: params.get('sayim') === '1' ? [] : result.slice((page - 1) * size, page * size),
        total: result.length,
        page,
        pageSize: size,
      });
    }
    const handler = anonymousRoutes[`${init?.method ?? 'GET'} ${url.pathname}`];
    if (handler) return handler(init);
    throw new TypeError('Unexpected endpoint ' + url.pathname);
  });
  vi.stubGlobal('fetch', fetch);
  return { queries, mutations, fetch };
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
const rows = () =>
  [...document.querySelectorAll('tr[data-product-id]')].map((row) =>
    row.getAttribute('data-product-id'),
  );

it('yalnızca istenen sayfayı alır; son sayfadan silince geçerli sayfaya döner', async () => {
  const api = server();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByText('Sunucu ürünü 1');
  expect(rows()).toHaveLength(10);
  expect(api.queries).toHaveLength(1);
  expect(api.queries[0]?.get('boyut')).toBe('10');
  await user.click(screen.getByRole('button', { name: 'Sayfa 3' }));
  await screen.findByText('Sunucu ürünü 25');
  expect(rows()).toEqual(['21', '22', '23', '24', '25']);
  await user.click(screen.getByRole('checkbox', { name: 'Bu sayfadaki tüm ürünleri seç' }));
  await user.click(
    within(screen.getByRole('toolbar', { name: 'Toplu işlemler' })).getByRole('button', {
      name: 'İşlemler',
    }),
  );
  await user.click(
    within(await screen.findByRole('dialog', { name: 'Seçilenler (5)' })).getByRole('button', {
      name: 'Seçilenleri Sil',
    }),
  );
  await user.click(
    within(await screen.findByRole('dialog', { name: '5 ürün Silinsin Mi?' })).getByRole('button', {
      name: 'Sil',
    }),
  );
  await screen.findByText('Sunucu ürünü 11');
  expect(rows()).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 11)));
  expect(screen.getByRole('button', { name: 'Sayfa 2' })).toHaveAttribute('aria-current', 'page');
});

it('süzgeç seçenekleri sayfadan bağımsızdır; çoklu seçimleri ve fiyatı API’ye gönderir', async () => {
  const api = server();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByText('Sunucu ürünü 1');
  await user.click(screen.getByRole('button', { name: 'Süzgeçler' }));
  const dialog = await screen.findByRole('dialog', { name: 'Süzgeçler' });
  await user.click(within(dialog).getByRole('button', { name: 'Kategori' }));
  await user.click(screen.getByRole('checkbox', { name: 'Kategori A' }));
  await user.click(screen.getByRole('checkbox', { name: 'Kategori B' }));
  await user.click(within(dialog).getByRole('button', { name: 'Marka' }));
  await user.click(screen.getByRole('checkbox', { name: 'Marka A' }));
  await user.click(screen.getByRole('checkbox', { name: 'Marka B' }));
  await user.type(within(dialog).getByLabelText('En az'), '10,5');
  await user.type(within(dialog).getByLabelText('En çok'), '500');
  await user.click(within(dialog).getByRole('radio', { name: 'Fırsatlı' }));
  await user.click(within(dialog).getByRole('button', { name: /Ürünleri Göster|Ürünü Göster/ }));
  await waitFor(() =>
    expect(
      api.queries.some(
        (q) =>
          q.get('kategoriler') === '21,22' &&
          q.get('markalar') === '11,12' &&
          q.get('en_az') === '10.5' &&
          q.get('en_cok') === '500' &&
          q.get('firsat') === 'with' &&
          q.get('sayfa') === '1' &&
          q.get('sayim') !== '1',
      ),
    ).toBe(true),
  );
});

it('seçimi sayfalar arasında korur; tümünü seç filtrelenmiş kimlikleri sunucudan alır', async () => {
  const api = server();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByText('Sunucu ürünü 1');
  await user.click(screen.getByRole('checkbox', { name: 'Sunucu ürünü 1 seç' }));
  await user.click(screen.getByRole('button', { name: 'Sayfa 2' }));
  await screen.findByText('Sunucu ürünü 11');
  await user.click(screen.getByRole('checkbox', { name: 'Sunucu ürünü 11 seç' }));
  const toolbar = screen.getByRole('toolbar', { name: 'Toplu işlemler' });
  expect(within(toolbar).getByText('2 seçili')).toBeInTheDocument();
  await user.click(within(toolbar).getByRole('button', { name: 'İşlemler' }));
  await user.click(
    within(await screen.findByRole('dialog', { name: 'Seçilenler (2)' })).getByRole('button', {
      name: 'Satışa kapat',
    }),
  );
  await waitFor(() => expect(api.mutations[0]?.ids).toEqual([1, 11]));
  await screen.findByText('Sunucu ürünü 11');
  await user.click(
    within(screen.getByRole('toolbar', { name: 'Toplu işlemler' })).getByRole('button', {
      name: 'Tümünü seç (25)',
    }),
  );
  expect(await screen.findByText('25 seçili')).toBeInTheDocument();
});

it('süzgeç önizlemesi geçerli sayfayı değil sunucudaki toplamı sayar; ters fiyat aralığını reddeder', async () => {
  server();
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByText('Sunucu ürünü 1');
  expect(rows()).toHaveLength(10);
  await user.click(screen.getByRole('button', { name: 'Süzgeçler' }));
  const dialog = await screen.findByRole('dialog', { name: 'Süzgeçler' });
  expect(
    await within(dialog).findByRole('button', { name: '25 Ürünü Göster' }),
  ).toBeInTheDocument();
  await user.type(within(dialog).getByLabelText('En az'), '200');
  await user.type(within(dialog).getByLabelText('En çok'), '100');
  expect(within(dialog).getByRole('alert')).toHaveTextContent(
    'En az fiyat, en çok fiyattan büyük olamaz.',
  );
  expect(
    within(dialog).getByRole('button', { name: /Ürünleri Göster|Ürünü Göster/ }),
  ).toBeDisabled();
});

it('geç dönen eski arama yeni sonuçları ezemez', async () => {
  const api = server();
  let release: ((response: Response) => void) | undefined;
  const makeItem = (name: string): ProductItem => ({
    ...structuredClone(productItemSeeds[0]!),
    id: name,
    name,
  });
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/stok/kartlar' && url.searchParams.get('arama') === 'eski')
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    if (url.pathname === '/api/stok/kartlar' && url.searchParams.get('arama') === 'yeni')
      return jsonResponse(200, {
        ...metadata,
        items: [makeItem('Yeni sonuç')],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    return api.fetch(input, init);
  });
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByText('Sunucu ürünü 1');
  const search = screen.getByRole('searchbox', { name: 'Ürün ara' });
  await user.type(search, 'eski');
  await waitFor(() => expect(release).toBeDefined());
  await user.clear(search);
  await user.type(search, 'yeni');
  await screen.findByText('Yeni sonuç');
  await act(async () =>
    release!(
      jsonResponse(200, {
        ...metadata,
        items: [makeItem('Eski sonuç')],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
    ),
  );
  expect(screen.queryByText('Eski sonuç')).not.toBeInTheDocument();
  expect(screen.getByText('Yeni sonuç')).toBeInTheDocument();
});
