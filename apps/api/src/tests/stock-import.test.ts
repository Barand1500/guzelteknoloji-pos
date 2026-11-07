import { expect, it, vi } from 'vitest';
import type { PrismaClient } from '../lib/prisma';
import type { StockRepository } from '../modules/stock/stock.repository';
import { StockImport } from '../modules/stock/stock-import';
import { stockFixture } from './stock.fixture';

function setup(variantCount = 0) {
  const draft = stockFixture();
  draft.stockQuantity = '-5.25';
  const saveImported = vi.fn();
  const db = {
    stokKarti: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ kimlik: 7, stokKodu: 'A', _count: { varyantlar: variantCount } }]),
    },
    marka: { findMany: vi.fn().mockResolvedValue([]) },
    kategori: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaClient;
  const repo = {
    getLookups: vi.fn(),
    get: vi.fn().mockResolvedValue(draft),
    saveImported,
  } as unknown as StockRepository;
  return { importer: new StockImport(db, repo), saveImported };
}
it('eksi stoklu kayıt yeniden içe aktarılabilir; yeni negatif değer şemadan geçer', async () => {
  const s = setup();
  const result = await s.importer.commit('1', 'Stok Kodu;Ürün Adı;Fiyat 1;Stok\nA;Ürün;100;-2,5');
  expect(result).toEqual({ created: 0, updated: 1, errors: [] });
  expect(s.saveImported).toHaveBeenCalledWith(
    '1',
    expect.objectContaining({
      draft: expect.objectContaining({ stockQuantity: '-2.5' }),
    }),
    '7',
    { stock: '-2.5' },
  );
});
it('varyantlı üründe toplam stok değişikliğini önizlemede açıklar ve yazmaz', async () => {
  const s = setup(2);
  const text = 'Stok Kodu;Ürün Adı;Fiyat 1;Stok\nA;Ürün;100;10';
  const preview = await s.importer.preview('1', text);
  expect(preview.errorCount).toBe(1);
  expect(preview.rows[0]?.message).toContain('varyantlar bölümünden');
  expect((await s.importer.commit('1', text)).updated).toBe(0);
  expect(s.saveImported).not.toHaveBeenCalled();
});
