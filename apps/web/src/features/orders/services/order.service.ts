import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { orderSeeds, returnSeeds } from '../../../mocks/orders.mock';
import type { Order, OrderStatus, ReturnRequest, ReturnStatus } from '../types';

/** Liste ve sonuçlar; `sample`: sunucu uçları henüz yoksa (404) örnek veriyle çalışılır. */
export interface Loaded<T> {
  items: T[];
  sample: boolean;
}

async function load<T>(path: string, seeds: T[]): Promise<Loaded<T>> {
  try {
    return { items: await apiRequest<T[]>(path), sample: false };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404)
      return { items: seeds.map((s) => ({ ...s })), sample: true };
    throw e;
  }
}

/** Sunucu: GET /api/siparisler, POST /api/siparisler/:id/durum, GET /api/siparisler/iade, … (bkz. types.ts). */
export const orderService = {
  list: () => load<Order>('/api/siparisler', orderSeeds),
  setStatus: (id: string, status: OrderStatus) =>
    apiRequest<void>(`/api/siparisler/${encodeURIComponent(id)}/durum`, {
      method: 'POST',
      body: { status },
    }),
  listReturns: () => load<ReturnRequest>('/api/siparisler/iade', returnSeeds),
  setReturnStatus: (id: string, status: ReturnStatus) =>
    apiRequest<void>(`/api/siparisler/iade/${encodeURIComponent(id)}/durum`, {
      method: 'POST',
      body: { status },
    }),
};

/** Deneme verisi (yalnızca geçici test girişinde): her şey bellekte, 404 beklemeden örnek veri. */
export const demoOrderService: typeof orderService = {
  list: async () => ({ items: orderSeeds.map((o) => ({ ...o })), sample: true }),
  setStatus: async () => undefined,
  listReturns: async () => ({ items: returnSeeds.map((r) => ({ ...r })), sample: true }),
  setReturnStatus: async () => undefined,
};

export const useOrderService = () => useDataService(orderService, demoOrderService);
