import type { ProductItem } from './types';

/** Yüklemeye kabul edilen görsel biçimleri ve dosya başına en büyük boyut. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 300;

export interface PickedImage {
  /** Ekranda anahtar olarak kullanılan, sunucuya gitmeyen kimlik. */
  id: string;
  name: string;
  /** Yalnızca önizleme adresi; yüklemede özgün dosya okunur. */
  url: string;
  file?: File;
}

const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/**
 * Dosya adından ürün anahtarını ve sırasını çıkarır. Uzantı atılır. Sıra eki yalnızca alt çizgiyle
 * ya da parantezle yazılır: `KOD_2` ve `KOD (2)` ikinci resimdir; `KOD-2` ise ürün kodunun
 * kendisi olabileceği için sıra eki SAYILMAZ. Ek yoksa resim birincidir (vitrin resmi).
 */
export function parseImageName(fileName: string): { key: string; order: number } {
  const base = fileName.replace(/\.[^.\\/]+$/, '').trim();
  const suffix = /^(.*?)(?:_|\s*\()(\d{1,2})\)?$/.exec(base);
  if (suffix && suffix[1]) return { key: suffix[1].trim(), order: Number(suffix[2]) };
  return { key: base, order: 1 };
}

export interface ImageGroup {
  product: ProductItem;
  images: PickedImage[];
}

export interface MatchResult {
  groups: ImageGroup[];
  unmatched: PickedImage[];
}

/**
 * Dosyaları stok koduna ya da barkoda göre ürünlere eşler. Aynı ürünün resimleri sıra ekine
 * (sonra dosya adına) göre dizilir. `manual`, kullanıcının eşleşmeyen dosyalara elle verdiği ürünlerdir
 * (dosya kimliği → ürün kimliği); bunlar ilgili ürünün resimlerinin sonuna eklenir.
 */
export function matchImages(
  images: PickedImage[],
  products: ProductItem[],
  manual: ReadonlyMap<string, string> = new Map(),
): MatchResult {
  const byKey = new Map<string, ProductItem | null>();
  const addKey = (raw: string, product: ProductItem) => {
    const key = fold(raw);
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, product);
    else if (byKey.get(key)?.id !== product.id) byKey.set(key, null);
  };
  for (const p of products) {
    addKey(p.code, p);
    for (const barcode of p.barcodes ?? (p.barcode ? [p.barcode] : [])) addKey(barcode, p);
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  const auto = new Map<string, { image: PickedImage; order: number }[]>();
  const hand = new Map<string, PickedImage[]>();
  const unmatched: PickedImage[] = [];

  for (const image of images) {
    const chosen = manual.get(image.id);
    const picked = chosen ? byId.get(chosen) : undefined;
    if (picked) {
      hand.set(picked.id, [...(hand.get(picked.id) ?? []), image]);
      continue;
    }
    const { key, order } = parseImageName(image.name);
    // Önce tam ad, sonra sıra eki atılmış ad denenir (kodun kendisi "_2" ile bitebilir).
    const wholeKey = fold(image.name.replace(/\.[^.\\/]+$/, ''));
    const whole = byKey.get(wholeKey);
    const product = byKey.has(wholeKey) ? whole : byKey.get(fold(key));
    if (!product) {
      unmatched.push(image);
      continue;
    }
    auto.set(product.id, [...(auto.get(product.id) ?? []), { image, order: whole ? 1 : order }]);
  }

  const groups: ImageGroup[] = [];
  for (const product of products) {
    const found = (auto.get(product.id) ?? [])
      .sort((a, b) => a.order - b.order || a.image.name.localeCompare(b.image.name, 'tr'))
      .map((x) => x.image);
    const extra = hand.get(product.id) ?? [];
    if (found.length + extra.length > 0) groups.push({ product, images: [...found, ...extra] });
  }
  return { groups, unmatched };
}

export interface RejectedFile {
  name: string;
  reason: string;
}

/** Biçimi ya da boyutu uygun olmayan dosyaları ayırır. */
export function checkImageFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'Yalnızca JPG, PNG veya WebP yüklenebilir.';
  if (file.size > MAX_IMAGE_BYTES) return 'Dosya 5 MB sınırını aşıyor.';
  return null;
}
