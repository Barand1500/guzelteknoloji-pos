import { knownBrandNames, knownCategoryNames, productItemSeeds } from '../../../mocks/product.mock';
import { categorySeeds } from '../../../mocks/category.mock';
import { brandSeeds } from '../../../mocks/brand.mock';
import { parseImport, parseNumber, type RawImportRow } from '../import.csv';
import type { ImportPreview, ImportRow, ProductItem } from '../types';

/**
 * Ürün verisine erişimin TEK kapısı. Şimdilik bellekte tutulan sahte veri (sayfa yenilenince
 * başa döner); gerçek API gelince yalnızca bu dosya değişir, bileşenler aynı kalır.
 */
let items: ProductItem[] = productItemSeeds.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
let seq = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/** Bir Excel satırını doğrular; geçerliyse ürün bilgisini de döndürür. */
function check(raw: RawImportRow): { row: ImportRow; product?: Partial<ProductItem> } {
  const base = { line: raw.line, code: raw.code, name: raw.name };
  const fail = (message: string) => ({ row: { ...base, status: 'error' as const, message } });

  if (raw.code === '') return fail('Stok kodu boş.');
  if (raw.name === '') return fail('Ürün adı boş.');
  const price1 = parseNumber(raw.price1);
  if (!Number.isFinite(price1) || price1 < 0) return fail('Fiyat 1 geçerli bir sayı olmalı.');
  const price2 = raw.price2 === '' ? price1 : parseNumber(raw.price2);
  const price3 = raw.price3 === '' ? price1 : parseNumber(raw.price3);
  if (!Number.isFinite(price2) || !Number.isFinite(price3))
    return fail('Fiyat 2 ve Fiyat 3 sayı olmalı.');
  const category = categorySeeds.find((c) => fold(c.name) === fold(raw.category));
  if (
    raw.category !== '' &&
    !category &&
    !knownCategoryNames.some((n) => fold(n) === fold(raw.category))
  )
    return fail(`Kategori bulunamadı: "${raw.category}".`);
  const brand = brandSeeds.find((b) => fold(b.name) === fold(raw.brand));
  if (raw.brand !== '' && !brand && !knownBrandNames.some((n) => fold(n) === fold(raw.brand)))
    return fail(`Marka bulunamadı: "${raw.brand}".`);
  const vat = raw.vat === '' ? 20 : parseNumber(raw.vat);
  if (!Number.isFinite(vat) || vat < 0 || vat > 100) return fail('KDV 0-100 arasında olmalı.');
  const stock = raw.stock === '' ? Number.NaN : parseNumber(raw.stock);
  if (raw.stock !== '' && !Number.isFinite(stock)) return fail('Stok sayı olmalı.');
  const cost = raw.cost === '' ? 0 : parseNumber(raw.cost);
  if (!Number.isFinite(cost)) return fail('Alış fiyatı sayı olmalı.');

  const existing = items.find((p) => fold(p.code) === fold(raw.code));
  const product: Partial<ProductItem> = {
    code: raw.code,
    name: raw.name,
    prices: [price1, price2, price3],
    cost,
    vatRate: vat,
    brandId: brand?.id ?? null,
    brandName: brand?.name ?? '',
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? 'Kategorisiz',
    stockTracking: Number.isFinite(stock),
    stock: Number.isFinite(stock) ? stock : 0,
  };
  return {
    row: existing
      ? { ...base, status: 'update', message: 'Mevcut ürün, bilgileri güncellenecek.' }
      : { ...base, status: 'new', message: 'Yeni ürün.' },
    product,
  };
}

export const productService = {
  /** Yalnızca testler için: sahte veriyi başlangıç haline döndürür. */
  reset(): void {
    items = productItemSeeds.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
  },

  async list(): Promise<ProductItem[]> {
    await wait(60);
    return items.map((p) => ({ ...p, dealIds: [...p.dealIds] }));
  },

  async setStockTracking(ids: string[], on: boolean): Promise<void> {
    await wait(0);
    items = items.map((p) => (ids.includes(p.id) ? { ...p, stockTracking: on } : p));
  },

  async setSales(ids: string[], on: boolean): Promise<void> {
    await wait(0);
    items = items.map((p) => (ids.includes(p.id) ? { ...p, salesOpen: on } : p));
  },

  async remove(ids: string[]): Promise<void> {
    await wait(0);
    items = items.filter((p) => !ids.includes(p.id));
  },

  /** Ürünü kopyalar: kod ve ad "kopya" ile ayrışır, satışa kapalı başlar. */
  async duplicate(id: string): Promise<ProductItem> {
    await wait(0);
    const source = items.find((p) => p.id === id);
    if (!source) throw new Error('Ürün bulunamadı.');
    const copy: ProductItem = {
      ...source,
      id: `kopya-${++seq}`,
      code: `${source.code}-KOPYA${seq}`,
      name: `${source.name} (Kopya)`,
      salesOpen: false,
      dealIds: [...source.dealIds],
    };
    items = [...items, copy];
    return copy;
  },

  /** Dosyayı denetler; kayıt YAPMAZ. */
  async previewImport(text: string): Promise<ImportPreview & { missingColumns: string[] }> {
    await wait(30);
    const { missingColumns, rows } = parseImport(text);
    const checked = missingColumns.length > 0 ? [] : rows.map((r) => check(r).row);
    // Aynı kod dosyada iki kez geçiyorsa ikincisi hatadır.
    const seen = new Set<string>();
    const result = checked.map((r): ImportRow => {
      const key = fold(r.code);
      if (r.status !== 'error' && seen.has(key))
        return { ...r, status: 'error', message: 'Bu stok kodu dosyada birden fazla kez geçiyor.' };
      seen.add(key);
      return r;
    });
    return {
      missingColumns,
      rows: result,
      newCount: result.filter((r) => r.status === 'new').length,
      updateCount: result.filter((r) => r.status === 'update').length,
      errorCount: result.filter((r) => r.status === 'error').length,
    };
  },

  /** Doğru satırları kaydeder, hatalıları atlar. Kaydedilen sayıyı döndürür. */
  async commitImport(text: string): Promise<{ created: number; updated: number }> {
    await wait(0);
    const { rows } = parseImport(text);
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;
    for (const raw of rows) {
      const { row, product } = check(raw);
      const key = fold(raw.code);
      if (row.status === 'error' || !product || seen.has(key)) continue;
      seen.add(key);
      const at = items.findIndex((p) => fold(p.code) === key);
      if (at >= 0) {
        items = items.map((p, i) => (i === at ? { ...p, ...product } : p));
        updated++;
      } else {
        items = [
          ...items,
          {
            id: `yeni-${++seq}`,
            stockType: 'Basit Ürün',
            imageUrl: null,
            currency: '$',
            salesOpen: true,
            dealIds: [],
            ...product,
          } as ProductItem,
        ];
        created++;
      }
    }
    return { created, updated };
  },
};
