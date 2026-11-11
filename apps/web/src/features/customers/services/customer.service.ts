import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { customerSeeds, detailSeed } from '../../../mocks/customers.mock';
import type { AddressDraft, Customer, CustomerAddress, CustomerDetail, CustomerDraft } from '../types';

export interface LoadedCustomers {
  items: Customer[];
  /** true: sunucu uçları henüz yok (404), ekranda örnek veri var; değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const path = (id: string) => `/api/musteriler/${encodeURIComponent(id)}`;

/** Sunucu: bkz. types.ts (Customer / CustomerDetail). Uç yoksa (404) örnek veriyle çalışılır. */
export const customerService = {
  list: async (): Promise<LoadedCustomers> => {
    try {
      return { items: await apiRequest<Customer[]>('/api/musteriler'), sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { items: customerSeeds.map((c) => ({ ...c })), sample: true };
      throw e;
    }
  },
  detail: async (customer: Customer): Promise<CustomerDetail> => {
    try {
      return await apiRequest<CustomerDetail>(`${path(customer.id)}/detay`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return detailSeed(customer);
      throw e;
    }
  },
  create: (draft: CustomerDraft) =>
    apiRequest<Customer>('/api/musteriler', { method: 'POST', body: draft }),
  update: (id: string, draft: CustomerDraft) =>
    apiRequest<Customer>(path(id), { method: 'POST', body: draft }),
  remove: (id: string) => apiRequest<void>(`${path(id)}/sil`, { method: 'POST' }),
  setLogin: (id: string, active: boolean) =>
    apiRequest<void>(`${path(id)}/giris`, { method: 'POST', body: { active } }),
  /** Adres ekle/güncelle: POST /api/musteriler/:id/adresler[/:adresId] gövde AddressDraft → CustomerAddress */
  saveAddress: (id: string, draft: AddressDraft, addressId?: string) =>
    apiRequest<CustomerAddress>(
      `${path(id)}/adresler${addressId ? '/' + encodeURIComponent(addressId) : ''}`,
      { method: 'POST', body: draft },
    ),
  /** Tek kullanıcının girişi: POST /api/musteriler/:id/kullanicilar/:kullaniciId/giris { active } */
  setUserLogin: (id: string, userId: string, active: boolean) =>
    apiRequest<void>(`${path(id)}/kullanicilar/${encodeURIComponent(userId)}/giris`, {
      method: 'POST',
      body: { active },
    }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoCustomerService: typeof customerService = {
  list: async () => ({ items: customerSeeds.map((c) => ({ ...c })), sample: true }),
  detail: async (c) => detailSeed(c),
  create: async (draft) => ({
    id: `yeni-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
    active: true,
    userCount: 1,
    lastLogin: null,
    debt: 0,
    credit: 0,
  }),
  update: async (id, draft) => ({
    ...(customerSeeds.find((c) => c.id === id) ?? customerSeeds[0]!),
    ...draft,
    id,
  }),
  remove: async () => undefined,
  setLogin: async () => undefined,
  setUserLogin: async () => undefined,
  saveAddress: async (_id, draft, addressId) => ({
    id: addressId ?? `a-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
  }),
};

export const useCustomerService = () => useDataService(customerService, demoCustomerService);
