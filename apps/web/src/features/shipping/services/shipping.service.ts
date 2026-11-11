import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { shippingSeed } from '../../../mocks/shipping.mock';
import {
  LIST_DEFS,
  type Carrier,
  type CarrierDraft,
  type DefDraft,
  type DefItem,
  type ListKey,
  type LocationNode,
  type PriceTable,
  type ShippingData,
} from '../types';

export interface LoadedShipping {
  data: ShippingData;
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const enc = encodeURIComponent;

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const shippingService = {
  load: async (): Promise<LoadedShipping> => {
    try {
      const carriers = await apiRequest<Carrier[]>('/api/kargo/firmalar');
      const [locations, ...rest] = await Promise.all([
        apiRequest<LocationNode[]>('/api/kargo/lokasyonlar'),
        ...LIST_DEFS.map((d) => apiRequest<DefItem[]>(`/api/kargo/tanimlar/${d.key}`)),
      ]);
      const lists = Object.fromEntries(LIST_DEFS.map((d, i) => [d.key, rest[i]])) as ShippingData['lists'];
      return { data: { carriers, locations, lists }, sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { data: shippingSeed(), sample: true };
      throw e;
    }
  },
  saveCarrier: (draft: CarrierDraft, id?: string) =>
    apiRequest<Carrier>(id ? `/api/kargo/firmalar/${enc(id)}` : '/api/kargo/firmalar', {
      method: 'POST',
      body: draft,
    }),
  removeCarrier: (id: string) =>
    apiRequest<void>(`/api/kargo/firmalar/${enc(id)}/sil`, { method: 'POST' }),
  savePrices: (id: string, prices: PriceTable) =>
    apiRequest<void>(`/api/kargo/firmalar/${enc(id)}/fiyatlar`, { method: 'POST', body: prices }),
  createLocation: (parentId: string | null, name: string) =>
    apiRequest<LocationNode>('/api/kargo/lokasyonlar', { method: 'POST', body: { parentId, name } }),
  renameLocation: (id: string, name: string) =>
    apiRequest<LocationNode>(`/api/kargo/lokasyonlar/${enc(id)}`, { method: 'POST', body: { name } }),
  removeLocation: (id: string) =>
    apiRequest<void>(`/api/kargo/lokasyonlar/${enc(id)}/sil`, { method: 'POST' }),
  saveItem: (list: ListKey, draft: DefDraft, id?: string) =>
    apiRequest<DefItem>(`/api/kargo/tanimlar/${list}${id ? '/' + enc(id) : ''}`, {
      method: 'POST',
      body: draft,
    }),
  removeItem: (list: ListKey, id: string) =>
    apiRequest<void>(`/api/kargo/tanimlar/${list}/${enc(id)}/sil`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoShippingService: typeof shippingService = {
  load: async () => ({ data: shippingSeed(), sample: true }),
  saveCarrier: async (draft, id) => ({
    id: id ?? `yeni-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
    prices: shippingSeed().carriers[0]!.prices,
  }),
  removeCarrier: async () => undefined,
  savePrices: async () => undefined,
  createLocation: async (parentId, name) => ({
    id: `yeni-${Math.random().toString(36).slice(2, 8)}`,
    parentId,
    name,
    level: 0,
  }),
  renameLocation: async (id, name) => ({ id, parentId: null, name, level: 0 }),
  removeLocation: async () => undefined,
  saveItem: async (_list, draft, id) => ({
    id: id ?? `yeni-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
  }),
  removeItem: async () => undefined,
};

export const useShippingService = () => useDataService(shippingService, demoShippingService);
