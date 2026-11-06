import { describe, expect, it } from 'vitest';
import { checkImageFile, matchImages, parseImageName, type PickedImage } from './image-match';
import type { ProductItem } from './types';

const product = (id: string, code: string, barcode?: string): ProductItem =>
  ({
    id,
    code,
    name: `Ürün ${id}`,
    barcode,
    imageUrl: null,
    imageUrls: [],
  }) as unknown as ProductItem;

const file = (name: string): PickedImage => ({ id: `f-${name}`, name, url: `blob:${name}` });

describe('parseImageName', () => {
  it('uzantıyı atar; ek yoksa resim birincidir', () => {
    expect(parseImageName('KOD1.jpg')).toEqual({ key: 'KOD1', order: 1 });
    expect(parseImageName('FLEXYPOS.FP-503.PNG')).toEqual({ key: 'FLEXYPOS.FP-503', order: 1 });
  });

  it('yalnızca alt çizgi ya da parantez sıra ekidir', () => {
    expect(parseImageName('KOD1_2.jpg')).toEqual({ key: 'KOD1', order: 2 });
    expect(parseImageName('KOD1 (3).jpg')).toEqual({ key: 'KOD1', order: 3 });
    expect(parseImageName('KOD1(4).webp')).toEqual({ key: 'KOD1', order: 4 });
    // Tire sıra eki DEĞİLDİR: ürün kodunun parçası olabilir.
    expect(parseImageName('KOD-2.jpg')).toEqual({ key: 'KOD-2', order: 1 });
  });
});

describe('matchImages', () => {
  const products = [product('a', 'KOD1', '8690001'), product('b', 'KOD-2'), product('c', 'X_2')];

  it('stok koduna ve barkoda göre eşler; büyük/küçük harf fark etmez', () => {
    const { groups, unmatched } = matchImages(
      [file('kod1.jpg'), file('8690001_2.jpg'), file('KOD-2.png')],
      products,
    );
    expect(groups.map((g) => g.product.id)).toEqual(['a', 'b']);
    expect(groups[0]?.images.map((i) => i.name)).toEqual(['kod1.jpg', '8690001_2.jpg']);
    expect(unmatched).toEqual([]);
  });

  it('aynı ürünün resimleri sıra ekine göre dizilir (ilki vitrin)', () => {
    const { groups } = matchImages(
      [file('KOD1_3.jpg'), file('KOD1.jpg'), file('KOD1_2.jpg')],
      products,
    );
    expect(groups[0]?.images.map((i) => i.name)).toEqual(['KOD1.jpg', 'KOD1_2.jpg', 'KOD1_3.jpg']);
  });

  it('kodun kendisi sıra ekine benziyorsa (X_2) tam ad önceliklidir', () => {
    const { groups } = matchImages([file('X_2.jpg')], products);
    expect(groups.map((g) => g.product.id)).toEqual(['c']);
    expect(groups[0]?.images).toHaveLength(1);
  });

  it('eşleşmeyenler ayrılır; elle ürün verilince o ürünün sonuna eklenir', () => {
    const images = [file('KOD1.jpg'), file('bilinmeyen.jpg')];
    const first = matchImages(images, products);
    expect(first.unmatched.map((i) => i.name)).toEqual(['bilinmeyen.jpg']);

    const manual = new Map([['f-bilinmeyen.jpg', 'a']]);
    const second = matchImages(images, products, manual);
    expect(second.unmatched).toEqual([]);
    expect(second.groups[0]?.images.map((i) => i.name)).toEqual(['KOD1.jpg', 'bilinmeyen.jpg']);
  });

  it('görselsiz ürün gruba girmez', () => {
    expect(matchImages([], products).groups).toEqual([]);
  });
});

describe('checkImageFile', () => {
  it('yalnızca JPG/PNG/WebP ve en çok 5 MB kabul eder', () => {
    expect(checkImageFile({ name: 'a.jpg', type: 'image/jpeg', size: 10 })).toBeNull();
    expect(checkImageFile({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toMatch(/JPG/);
    expect(checkImageFile({ name: 'a.png', type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(
      /5 MB/,
    );
  });
});
