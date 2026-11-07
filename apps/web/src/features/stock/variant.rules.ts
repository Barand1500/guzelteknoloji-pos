export interface Variant {
  code: string;
  barcode: string;
  price: string;
  quantity: string;
  valueIds: string[];
}
export interface VariantSnapshot {
  variants: Variant[];
  revision: string;
}
const key = (ids: string[]) => [...ids].sort().join(',');

/** Retain entered identifiers, prices and quantities when adding a new dimension. */
export function reconcileVariants(rows: Variant[], combinations: string[][]): Variant[] {
  const remaining = new Map(combinations.map((ids) => [key(ids), ids]));
  const exact = new Set(
    rows.filter((r) => remaining.has(key(r.valueIds))).map((r) => key(r.valueIds)),
  );
  const retained = rows.map((row) => {
    const match =
      remaining.get(key(row.valueIds)) ??
      [...remaining.values()].find(
        (ids) => !exact.has(key(ids)) && row.valueIds.every((id) => ids.includes(id)),
      );
    if (!match) return row; // Never discard an existing row's entered data.
    remaining.delete(key(match));
    return { ...row, valueIds: match };
  });
  return [
    ...retained,
    ...[...remaining.values()].map((valueIds) => ({
      code: '',
      barcode: '',
      price: '0',
      quantity: '0',
      valueIds,
    })),
  ];
}
