import type { PriceBlockData, SelectOption, StockCardDraft } from '@gt/shared';

export interface ProductDefaults {
  stockType?: string;
  unit?: string;
  purchaseCurrency?: string;
  saleCurrency?: string;
  vatRate?: string;
  vatIncluded?: boolean;
}

/** Resolve a saved option by its stable code or display name, ignoring case/outer spaces. */
export function resolveDefaultOption(value: string | undefined, options: readonly SelectOption[]) {
  const normalized = value?.trim().toLocaleLowerCase('tr');
  if (!normalized) return undefined;
  return options.find((option) =>
    [option.value, option.label].some(
      (candidate) => candidate.trim().toLocaleLowerCase('tr') === normalized,
    ),
  )?.value;
}

function applyPriceDefaults(
  block: PriceBlockData,
  currency: string | undefined,
  defaults: ProductDefaults,
): PriceBlockData {
  return {
    ...block,
    ...(currency ? { currency } : {}),
    ...(defaults.vatRate ? { vatRate: defaults.vatRate } : {}),
    ...(defaults.vatIncluded !== undefined ? { vatIncluded: defaults.vatIncluded } : {}),
  };
}

/** Apply only validated defaults to a pristine new draft; never mutates an existing draft. */
export function applyProductDefaults(
  draft: StockCardDraft,
  defaults: ProductDefaults,
  lookups: {
    stockTypes: readonly SelectOption[];
    units: readonly SelectOption[];
    currencies: readonly SelectOption[];
    vatRates: readonly SelectOption[];
  },
): StockCardDraft {
  const stockType = resolveDefaultOption(defaults.stockType, lookups.stockTypes);
  const unit = resolveDefaultOption(defaults.unit, lookups.units);
  const purchaseCurrency = resolveDefaultOption(defaults.purchaseCurrency, lookups.currencies);
  const saleCurrency = resolveDefaultOption(defaults.saleCurrency, lookups.currencies);
  const vatRate = resolveDefaultOption(defaults.vatRate, lookups.vatRates);
  const validatedDefaults = { ...defaults, vatRate };
  const units = Object.fromEntries(
    Object.entries(draft.units).map(([listId, rows]) => [
      listId,
      rows.map((row, index) => ({
        ...row,
        ...(index === 0 && unit ? { unit } : {}),
        purchase: applyPriceDefaults(row.purchase, purchaseCurrency, validatedDefaults),
        sale: applyPriceDefaults(row.sale, saleCurrency, validatedDefaults),
      })),
    ]),
  );
  return {
    ...draft,
    ...(stockType ? { stockType } : {}),
    units,
  };
}

