import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { currencySeeds } from '../../../mocks/currencies.mock';
import { mockRate, type Currency, type CurrencyDraft, type RateType } from '../types';

export interface LoadedCurrencies {
  items: Currency[];
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const base = '/api/para-birimleri';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const currencyService = {
  list: async (): Promise<LoadedCurrencies> => {
    try {
      return { items: await apiRequest<Currency[]>(base), sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { items: currencySeeds.map((c) => ({ ...c })), sample: true };
      throw e;
    }
  },
  save: (draft: CurrencyDraft, id?: string) =>
    apiRequest<Currency>(id ? path(id) : base, { method: 'POST', body: draft }),
  remove: (id: string) => apiRequest<void>(`${path(id)}/sil`, { method: 'POST' }),
  setActive: (id: string, active: boolean) =>
    apiRequest<void>(`${path(id)}/aktiflik`, { method: 'POST', body: { active } }),
  refresh: (id: string) => apiRequest<Currency>(`${path(id)}/guncelle`, { method: 'POST' }),
  /** Kaydetmeden önce Merkez Bankası kurunu gösterir (uç yoksa örnek kur). */
  preview: async (code: string, type: RateType): Promise<number | null> => {
    try {
      const r = await apiRequest<{ rate: number }>(
        `${base}/kur?kod=${encodeURIComponent(code)}&tip=${type}`,
      );
      return r.rate;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return mockRate(code, type);
      throw e;
    }
  },
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoCurrencyService: typeof currencyService = {
  list: async () => ({ items: currencySeeds.map((c) => ({ ...c })), sample: true }),
  save: async (draft, id) => ({
    id: id ?? `yeni-${Math.random().toString(36).slice(2, 8)}`,
    base: false,
    active: true,
    ...draft,
  }),
  remove: async () => undefined,
  setActive: async () => undefined,
  refresh: async (id) => ({ ...currencySeeds.find((c) => c.id === id)! }),
  preview: async (code, type) => mockRate(code, type),
};

export const useCurrencyService = () => useDataService(currencyService, demoCurrencyService);
