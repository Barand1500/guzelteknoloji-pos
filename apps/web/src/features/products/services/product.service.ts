import { apiRequest } from '../../../lib/http';
import { imageAddress, useDataService } from '../../../lib/catalog-data';
import { demoProductService } from './product.demo';
import {
  priceListsOf,
  type BulkRequest,
  type BulkResult,
  type ProductItem,
  type ImportPreview,
  type ProductPage,
  type ProductPageQuery,
} from '../types';
import { productFilterOptions, productQueryString } from '../product.query';
interface Page {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  priceLists?: ProductPage['priceLists'];
  filterOptions?: ProductPage['filterOptions'];
}
const tickets = new Map<string, { ticket: string; expires: number }>();
const dto = (p: ProductItem): ProductItem => ({
  ...p,
  imageUrl: imageAddress(p.imageUrl),
  imageUrls: (p.imageUrls ?? []).map((url) => imageAddress(url)!),
});
async function imageData(url: string, file?: File): Promise<string> {
  if (!file) {
    if (url.startsWith('data:image/')) return url;
    throw new Error('Görseli bilgisayarınızdan yeniden seçin.');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Görsel okunamadı. Yeniden seçin.'));
    reader.readAsDataURL(file);
  });
}
/** Ürün ekranı listPage kullanır. Tam liste yalnızca toplu görsel eşleştirme gibi tüketiciler içindir. */
export const productService = {
  isDemo: false,
  supportsImages: true,
  supportsImageOrder: true,
  listPage: async (query: ProductPageQuery): Promise<ProductPage> => {
    const result = await apiRequest<Page>('/api/stok/kartlar?' + productQueryString(query));
    return {
      ...result,
      items: result.items.map(dto),
      priceLists: result.priceLists ?? priceListsOf(result.items),
      filterOptions: result.filterOptions ?? productFilterOptions(result.items),
    };
  },
  count: async (query: ProductPageQuery) =>
    (
      await apiRequest<Page>(
        '/api/stok/kartlar?' + productQueryString(query) + '&sayim=1&secenekler=0',
      )
    ).total,
  selectIds: async (query: ProductPageQuery): Promise<string[]> =>
    (
      await apiRequest<{ ids: number[] }>('/api/stok/kartlar/secim?' + productQueryString(query))
    ).ids.map(String),
  applyImages: async (
    entries: {
      productId: string;
      urls: string[];
      files?: (File | undefined)[];
      finalOrder?: string[];
    }[],
    replace: boolean,
  ): Promise<number> => {
    for (const [url, saved] of tickets) if (saved.expires < Date.now()) tickets.delete(url);
    const prepared: {
      productId: string;
      tickets: string[];
      finalOrder?: ({ imageId: number } | { ticket: string })[];
    }[] = [];
    // 300 adet 5 MB görseli tek gövdede tutmak yerine dosyalar sırayla hazırlanır.
    for (const entry of entries) {
      const batch: string[] = [];
      for (const [index, url] of entry.urls.entries()) {
        let saved = tickets.get(url);
        if (!saved) {
          const result = await apiRequest<{ ticket: string }>('/api/stok/gorseller/yukle', {
            method: 'POST',
            body: { dataUrl: await imageData(url, entry.files?.[index]) },
            timeoutMs: 120000,
          });
          saved = { ticket: result.ticket, expires: Date.now() + 39600000 };
          tickets.set(url, saved);
        }
        batch.push(saved.ticket);
      }
      const finalOrder = entry.finalOrder?.map((url) => {
        const index = entry.urls.indexOf(url);
        if (index >= 0) return { ticket: batch[index]! };
        const match = /^\/api\/stok\/gorseller\/([1-9]\d*)$/.exec(
          new URL(url, window.location.href).pathname,
        );
        if (!match) throw new Error('Görsel sırası okunamadı. Listeyi yenileyin.');
        return { imageId: Number(match[1]) };
      });
      prepared.push({
        productId: entry.productId,
        tickets: batch,
        ...(finalOrder ? { finalOrder } : {}),
      });
    }
    const result = await apiRequest<{ images: number }>('/api/stok/gorseller/kaydet', {
      method: 'POST',
      body: { entries: prepared, replace },
      timeoutMs: 120000,
    });
    // Hata halinde biletler korunur: tekrar denemede kaydı tamamlanan görseller çoğalmaz.
    for (const entry of entries) for (const url of entry.urls) tickets.delete(url);
    return result.images;
  },
  /**
   * Tüm ürünler: ilk sayfa toplamı öğretir, kalan sayfalar aynı anda (en çok 4 istek) alınır.
   * Sırayla beklemeye göre birkaç kat hızlıdır; sıra sayfa numarasına göre korunur.
   */
  list: async (): Promise<ProductItem[]> => {
    const url = (page: number) => '/api/stok/kartlar?secenekler=0&boyut=200&sayfa=' + page;
    const first = await apiRequest<Page>(url(1));
    const pages = Math.ceil(first.total / 200);
    const results: Page[] = [first];
    let next = 2;
    const worker = async () => {
      while (next <= pages) {
        const page = next++;
        results[page - 1] = await apiRequest<Page>(url(page));
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, Math.max(pages - 1, 0)) }, worker));
    // Concurrent deletions can clamp a requested last page; do not duplicate those products.
    return [
      ...new Map(results.flatMap((r) => r.items.map(dto)).map((item) => [item.id, item])).values(),
    ];
  },
  get: async (id: string): Promise<ProductItem | null> => {
    const result = await apiRequest<Page>(
      '/api/stok/kartlar?kimlik=' + encodeURIComponent(id) + '&boyut=1&secenekler=0',
    );
    return result.items[0] ? dto(result.items[0]) : null;
  },
  setStockTracking: (ids: string[], on: boolean) =>
    apiRequest<void>('/api/stok/kartlar/toplu', {
      method: 'POST',
      body: { ids: ids.map(Number), islem: on ? 'stok_ac' : 'stok_kapat' },
    }),
  bulk: (ids: string[], request: BulkRequest) =>
    apiRequest<BulkResult>('/api/stok/kartlar/toplu', {
      method: 'POST',
      body: {
        ids: ids.map(Number),
        ...request,
        ...('firsatId' in request ? { firsatId: Number(request.firsatId) } : {}),
        ...('kategoriId' in request ? { kategoriId: Number(request.kategoriId) } : {}),
        ...('markaId' in request
          ? { markaId: request.markaId === null ? null : Number(request.markaId) }
          : {}),
        ...('listeId' in request ? { listeId: Number(request.listeId) } : {}),
      },
    }),
  setSales: (ids: string[], on: boolean) =>
    apiRequest<void>('/api/stok/kartlar/toplu', {
      method: 'POST',
      body: { ids: ids.map(Number), islem: on ? 'satis_ac' : 'satis_kapat' },
    }),
  remove: (ids: string[]) =>
    apiRequest<void>('/api/stok/kartlar/toplu', {
      method: 'POST',
      body: { ids: ids.map(Number), islem: 'sil' },
    }),
  previewImport: (text: string) =>
    apiRequest<ImportPreview & { missingColumns: string[] }>('/api/stok/aktarim/onizle', {
      method: 'POST',
      body: { text },
    }),
  commitImport: (text: string) =>
    apiRequest<{ created: number; updated: number; errors?: string[] }>(
      '/api/stok/aktarim/kaydet',
      { method: 'POST', body: { text }, timeoutMs: 120000 },
    ),
};
export const useProductService = () => useDataService(productService, demoProductService);
