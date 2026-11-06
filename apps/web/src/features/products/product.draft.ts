import { createEmptyDraft, createUnitRow } from '../stock/stock.rules';
import type { StockCardDraft, StockLookups } from '../stock/types';
import type { ProductItem } from './types';

/**
 * Ürün listesi satırı ile stok kartı formu arasındaki köprü (yalnızca deneme/sahte veri için).
 * Listedeki Fiyat 1/2/3, formdaki fiyat listeleri (FİYAT / PERAKENDE / TOPTAN) ile eşleşir.
 * Gerçek API gelince liste de kartlar da sunucudan gelir ve bu dosya silinir.
 */
const PRICE_LISTS = ['fiyat', 'perakende', 'toptan'] as const;
const CURRENCY: Record<string, string> = { $: 'USD', '₺': 'TRY', '€': 'EUR' };
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', TRY: '₺', EUR: '€' };
/** KDV yüzdesi ↔ KDV departmanı. */
const VAT_DEPARTMENT: Record<number, string> = { 20: 'genel', 10: 'gida', 1: 'temel-gida', 0: 'kitap' };
const DEPARTMENT_VAT: Record<string, number> = { genel: 20, gida: 10, 'temel-gida': 1, kitap: 0 };

const text = (n: number) => String(n).replace('.', ',');
const num = (value: string, fallback = 0) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

/** Listedeki ürünü, formun açabileceği dolu stok kartına çevirir. */
export function draftFromProduct(p: ProductItem): StockCardDraft {
  const draft = createEmptyDraft(PRICE_LISTS[0]);
  const currency = CURRENCY[p.currency] ?? 'TRY';
  const units: StockCardDraft['units'] = {};
  PRICE_LISTS.forEach((list, i) => {
    const row = createUnitRow(true);
    row.purchase = { ...row.purchase, amount: p.cost ? text(p.cost) : '', currency, vatRate: String(p.vatRate) };
    row.sale = {
      ...row.sale,
      amount: text(p.prices[i] ?? 0),
      currency,
      vatRate: String(p.vatRate),
    };
    units[list] = [row];
  });
  return {
    ...draft,
    stockType: 'basit',
    code: p.code,
    name: p.name,
    brand: p.brandId ?? '',
    vatDepartment: VAT_DEPARTMENT[p.vatRate] ?? 'genel',
    inventoryTracking: p.stockTracking ? 'normal' : 'yok',
    units,
  };
}

/** Kaydedilen formdan, listedeki ürüne yansıyacak alanlar. */
export function patchFromDraft(draft: StockCardDraft, lookups: StockLookups): Partial<ProductItem> {
  const main = (list: string) =>
    (draft.units[list] ?? []).find((r) => r.isMain) ?? draft.units[list]?.[0];
  const first = main(PRICE_LISTS[0]);
  const sale = (list: string, fallback: number) => {
    const row = main(list);
    return row && row.sale.amount !== '' ? num(row.sale.amount) : fallback;
  };
  const p1 = sale(PRICE_LISTS[0], 0);
  return {
    code: draft.code,
    name: draft.name,
    brandId: draft.brand === '' ? null : draft.brand,
    brandName: lookups.brands.find((b) => b.value === draft.brand)?.label ?? '',
    vatRate: DEPARTMENT_VAT[draft.vatDepartment] ?? 20,
    prices: [p1, sale(PRICE_LISTS[1], p1), sale(PRICE_LISTS[2], p1)],
    cost: first && first.purchase.amount !== '' ? num(first.purchase.amount) : 0,
    currency: CURRENCY_SYMBOL[first?.sale.currency ?? 'TRY'] ?? '₺',
    stockTracking: draft.inventoryTracking !== 'yok',
  };
}
