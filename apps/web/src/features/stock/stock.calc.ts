import type { PriceBlockData, UnitRow } from './types';

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
  const net = parseNumber(block.amount) * (1 - parseNumber(block.discount) / 100);
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
