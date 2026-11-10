import { apiRequest, API_BASE_URL } from '../../../lib/http';
import type { Brand, BrandDraft, ProductRef } from '../types';

export interface BrandService {
  list(): Promise<Brand[]>;
  create(draft: BrandDraft): Promise<Brand>;
  update(id: string, draft: BrandDraft): Promise<Brand>;
  setActive(id: string, active: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  merge(id: string, targetId: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
  listProducts(): Promise<ProductRef[]>;
  assignProducts(id: string, productIds: string[]): Promise<void>;
  unassignProducts(id: string, productIds: string[]): Promise<void>;
}
const path = (id: string) => '/api/markalar/' + encodeURIComponent(id);
const withLogo = (brand: Brand): Brand => ({
  ...brand,
  logoUrl: brand.logoUrl ? API_BASE_URL + brand.logoUrl : null,
});
const payload = (draft: BrandDraft) => ({
  ...draft,
  logoUrl:
    API_BASE_URL && draft.logoUrl?.startsWith(API_BASE_URL + '/api/markalar/')
      ? draft.logoUrl.slice(API_BASE_URL.length)
      : draft.logoUrl,
});
export const brandService: BrandService = {
  list: async () => (await apiRequest<Brand[]>('/api/markalar')).map(withLogo),
  create: async (draft) =>
    withLogo(await apiRequest('/api/markalar', { method: 'POST', body: payload(draft) })),
  update: async (id, draft) =>
    withLogo(await apiRequest(path(id), { method: 'POST', body: payload(draft) })),
  setActive: (id, active) =>
    apiRequest(path(id) + '/aktiflik', { method: 'POST', body: { active } }),
  remove: (id) => apiRequest(path(id) + '/sil', { method: 'POST' }),
  merge: (id, targetId) =>
    apiRequest(path(id) + '/birlestir', { method: 'POST', body: { targetId } }),
  reorder: (ids) => apiRequest('/api/markalar/sirala', { method: 'POST', body: { ids } }),
  listProducts: () => apiRequest('/api/markalar/urunler'),
  assignProducts: (id, productIds) =>
    apiRequest(path(id) + '/urunler/ata', { method: 'POST', body: { productIds } }),
  unassignProducts: (id, productIds) =>
    apiRequest(path(id) + '/urunler/cikar', { method: 'POST', body: { productIds } }),
};
