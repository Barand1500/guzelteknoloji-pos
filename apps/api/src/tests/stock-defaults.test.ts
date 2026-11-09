import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import { PrismaStockRepository } from '../modules/stock/stock.repository';

describe('Vergi varsayılanları', () => {
  function setup(initialized: boolean) {
    const createMany = vi.fn().mockResolvedValue({ count: 0 });
    const db = {
      stokSecenegi: {
        findUnique: vi.fn().mockResolvedValue(initialized ? { kimlik: 1 } : null),
        findMany: vi.fn().mockResolvedValue([]),
        createMany,
      },
      marka: { findMany: vi.fn().mockResolvedValue([]) },
    };
    return { repo: new PrismaStockRepository(db as unknown as PrismaClient), createMany };
  }

  it('mevcut kullanıcıda her okumada vergi oluşturmaz; silinen vergi geri gelmez', async () => {
    const { repo, createMany } = setup(true);
    expect((await repo.getLookups('1')).otherTaxes).toEqual([]);
    await repo.getLookups('1');
    expect(createMany).not.toHaveBeenCalled();
  });

  it('yeni kullanıcıda üç vergi normal varsayılanlarla oluşturulur', async () => {
    const { repo, createMany } = setup(false);
    await repo.getLookups('2');
    expect(createMany).toHaveBeenCalledOnce();
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining(
          ['mtv', 'alis-otv', 'satis-otv'].map((secenekKodu) =>
            expect.objectContaining({ kullaniciKimligi: 2, listeTuru: 'otherTaxes', secenekKodu }),
          ),
        ),
      }),
    );
  });
});
