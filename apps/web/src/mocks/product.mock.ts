/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca servis katmanı (features/products/services) içe aktarır.
 * Ürünler marka/kategori/fırsat ekranlarındaki ürünlerle aynıdır (aynı kimlikler).
 */
import type { ProductItem } from '../features/products/types';
import { brandSeeds, productSeeds } from './brand.mock';
import { categoryProductSeeds, categorySeeds } from './category.mock';
import { dealProductSeeds } from './deal.mock';

/** Ürün resmi taklidi: koyu ekranlı küçük bir cihaz çizimi (kullanıcı yüklemesi yerine). */
function device(screen: string): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#f2f1ec"/>' +
    `<rect x="16" y="20" width="64" height="40" rx="4" fill="${screen}"/>` +
    '<rect x="40" y="60" width="16" height="12" fill="#3a424d"/>' +
    '<rect x="30" y="72" width="36" height="5" rx="2" fill="#3a424d"/></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Fiyat 1/2/3 (KDV hariç), eldeki adet (-1 = stok takibi kapalı). Sıra: productSeeds sırası. */
const sheet: { p: [number, number, number]; cost: number; stock: number; sales?: boolean }[] = [
  { p: [265, 275, 375], cost: 224, stock: 5 },
  { p: [295, 305, 400], cost: 250, stock: 5 },
  { p: [320, 330, 425], cost: 272, stock: -1 },
  { p: [350, 360, 450], cost: 297, stock: -1, sales: false },
  { p: [345, 355, 450], cost: 293, stock: -1 },
  { p: [410, 420, 525], cost: 348, stock: 0 },
  { p: [5265, 5400, 5900], cost: 4700, stock: 12 },
  { p: [880, 910, 990], cost: 700, stock: 40 },
  { p: [940, 970, 1050], cost: 760, stock: 22 },
  { p: [1200, 1240, 1320], cost: 960, stock: 0 },
  { p: [3100, 3200, 3400], cost: 2500, stock: 7 },
  { p: [4300, 4400, 4700], cost: 3500, stock: 3 },
  { p: [4900, 5000, 5300], cost: 3950, stock: -1 },
  { p: [6100, 6250, 6600], cost: 4900, stock: 2 },
  { p: [650, 690, 750], cost: 520, stock: 60 },
  { p: [590, 620, 680], cost: 470, stock: 18, sales: false },
];

/** Varsayılan fiyat listeleri (formdaki ilk üç sekme). Kimlik = kod. */
export const DEFAULT_PRICE_LISTS = [
  { id: 'fiyat', name: 'FİYAT' },
  { id: 'perakende', name: 'PERAKENDE' },
  { id: 'toptan', name: 'TOPTAN' },
] as const;

const brandName = (id: string | null): string => brandSeeds.find((b) => b.id === id)?.name ?? '';
const categoryName = (id: string): string => categorySeeds.find((c) => c.id === id)?.name ?? '';

export const productItemSeeds: ProductItem[] = productSeeds.map((seed, i) => {
  const row = sheet[i % sheet.length]!;
  const image = device(i % 2 === 0 ? '#1d232b' : '#16324f');
  const categoryId = categoryProductSeeds.find((c) => c.id === seed.id)?.categoryId ?? null;
  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    stockType: 'Basit Ürün',
    brandId: seed.brandId,
    brandName: brandName(seed.brandId),
    categoryIds: categoryId ? [categoryId] : [],
    categoryNames: categoryId ? [categoryName(categoryId)] : [],
    imageUrl: image,
    imageUrls: [image],
    barcode: seed.barcode,
    currency: i < 6 ? '$' : '₺',
    vatRate: 20,
    prices: [...row.p],
    listPrices: DEFAULT_PRICE_LISTS.map((list, k) => ({
      id: list.id,
      code: list.id,
      name: list.name,
      purchase: { net: row.cost, vatRate: 20, currency: i < 6 ? 'USD' : 'TRY' },
      net: row.p[k] ?? null,
      vatRate: 20,
      currency: i < 6 ? 'USD' : 'TRY',
    })),
    cost: row.cost,
    stock: Math.max(0, row.stock),
    stockTracking: row.stock !== -1,
    salesOpen: row.sales ?? true,
    dealIds: [...(dealProductSeeds.find((d) => d.id === seed.id)?.dealIds ?? [])],
  };
});

/** Excel yükleme doğrulaması için bilinen kategori ve marka adları. */
export const knownCategoryNames = categorySeeds.map((c) => c.name);
export const knownBrandNames = brandSeeds.map((b) => b.name);
