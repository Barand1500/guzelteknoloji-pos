import { stockLabel, type ProductItem } from '../types';

const TONE = {
  ok: 'bg-success-soft text-success',
  none: 'bg-surface-muted text-ink-muted',
  out: 'bg-danger-soft text-danger',
} as const;

/** Stok durumu rozeti: "5 adet", "Sınırsız" ya da "Tükendi". */
export function StockBadge({ product }: { product: ProductItem }) {
  const { text, tone } = stockLabel(product);
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${TONE[tone]}`}
    >
      {text}
    </span>
  );
}
