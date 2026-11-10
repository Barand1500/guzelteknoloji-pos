import type { PriceBlockData, StockCardDraft, UnitRow } from './types';
import { discountPercent } from '@gt/shared';

/** "12,5" ve "12.5" ikisi de kabul edilir; geçersiz/boş değer 0 sayılır. */
export function parseNumber(text: string): number {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value);
}

export interface BlockTotals {
  /** İskonto sonrası, girilen KDV durumuyla aynı cinsten tutar. */
  net: number;
  /** KDV hariç tutar. */
  excl: number;
  /** KDV dahil tutar. */
  incl: number;
}

/** Fiyat bloğundan net / KDV hariç / KDV dahil tutarları hesaplar. */
export function blockTotals(block: PriceBlockData): BlockTotals {
  const net = parseNumber(block.amount) * (1 - (discountPercent(block.discount) ?? 0) / 100);
  const rate = parseNumber(block.vatRate) / 100;
  const excl = block.vatIncluded ? net / (1 + rate) : net;
  return { net, excl, incl: excl * (1 + rate) };
}

/** Kâr oranı (%), yalnızca alış-satış aynı para biriminde ve alış > 0 iken hesaplanır. */
export function marginPercent(row: UnitRow): number | null {
  if (row.purchase.currency !== row.sale.currency) return null;
  const buy = blockTotals(row.purchase).excl;
  const sell = blockTotals(row.sale).excl;
  if (buy <= 0 || sell <= 0) return null;
  return ((sell - buy) / buy) * 100;
}

/** Ek fiyatın iskonto sonrası net tutarı. */
export function extraNet(amount: string, discount: string): number {
  return parseNumber(amount) * (1 - (discountPercent(discount) ?? 0) / 100);
}

export type Shape = 'prizma' | 'kup' | 'silindir';

/** Şekle göre ölçü alanları: a, b, c sırasıyla (cm). */
export const SHAPE_FIELDS: Record<Shape, { key: 'a' | 'b' | 'c'; label: string }[]> = {
  prizma: [
    { key: 'a', label: 'En' },
    { key: 'b', label: 'Boy' },
    { key: 'c', label: 'Yükseklik' },
  ],
  kup: [{ key: 'a', label: 'Kenar' }],
  silindir: [
    { key: 'a', label: 'Çap' },
    { key: 'c', label: 'Yükseklik' },
  ],
};

/** Hacim (cm³). Silindirde a = çap, c = yükseklik. */
export function shapeVolumeCm3(shape: Shape, dims: { a: number; b: number; c: number }): number {
  if (shape === 'kup') return dims.a ** 3;
  if (shape === 'silindir') return Math.PI * (dims.a / 2) ** 2 * dims.c;
  return dims.a * dims.b * dims.c;
}

export type DesiRegion = 'yurtici' | 'yurtdisi';

/** Desi bölenleri: yurt içi kargoda 3000, yurt dışı (DHL/UPS/FedEx gibi) taşımada 5000. */
export const DESI_DIVISORS: Record<DesiRegion, number> = { yurtici: 3000, yurtdisi: 5000 };

/** Kargo hacmi (desi) = hacim (cm³) ÷ bölen. */
export const volumeToDesi = (cm3: number, region: DesiRegion = 'yurtici'): number =>
  cm3 / DESI_DIVISORS[region];

/** Sayıyı Türkçe biçimde (en çok 3 ondalık) yazar. */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(value);

/** Forma yazılacak değer: virgüllü, en çok 3 ondalık, gereksiz sıfırsız. */
export const toInputValue = (value: number): string =>
  String(Math.round(value * 1000) / 1000).replace('.', ',');

/** Kartın "doluluk" kontrolleri: zorunlu değil, kullanıcıya eksikleri hatırlatır. */
export function getCompletion(draft: StockCardDraft): { label: string; ok: boolean }[] {
  const allRows = Object.values(draft.units).flat();
  return [
    { label: 'Kod', ok: draft.code.trim() !== '' },
    { label: 'Ad', ok: draft.name.trim() !== '' },
    { label: 'Marka', ok: draft.brand !== '' },
    { label: 'Satış fiyatı', ok: allRows.some((r) => parseNumber(r.sale.amount) > 0) },
    { label: 'Barkod', ok: allRows.some((r) => r.barcodes.length > 0) },
  ];
}
