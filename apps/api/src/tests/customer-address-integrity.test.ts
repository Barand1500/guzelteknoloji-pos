import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { PrismaCustomerStore } from '../modules/customers/customer.store';

function setup(existing: { id: number } | null) {
  const tx = {
    musteri: { findFirst: vi.fn(async () => ({ id: 1 })) },
    musteriAdresi: {
      findFirst: vi.fn(async () => existing),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({ id: 2, baslik: 'Ev', adres: 'Geçerli müşteri adresi', varsayilan: true })),
    },
  };
  const db = { $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) };
  return { store: new PrismaCustomerStore(db as unknown as PrismaClient), tx };
}

describe('Müşteri varsayılan adres bütünlüğü', () => {
  const draft = { title: 'Ev', address: 'Geçerli müşteri adresi', isDefault: true };

  it('bulunamayan veya başka müşteriye ait adres mevcut varsayılanı değiştirmez', async () => {
    const { store, tx } = setup(null);
    expect(await store.saveAddress(7, 1, draft, 999)).toBeNull();
    expect(tx.musteriAdresi.updateMany).not.toHaveBeenCalled();
    expect(tx.musteriAdresi.update).not.toHaveBeenCalled();
  });

  it('geçerli adres varsayılan yapıldığında diğer adresleri aynı işlemde kaldırır', async () => {
    const { store, tx } = setup({ id: 2 });
    expect(await store.saveAddress(7, 1, draft, 2)).toMatchObject({ id: 2, isDefault: true });
    expect(tx.musteriAdresi.updateMany).toHaveBeenCalledWith({ where: { musteriId: 1 }, data: { varsayilan: false } });
  });
});
