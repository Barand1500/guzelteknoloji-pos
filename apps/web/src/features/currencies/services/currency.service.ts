import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { currencySeeds } from '../../../mocks/currencies.mock';
import { mockRate, type Currency, type CurrencyDraft, type RateType } from '../types';

export interface LoadedCurrencies {
  items: Currency[];
  /** true: açıkça seçilen test oturumunun örnek verisi. */
  sample: boolean;
}

const base = '/api/para-birimleri';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

/** Sunucu: bkz. types.ts. */
export const currencyService = {
  list: async (): Promise<LoadedCurrencies> => {
    return { items: await apiRequest<Currency[]>(base), sample: false };
  },
  save: (draft: CurrencyDraft, id?: string) =>
    apiRequest<Currency>(id ? path(id) : base, { method: 'POST', body: draft }),
  remove: (id: string) => apiRequest<void>(`${path(id)}/sil`, { method: 'POST' }),
  setActive: (id: string, active: boolean) =>
    apiRequest<void>(`${path(id)}/aktiflik`, { method: 'POST', body: { active } }),
  refresh: (id: string) => apiRequest<Currency>(`${path(id)}/guncelle`, { method: 'POST' }),
  /** Kaydetmeden önce Merkez Bankası kurunu gösterir. */
  preview: async (code: string, type: RateType): Promise<number | null> => {
    const r = await apiRequest<{ rate: number }>(
      `${base}/kur?kod=${encodeURIComponent(code)}&tip=${type}`,
    );
    return r.rate;
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
