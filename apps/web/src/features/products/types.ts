/** Alış (maliyet) fiyatı görünümünün kimliği. */
export const COST_VIEW = 'cost';

/** Fiyat görünümü: `COST_VIEW` (alış) ya da kullanıcının bir fiyat listesinin kimliği. */
export type PriceView = string;

/**
 * Ürünün bir fiyat listesindeki (ör. FİYAT, PERAKENDE, BARAN) ana birim satış fiyatı. Listeler
 * kullanıcının kendi tanımıdır; sütun/sekme adı kullanıcının verdiği `name`dir. `net` KDV HARİÇ,
 * iskonto uygulanmış tutardır; fiyat girilmemişse `null` ("—" gösterilir, 0 değildir).
 */
export interface ListPrice {
  id: string;
  code: string;
  name: string;
  net: number | null;
  gross?: number | null;
  vatRate: number;
  /** ISO para birimi kodu (TRY, USD, EUR). */
  currency: string;
}

export interface ProductItem {
  id: string;
  /** Stok kodu. */
  code: string;
  name: string;
  /** Stok tipi, ör. "Basit Ürün". */
  stockType: string;
  brandId: string | null;
  brandName: string;
  categoryId?: string | null;
  categoryIds: string[];
  categoryNames: string[];
  categoryName?: string;
  /** Vitrin resmi (ilk görsel). */
  imageUrl: string | null;
  /** Tüm görseller, sıralı; ilki vitrin resmidir. */
  imageUrls: string[];
  variantCount?: number;
  /** Barkod (Toplu Görsel dosya adıyla eşleştirmek için); sunucu listesi henüz vermiyorsa yoktur. */
  barcode?: string;
  barcodes?: string[];
  /** Para birimi simgesi (ör. "$", "₺"). */
  currency: string;
  /** KDV yüzdesi (ör. 20). */
  vatRate: number;
  /** Kullanıcının TÜM fiyat listeleri, kendi sırasıyla. Eski sunucu yanıtlarında yoktur (bkz. listPricesOf). */
  listPrices?: ListPrice[];
  priceVatRates?: [number, number, number];
  priceCurrencies?: [string, string, string];
  costVatRate?: number;
  costCurrency?: string;
  /** Eski sabit alan: ilk üç listenin KDV HARİÇ satış fiyatları (yeni kod `listPrices` kullanır). */
  prices: [number, number, number];
  /** KDV hariç alış fiyatı. */
  cost: number;
  /** Eldeki adet; stok takibi kapalıysa anlamsızdır. */
  stock: number;
  /** Açıksa adet takip edilir; kapalıysa "Sınırsız" sayılır. */
  stockTracking: boolean;
  /** Kapalıysa ürün satışa kapalıdır (listede kalır, mağazada görünmez). */
  salesOpen: boolean;
  dealIds: string[];
}

/** Süzgeçlerin değerleri. Boş liste / "all" = o süzgeç kapalı. */
export interface ProductFilters {
  categoryIds: string[];
  brandIds: string[];
  /** Stok durumu: takip edilen ve adedi olan / adedi bitmiş / sınırsız (takip kapalı). */
  stock: 'all' | 'in' | 'out' | 'unlimited';
  sales: 'all' | 'open' | 'closed';
  deal: 'all' | 'with' | 'without';
  /** İlk fiyat listesinin (KDV dahil) alt ve üst sınırı; boş = sınırsız. */
  minPrice: string;
  maxPrice: string;
}

/** Seçili ürünlere toplu uygulanan işlem (stok/satış/silme ayrı, bunlar parametreli işlemlerdir). */
export type BulkRequest =
  | { islem: 'firsat_ekle' | 'firsat_kaldir'; firsatId: string }
  | { islem: 'kategori_ekle' | 'kategori_kaldir'; kategoriId: string }
  | { islem: 'marka_ata'; markaId: string | null }
  | {
      islem: 'fiyat_guncelle';
      listeId: string;
      yon: 'satis' | 'alis';
      mod: 'yuzde_artir' | 'yuzde_azalt' | 'tutar_ekle' | 'tutar_cikar' | 'ayarla';
      /** Oran (%) ya da KDV DAHİL tutar; virgül ya da nokta. */
      deger: string;
      yuvarla: 'yok' | 'tam';
    };
export interface BulkResult {
  affected: number;
  /** Fiyat işleminde: o listede fiyatı olmadığı için atlanan ürün sayısı. */
  skipped?: number;
}

export interface ProductPageQuery {
  search: string;
  filters: ProductFilters;
  page: number;
  pageSize: number;
}
export interface ProductFilterOptions {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}
export interface ProductPage {
  items: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
  priceLists: PriceColumn[];
  filterOptions: ProductFilterOptions;
}

export const emptyFilters = (): ProductFilters => ({
  categoryIds: [],
  brandIds: [],
  stock: 'all',
  sales: 'all',
  deal: 'all',
  minPrice: '',
  maxPrice: '',
});

/** Kaç süzgeç açık (süzgeç düğmesindeki sayı rozeti için). */
export function activeFilterCount(f: ProductFilters): number {
  return (
    (f.categoryIds.length > 0 ? 1 : 0) +
    (f.brandIds.length > 0 ? 1 : 0) +
    (f.stock !== 'all' ? 1 : 0) +
    (f.sales !== 'all' ? 1 : 0) +
    (f.deal !== 'all' ? 1 : 0) +
    (f.minPrice !== '' || f.maxPrice !== '' ? 1 : 0)
  );
}

/** KDV dahil tutar. */
export const withVat = (net: number, vatRate: number): number =>
  Math.round(net * (1 + vatRate / 100) * 100) / 100;

const SYMBOL: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
const CODE_OF: Record<string, string> = { '₺': 'TRY', $: 'USD', '€': 'EUR' };
const symbol = (code: string) => SYMBOL[code] ?? code;

/** Eski sunucu yanıtındaki sabit üç liste (adlar bilinen varsayılanlardır). */
const LEGACY_LISTS = [
  ['fiyat', 'FİYAT'],
  ['perakende', 'PERAKENDE'],
  ['toptan', 'TOPTAN'],
] as const;

/** Ürünün fiyat listeleri; sunucu `listPrices` vermiyorsa eski üç sabit alandan türetilir. */
export function listPricesOf(p: ProductItem): ListPrice[] {
  if (p.listPrices) return p.listPrices;
  return LEGACY_LISTS.map(([code, name], i) => ({
    id: code,
    code,
    name,
    net: p.prices[i] ?? null,
    vatRate: p.priceVatRates?.[i] ?? p.vatRate,
    currency: p.priceCurrencies?.[i] ?? CODE_OF[p.currency] ?? 'TRY',
  }));
}

export interface PriceColumn {
  id: string;
  name: string;
}

/** Listedeki ürünlerin fiyat listeleri (tekrarsız, kullanıcının sırasıyla): tablo sütunları ve seçici. */
export function priceListsOf(products: ProductItem[]): PriceColumn[] {
  const seen = new Map<string, string>();
  for (const p of products)
    for (const list of listPricesOf(p)) if (!seen.has(list.id)) seen.set(list.id, list.name);
  return [...seen].map(([id, name]) => ({ id, name }));
}

const listOf = (p: ProductItem, view: PriceView) =>
  listPricesOf(p).find((list) => list.id === view);

/** Seçili fiyat görünümüne göre KDV HARİÇ tutar; fiyat girilmemişse `null` ("—"). */
export const netOf = (p: ProductItem, view: PriceView): number | null =>
  view === COST_VIEW ? (p.cost > 0 ? p.cost : null) : (listOf(p, view)?.net ?? null);

export const vatOf = (p: ProductItem, view: PriceView): number =>
  (view === COST_VIEW ? p.costVatRate : listOf(p, view)?.vatRate) ?? p.vatRate;

export const currencyOf = (p: ProductItem, view: PriceView): string =>
  symbol(
    (view === COST_VIEW ? p.costCurrency : listOf(p, view)?.currency) ??
      CODE_OF[p.currency] ??
      'TRY',
  );

/** KDV dahil tutar; fiyat girilmemişse `null`. */
export function grossOf(p: ProductItem, view: PriceView): number | null {
  const list = view === COST_VIEW ? undefined : listOf(p, view);
  if (list?.gross !== undefined) return list.gross;
  const net = netOf(p, view);
  return net === null ? null : withVat(net, vatOf(p, view));
}

/** Para tutarı; `null` ise "—". */
export const moneyOrDash = (amount: number | null, currency: string): string =>
  amount === null ? '—' : formatMoney(amount, currency);

export const formatMoney = (amount: number, currency: string): string =>
  `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

/** Stok rozeti metni: "5 adet", "Sınırsız", "Tükendi". */
export function stockLabel(p: ProductItem): { text: string; tone: 'ok' | 'none' | 'out' } {
  if (!p.stockTracking) return { text: 'Sınırsız', tone: 'none' };
  if (p.stock <= 0) return { text: 'Tükendi', tone: 'out' };
  return { text: `${p.stock} adet`, tone: 'ok' };
}

/** Süzgeçleri bir ürüne uygular. */
export function matchesFilters(p: ProductItem, f: ProductFilters): boolean {
  if (
    f.categoryIds.length > 0 &&
    !(p.categoryIds ?? (p.categoryId ? [p.categoryId] : [])).some((id) =>
      f.categoryIds.includes(id),
    )
  )
    return false;
  if (f.brandIds.length > 0 && !(p.brandId && f.brandIds.includes(p.brandId))) return false;
  if (f.stock === 'in' && !(p.stockTracking && p.stock > 0)) return false;
  if (f.stock === 'out' && !(p.stockTracking && p.stock <= 0)) return false;
  if (f.stock === 'unlimited' && p.stockTracking) return false;
  if (f.sales === 'open' && !p.salesOpen) return false;
  if (f.sales === 'closed' && p.salesOpen) return false;
  if (f.deal === 'with' && p.dealIds.length === 0) return false;
  if (f.deal === 'without' && p.dealIds.length > 0) return false;
  // Fiyat aralığı kullanıcının İLK fiyat listesine (KDV dahil) uygulanır; fiyatı olmayan ürün aralığa girmez.
  const first = listPricesOf(p)[0];
  const price = first ? grossOf(p, first.id) : null;
  const min = Number.parseFloat(f.minPrice.replace(',', '.'));
  const max = Number.parseFloat(f.maxPrice.replace(',', '.'));
  if (Number.isFinite(min) && (price === null || price < min)) return false;
  if (Number.isFinite(max) && (price === null || price > max)) return false;
  return true;
}

// ---- Excel (CSV) ile yükleme ---------------------------------------------------------------
export type ImportStatus = 'new' | 'update' | 'error';

export interface ImportRow {
  /** Dosyadaki satır numarası (başlık satırı 1'dir). */
  line: number;
  code: string;
  name: string;
  status: ImportStatus;
  /** Hata ya da güncelleme açıklaması. */
  message: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  newCount: number;
  updateCount: number;
  errorCount: number;
}
