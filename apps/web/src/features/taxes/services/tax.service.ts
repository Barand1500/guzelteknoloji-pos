import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { taxOfficeSeeds, taxTypeSeeds } from '../../../mocks/taxes.mock';
import type { TaxOffice, TaxType, TaxTypeDraft } from '../types';

export interface LoadedTaxes {
  types: TaxType[];
  offices: TaxOffice[];
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const enc = encodeURIComponent;
const sample = (): LoadedTaxes => ({
  types: taxTypeSeeds.map((t) => ({ ...t, rates: [...t.rates] })),
  offices: taxOfficeSeeds.map((o) => ({ ...o })),
  sample: true,
});

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const taxService = {
  load: async (): Promise<LoadedTaxes> => {
    try {
      const types = await apiRequest<TaxType[]>('/api/vergiler');
      const offices = await apiRequest<TaxOffice[]>('/api/vergi-daireleri');
      return { types, offices, sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return sample();
      throw e;
    }
  },
  saveType: (draft: TaxTypeDraft, id?: string) =>
    apiRequest<TaxType>(id ? `/api/vergiler/${enc(id)}` : '/api/vergiler', {
      method: 'POST',
      body: draft,
    }),
  removeType: (id: string) => apiRequest<void>(`/api/vergiler/${enc(id)}/sil`, { method: 'POST' }),
  addRate: (id: string, rate: number) =>
    apiRequest<TaxType>(`/api/vergiler/${enc(id)}/oranlar`, { method: 'POST', body: { rate } }),
  removeRate: (id: string, rate: number) =>
    apiRequest<TaxType>(`/api/vergiler/${enc(id)}/oranlar/sil`, { method: 'POST', body: { rate } }),
  saveOffice: (name: string, id?: string) =>
    apiRequest<TaxOffice>(id ? `/api/vergi-daireleri/${enc(id)}` : '/api/vergi-daireleri', {
      method: 'POST',
      body: { name },
    }),
  removeOffice: (id: string) =>
    apiRequest<void>(`/api/vergi-daireleri/${enc(id)}/sil`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
const fresh = () => `yeni-${Math.random().toString(36).slice(2, 8)}`;
export const demoTaxService: typeof taxService = {
  load: async () => sample(),
  saveType: async (draft, id) => ({ id: id ?? fresh(), rates: [], ...draft }),
  removeType: async () => undefined,
  addRate: async (id, rate) => ({ id, name: '', shortName: '', rates: [rate] }),
  removeRate: async (id) => ({ id, name: '', shortName: '', rates: [] }),
  saveOffice: async (name, id) => ({ id: id ?? fresh(), name, builtin: false }),
  removeOffice: async () => undefined,
};

export const useTaxService = () => useDataService(taxService, demoTaxService);
