import { apiRequest } from '../../../lib/http';
import { imageAddress, imagePayload, useDataService } from '../../../lib/catalog-data';
import { demoCategoryService } from './category.demo';
import type { Category, CategoryDraft, CategoryProductRef } from '../types';
const base = '/api/kategoriler';
const path = (id: string) => base + '/' + encodeURIComponent(id);
const dto = (c: Category): Category => ({ ...c, imageUrl: imageAddress(c.imageUrl) });
const payload = (d: CategoryDraft) => ({ ...d, imageUrl: imagePayload(d.imageUrl) });
export const categoryService = {
  list: async (): Promise<Category[]> => (await apiRequest<Category[]>(base)).map(dto),
  create: async (draft: CategoryDraft): Promise<Category> =>
    dto(await apiRequest(base, { method: 'POST', body: payload(draft) })),
  update: async (id: string, draft: CategoryDraft): Promise<Category> =>
    dto(await apiRequest(path(id), { method: 'POST', body: payload(draft) })),
  move: (id: string, parentId: string | null) =>
    apiRequest<void>(path(id) + '/tasi', { method: 'POST', body: { parentId } }),
  /** Kategoriyi hedefin içine birleştirir (ürünler ve alt kategoriler hedefe taşınır, kaynak silinir). */
  merge: (id: string, targetId: string) =>
    apiRequest<void>(path(id) + '/birlestir', { method: 'POST', body: { targetId } }),
  setActive: (id: string, active: boolean) =>
    apiRequest<void>(path(id) + '/aktiflik', { method: 'POST', body: { active } }),
  remove: (id: string) => apiRequest<void>(path(id) + '/sil', { method: 'POST' }),
  reorder: (parentId: string | null, ids: string[]) =>
    apiRequest<void>(base + '/sirala', { method: 'POST', body: { parentId, ids } }),
  listProducts: () => apiRequest<CategoryProductRef[]>(base + '/urunler'),
  assignProducts: (id: string, productIds: string[]) =>
    apiRequest<void>(path(id) + '/urunler/ata', { method: 'POST', body: { productIds } }),
  unassignProducts: (id: string, productIds: string[]) =>
    apiRequest<void>(path(id) + '/urunler/cikar', { method: 'POST', body: { productIds } }),
};
export const useCategoryService = () => useDataService(categoryService, demoCategoryService);
