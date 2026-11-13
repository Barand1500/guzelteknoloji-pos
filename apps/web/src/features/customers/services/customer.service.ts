import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { customerSeeds, detailSeed } from '../../../mocks/customers.mock';
import type { CommerceChoices } from '@gt/shared';
import { stockDefsSeed } from '../../../mocks/stockdefs.mock';
import { paymentSeeds } from '../../../mocks/payments.mock';
import type { AddressDraft, Customer, CustomerAddress, CustomerDetail, CustomerDraft } from '../types';

export interface LoadedCustomers {
  items: Customer[];
  /** true: açıkça seçilen test oturumunun örnek verisi. */
  sample: boolean;
}

const path = (id: string) => `/api/musteriler/${encodeURIComponent(id)}`;

/** Sunucu: bkz. types.ts (Customer / CustomerDetail). */
export const customerService = {
  choices: () => apiRequest<CommerceChoices>('/api/musteriler/secenekler'),
  list: async (): Promise<LoadedCustomers> => {
    return { items: await apiRequest<Customer[]>('/api/musteriler'), sample: false };
  },
  detail: async (customer: Customer): Promise<CustomerDetail> => {
    return await apiRequest<CustomerDetail>(`${path(customer.id)}/detay`);
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
  choices: async () => ({ customerTypes: stockDefsSeed().cari, priceLists: stockDefsSeed().priceLists, payments: paymentSeeds.filter((item) => item.active).map(({ id, name }) => ({ id, name })) }),
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
