import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { CategoryRepository } from '../modules/catalog/category.repository';

function fixture(variant = false, remainingCategory = false, selected = true) {
  let memberships = [1, ...(remainingCategory ? [2] : [])];
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    kategori: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
    stokKarti: { count: vi.fn().mockResolvedValue(1) },
    stokKartiKategori: {
      findMany: vi
        .fn()
        .mockImplementation(async () => (memberships.includes(1) ? [{ stokKartiId: 10 }] : [])),
      deleteMany: vi.fn().mockImplementation(async () => {
        memberships = memberships.filter((id) => id !== 1);
      }),
    },
    stokOzellikDegeri: {
      findMany: vi.fn().mockImplementation(async () =>
        selected
          ? [
              {
                stokKartiId: 10,
                degerId: 7,
                stokKarti: { kategoriler: memberships.map((kategoriId) => ({ kategoriId })) },
                deger: {
                  grup: { sablon: { kategoriler: [{ kategoriId: 1 }, { kategoriId: 2 }] } },
                },
              },
            ]
          : [],
      ),
    },
    stokVaryantDegeri: { findFirst: vi.fn().mockResolvedValue(variant ? { varyantId: 11 } : null) },
  };
  const db = {
    $transaction: async (run: (client: typeof tx) => Promise<unknown>) => {
      const before = [...memberships];
      try {
        return await run(tx);
      } catch (error) {
        memberships = before;
        throw error;
      }
    },
  };
  return {
    repo: new CategoryRepository(db as unknown as PrismaClient, 'unused-test-uploads'),
    memberships: () => memberships,
    tx,
  };
}

describe('Kategoriden çıkarırken özellik uyumu', () => {
  it('varyantta kullanılan uyumsuz özellikte işlem geri alınır', async () => {
    const f = fixture(true);
    await expect(f.repo.assign(1, 1, [10], true)).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringContaining('ürün varyantlarında kullanılan'),
    });
    expect(f.memberships()).toEqual([1]);
    expect(f.tx.stokVaryantDegeri.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ degerId: 7, varyant: { stokKartiId: 10 } }] },
      select: { varyantId: true },
    });
  });
  it('varyantsız uyumsuz seçimi de silmeden işlemi reddeder', async () => {
    const f = fixture();
    await expect(f.repo.assign(1, 1, [10], true)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('ürünün seçili özelliklerini'),
    });
    expect(f.memberships()).toEqual([1]);
  });
  it('başka uygun kategori kalıyorsa çıkarılabilir', async () => {
    const f = fixture(true, true);
    await f.repo.assign(1, 1, [10], true);
    expect(f.memberships()).toEqual([2]);
    expect(f.tx.stokVaryantDegeri.findFirst).not.toHaveBeenCalled();
  });
  it('özellik seçilmemiş ürünü kategoriden çıkarır', async () => {
    const f = fixture(false, false, false);
    await f.repo.assign(1, 1, [10], true);
    expect(f.memberships()).toEqual([]);
  });
});
