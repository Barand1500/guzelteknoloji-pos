import { apiRequest } from '../../../lib/http';
import { imageAddress, imagePayload, useDataService } from '../../../lib/catalog-data';
import { demoDealService } from './deal.demo';
import type { Deal, DealDraft, DealProductRef } from '../types';
const base = '/api/firsatlar';
const path = (id: string) => base + '/' + encodeURIComponent(id);
const dto = (d: Deal): Deal => ({ ...d, iconUrl: imageAddress(d.iconUrl) });
const payload = (d: DealDraft) => ({ ...d, iconUrl: imagePayload(d.iconUrl) });
export const dealService = {
  list: async (): Promise<Deal[]> => (await apiRequest<Deal[]>(base)).map(dto),
  create: async (draft: DealDraft): Promise<Deal> =>
    dto(await apiRequest(base, { method: 'POST', body: payload(draft) })),
  update: async (id: string, draft: DealDraft): Promise<Deal> =>
    dto(await apiRequest(path(id), { method: 'POST', body: payload(draft) })),
  setActive: (id: string, active: boolean) =>
    apiRequest<void>(path(id) + '/aktiflik', { method: 'POST', body: { active } }),
  remove: (id: string) => apiRequest<void>(path(id) + '/sil', { method: 'POST' }),
  reorder: (ids: string[]) => apiRequest<void>(base + '/sirala', { method: 'POST', body: { ids } }),
  listProducts: () => apiRequest<DealProductRef[]>(base + '/urunler'),
  assignProducts: (id: string, productIds: string[]) =>
    apiRequest<void>(path(id) + '/urunler/ata', { method: 'POST', body: { productIds } }),
  unassignProducts: (id: string, productIds: string[]) =>
    apiRequest<void>(path(id) + '/urunler/cikar', { method: 'POST', body: { productIds } }),
};
export const useDealService = () => useDataService(dealService, demoDealService);
