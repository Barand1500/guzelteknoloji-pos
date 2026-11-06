import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { demoProductService } from './product.demo';
import type { ProductItem, ImportPreview } from '../types';
interface Page {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
}
/** Ekranın yerel süzgeç ve sayfalaması için tüm kayıtlar sayfalı API'den yüklenir. */
export const productService = {
  list: async (): Promise<ProductItem[]> => {
    const rows: ProductItem[] = [];
    let page = 1;
    for (;;) {
      const result = await apiRequest<Page>('/api/stok/kartlar?boyut=200&sayfa=' + page);
      rows.push(...result.items);
      if (rows.length >= result.total || result.items.length === 0) break;
      page++;
    }
    return rows;
  },
  get: async (id: string): Promise<ProductItem | null> => {
    const result = await apiRequest<Page>(
      '/api/stok/kartlar?kimlik=' + encodeURIComponent(id) + '&boyut=1',
    );
    return result.items[0] ?? null;
  },
  setStockTracking: (ids: string[], on: boolean) =>
    apiRequest<void>('/api/stok/kartlar/toplu', {
      method: 'POST',
      body: { ids: ids.map(Number), islem: on ? 'stok_ac' : 'stok_kapat' },
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
