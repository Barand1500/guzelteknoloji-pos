import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { stockDefsSeed } from '../../../mocks/stockdefs.mock';
import type {
  DefList,
  NameDraft,
  NameItem,
  PriceList,
  PriceListDraft,
  StockDefsData,
} from '../types';

export interface LoadedStockDefs {
  data: StockDefsData;
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const base = '/api/cari-stok';
const enc = encodeURIComponent;

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const stockDefService = {
  load: async (): Promise<LoadedStockDefs> => {
    try {
      const [cari, stok, units, priceLists] = await Promise.all([
        apiRequest<NameItem[]>(`${base}/cari-tipleri`),
        apiRequest<NameItem[]>(`${base}/stok-tipleri`),
        apiRequest<NameItem[]>(`${base}/olcu-birimleri`),
        apiRequest<PriceList[]>(`${base}/fiyat-listeleri`),
      ]);
      return { data: { cari, stok, units, priceLists }, sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { data: stockDefsSeed(), sample: true };
      throw e;
    }
  },
  saveName: (list: DefList, draft: NameDraft, id?: string) =>
    apiRequest<NameItem>(`${base}/${list}${id ? '/' + enc(id) : ''}`, { method: 'POST', body: draft }),
  removeName: (list: DefList, id: string) =>
    apiRequest<void>(`${base}/${list}/${enc(id)}/sil`, { method: 'POST' }),
  savePriceList: (draft: PriceListDraft, id?: string) =>
    apiRequest<PriceList>(`${base}/fiyat-listeleri${id ? '/' + enc(id) : ''}`, {
      method: 'POST',
      body: draft,
    }),
  removePriceList: (id: string) =>
    apiRequest<void>(`${base}/fiyat-listeleri/${enc(id)}/sil`, { method: 'POST' }),
  setDefaultPriceList: (id: string) =>
    apiRequest<void>(`${base}/fiyat-listeleri/${enc(id)}/varsayilan`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
const fresh = () => `yeni-${Math.random().toString(36).slice(2, 8)}`;
export const demoStockDefService: typeof stockDefService = {
  load: async () => ({ data: stockDefsSeed(), sample: true }),
  saveName: async (_l, draft, id) => ({ id: id ?? fresh(), ...draft }),
  removeName: async () => undefined,
  savePriceList: async (draft, id) => ({ id: id ?? fresh(), isDefault: false, ...draft }),
  removePriceList: async () => undefined,
  setDefaultPriceList: async () => undefined,
};

export const useStockDefService = () => useDataService(stockDefService, demoStockDefService);
