/** Fiyat listesi sırası: Fiyat 1/2/3 satış fiyatlarıdır, "cost" alış fiyatıdır. */
export type PriceView = 'p1' | 'p2' | 'p3' | 'cost';

export interface ProductItem {
  id: string;
  /** Stok kodu. */
  code: string;
  name: string;
  /** Stok tipi, ör. "Basit Ürün". */
  stockType: string;
  brandId: string | null;
  brandName: string;
  /** Ürün birden çok kategoride olabilir (sunucu sözleşmesi: categoryIds / categoryNames). */
  categoryIds: string[];
  categoryNames: string[];
  imageUrl: string | null;
  /** Para birimi simgesi (ör. "$", "₺"). */
  currency: string;
  /** KDV yüzdesi (ör. 20). */
  vatRate: number;
  /** KDV HARİÇ satış fiyatları: Fiyat 1, 2, 3. */
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
  /** Fiyat 1 (KDV dahil) alt ve üst sınırı; boş = sınırsız. */
  minPrice: string;
  maxPrice: string;
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

/** Seçili fiyat görünümüne göre satırda gösterilecek KDV HARİÇ tutar. */
export const netOf = (p: ProductItem, view: PriceView): number =>
  view === 'cost' ? p.cost : p.prices[view === 'p1' ? 0 : view === 'p2' ? 1 : 2];

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
  if (f.categoryIds.length > 0 && !p.categoryIds.some((id) => f.categoryIds.includes(id)))
    return false;
  if (f.brandIds.length > 0 && !(p.brandId && f.brandIds.includes(p.brandId))) return false;
  if (f.stock === 'in' && !(p.stockTracking && p.stock > 0)) return false;
  if (f.stock === 'out' && !(p.stockTracking && p.stock <= 0)) return false;
  if (f.stock === 'unlimited' && p.stockTracking) return false;
  if (f.sales === 'open' && !p.salesOpen) return false;
  if (f.sales === 'closed' && p.salesOpen) return false;
  if (f.deal === 'with' && p.dealIds.length === 0) return false;
  if (f.deal === 'without' && p.dealIds.length > 0) return false;
  const price = withVat(p.prices[0], p.vatRate);
  const min = Number.parseFloat(f.minPrice.replace(',', '.'));
  const max = Number.parseFloat(f.maxPrice.replace(',', '.'));
  if (Number.isFinite(min) && price < min) return false;
  if (Number.isFinite(max) && price > max) return false;
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
