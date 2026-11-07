import { blockTotals } from '../stock/stock.calc';
import { createEmptyDraft, createUnitRow } from '../stock/stock.rules';
import type { StockCardDraft, StockLookups } from '../stock/types';
import { listPricesOf, type ListPrice, type ProductItem } from './types';

/**
 * Ürün listesi satırı ile stok kartı formu arasındaki köprü (yalnızca deneme/sahte veri için).
 * Listedeki fiyat sütunları, formdaki fiyat listeleridir (FİYAT / PERAKENDE / TOPTAN ve kullanıcının
 * eklediği diğerleri); her liste kendi adıyla ve sırasıyla taşınır.
 * Gerçek oturum bu dönüşümü kullanmaz; liste de kartlar da sunucudan okunur.
 */
const CURRENCY: Record<string, string> = { $: 'USD', '₺': 'TRY', '€': 'EUR' };
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', TRY: '₺', EUR: '€' };
/** KDV yüzdesi ↔ KDV departmanı. */
const VAT_DEPARTMENT: Record<number, string> = {
  20: 'genel',
  10: 'gida',
  1: 'temel-gida',
  0: 'kitap',
};
const DEPARTMENT_VAT: Record<string, number> = { genel: 20, gida: 10, 'temel-gida': 1, kitap: 0 };

const text = (n: number) => String(n).replace('.', ',');
const num = (value: string, fallback = 0) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

/** Listedeki ürünü, formun açabileceği dolu stok kartına çevirir. */
export function draftFromProduct(p: ProductItem): StockCardDraft {
  const lists = listPricesOf(p);
  const draft = createEmptyDraft(lists[0]?.id ?? 'fiyat');
  const purchaseCurrency = p.costCurrency ?? CURRENCY[p.currency] ?? 'TRY';
  const units: StockCardDraft['units'] = {};
  for (const list of lists) {
    const row = createUnitRow(true);
    row.purchase = {
      ...row.purchase,
      amount: p.cost ? text(p.cost) : '',
      currency: purchaseCurrency,
      vatRate: String(p.costVatRate ?? p.vatRate),
    };
    row.sale = {
      ...row.sale,
      // Fiyatı girilmemiş liste boş kalır (0 değil).
      amount: list.net === null ? '' : text(list.net),
      currency: list.currency,
      vatRate: String(list.vatRate || p.vatRate),
    };
    units[list.id] = [row];
  }
  return {
    ...draft,
    stockType: 'basit',
    code: p.code,
    name: p.name,
    brand: p.brandId ?? '',
    vatDepartment: VAT_DEPARTMENT[p.vatRate] ?? 'genel',
    inventoryTracking: p.stockTracking ? 'normal' : 'yok',
    // Adet yalnızca takip açıkken anlamlıdır ("Normal" takip).
    stockQuantity: p.stockTracking ? text(p.stock) : '',
    units,
  };
}

/** Kaydedilen formdan, listedeki ürüne yansıyacak alanlar. */
export function patchFromDraft(draft: StockCardDraft, lookups: StockLookups): Partial<ProductItem> {
  const main = (list: string) =>
    (draft.units[list] ?? []).find((r) => r.isMain) ?? draft.units[list]?.[0];
  // Listeler formdaki sırasıyla: önce kayıtlı fiyat listeleri, sonra bu oturumda eklenenler.
  const known = lookups.priceLists.filter((o) => draft.units[o.value]);
  const extra = Object.keys(draft.units)
    .filter((id) => !lookups.priceLists.some((o) => o.value === id))
    .map((id) => ({ value: id, label: id }));
  const listPrices: ListPrice[] = [...known, ...extra].map((o) => {
    const row = main(o.value);
    const entered = row !== undefined && row.sale.amount !== '';
    return {
      id: o.value,
      code: o.value,
      name: o.label,
      net: entered ? Math.round(blockTotals(row.sale).excl * 1e6) / 1e6 : null,
      vatRate: row ? num(row.sale.vatRate, 20) : 20,
      currency: row?.sale.currency ?? 'TRY',
    };
  });
  const first = main(listPrices[0]?.id ?? 'fiyat');
  const sale = (index: number) => listPrices[index]?.net ?? 0;
  return {
    listPrices,
    code: draft.code,
    name: draft.name,
    brandId: draft.brand === '' ? null : draft.brand,
    brandName: lookups.brands.find((b) => b.value === draft.brand)?.label ?? '',
    vatRate: DEPARTMENT_VAT[draft.vatDepartment] ?? 20,
    // Eski sabit alan: ilk üç listenin satışı (yeni kod listPrices kullanır).
    prices: [sale(0), sale(1) || sale(0), sale(2) || sale(0)],
    cost: first && first.purchase.amount !== '' ? num(first.purchase.amount) : 0,
    currency: CURRENCY_SYMBOL[first?.sale.currency ?? 'TRY'] ?? '₺',
    stockTracking: draft.inventoryTracking !== 'yok',
    // Adet girilmemişse ya da takip "Normal" değilse mevcut adet korunur.
    ...(draft.inventoryTracking === 'normal' ? { stock: num(draft.stockQuantity) } : {}),
  };
}
