import { describe, expect, it } from 'vitest';
import { orderedStockImages } from '../modules/stock/stock-images';

const rows = [
  { id: 1, dosyaAdi: 'existing.png' },
  { id: 2, dosyaAdi: 'uploaded.png' },
];

describe('Ürün görsel sırası', () => {
  it('yeni yüklemeyi mevcut görselin önüne alabilir', () => {
    expect(
      orderedStockImages(rows, [{ file: 'uploaded.png' }, { imageId: 1 }]).map((r) => r.id),
    ).toEqual([2, 1]);
  });
  it.each([
    [{ imageId: 1 }],
    [{ imageId: 1 }, { imageId: 1 }],
    [{ imageId: 1 }, { imageId: 999 }],
    [{ imageId: 1 }, { file: 'another-product.png' }],
    [{ imageId: 1 }, { imageId: 2 }, { imageId: 3 }],
  ])('eksik, yinelenen veya başka ürüne ait sırayı reddeder: %j', (...order) => {
    expect(() => orderedStockImages(rows, order)).toThrow('Ürünün görselleri değişmiş');
  });
});
