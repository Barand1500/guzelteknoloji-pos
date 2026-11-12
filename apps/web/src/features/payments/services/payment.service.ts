import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { paymentSeeds } from '../../../mocks/payments.mock';
import type { PaymentDraft, PaymentMethod } from '../types';

export interface LoadedPayments {
  items: PaymentMethod[];
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const base = '/api/odeme-sekilleri';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const paymentService = {
  list: async (): Promise<LoadedPayments> => {
    try {
      return { items: await apiRequest<PaymentMethod[]>(base), sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { items: paymentSeeds.map((p) => ({ ...p })), sample: true };
      throw e;
    }
  },
  save: (draft: PaymentDraft, id?: string) =>
    apiRequest<PaymentMethod>(id ? path(id) : base, { method: 'POST', body: draft }),
  remove: (id: string) => apiRequest<void>(`${path(id)}/sil`, { method: 'POST' }),
  setActive: (id: string, active: boolean) =>
    apiRequest<void>(`${path(id)}/aktiflik`, { method: 'POST', body: { active } }),
  reorder: (ids: string[]) => apiRequest<void>(`${base}/sirala`, { method: 'POST', body: { ids } }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoPaymentService: typeof paymentService = {
  list: async () => ({ items: paymentSeeds.map((p) => ({ ...p })), sample: true }),
  save: async (draft, id) => ({
    id: id ?? `yeni-${Math.random().toString(36).slice(2, 8)}`,
    active: true,
    ...draft,
  }),
  remove: async () => undefined,
  setActive: async () => undefined,
  reorder: async () => undefined,
};

export const usePaymentService = () => useDataService(paymentService, demoPaymentService);
