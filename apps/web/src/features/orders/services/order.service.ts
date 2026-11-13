import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { orderSeeds, returnSeeds } from '../../../mocks/orders.mock';
import type { Order, OrderStatus, ReturnRequest, ReturnStatus } from '../types';
import type { CreateOrderInput, RecordPaymentInput, CreateReturnInput, CompleteReturnInput, LifecycleDetail, OrderChoices, CampaignCartQuote } from '@gt/shared';

/** Liste ve sonuçlar; `sample` yalnızca test oturumunda true olur. */
export interface Loaded<T> {
  items: T[];
  sample: boolean;
}

async function load<T>(path: string): Promise<Loaded<T>> {
  return { items: await apiRequest<T[]>(path), sample: false };
}

/** Sunucu: GET /api/siparisler, POST /api/siparisler/:id/durum, GET /api/siparisler/iade, … (bkz. types.ts). */
export const orderService = {
  list: () => load<Order>('/api/siparisler'),
  setStatus: (id: string, status: OrderStatus) =>
    apiRequest<void>(`/api/siparisler/${encodeURIComponent(id)}/durum`, {
      method: 'POST',
      body: { status },
    }),
  listReturns: () => load<ReturnRequest>('/api/siparisler/iade'),
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

/** Yalnızca gerçek oturumda kullanılan finansal işlemler; demo karşılığı yoktur. */
export const orderLifecycleService = {
  lookup: (requestId: string) => apiRequest<{ id: string; no: string } | null>(`/api/siparisler/istek/${encodeURIComponent(requestId)}`),
  choices: () => apiRequest<OrderChoices>('/api/siparisler/secenekler'),
  preview: (body: CreateOrderInput) => apiRequest<CampaignCartQuote>('/api/siparisler/onizleme', { method: 'POST', body }),
  create: (body: CreateOrderInput) => apiRequest<{ id: string; no: string }>('/api/siparisler', { method: 'POST', body }),
  detail: (id: string) => apiRequest<LifecycleDetail>(`/api/siparisler/${encodeURIComponent(id)}/islemler`),
  collect: (id: string, body: RecordPaymentInput) => apiRequest<void>(`/api/siparisler/${encodeURIComponent(id)}/tahsilat`, { method: 'POST', body }),
  requestReturn: (id: string, body: CreateReturnInput) => apiRequest<{ id: string }>(`/api/siparisler/${encodeURIComponent(id)}/iade`, { method: 'POST', body }),
  completeReturn: (id: string, body: CompleteReturnInput) => apiRequest<void>(`/api/siparisler/iade/${encodeURIComponent(id)}/tamamla`, { method: 'POST', body }),
};
