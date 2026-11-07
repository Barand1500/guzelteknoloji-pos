import { Check, Copy, MoreHorizontal, Pencil } from 'lucide-react';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import {
  currencyOf,
  formatMoney,
  netOf,
  vatOf,
  withVat,
  type PriceView,
  type ProductItem,
} from '../types';
import { ProductThumb } from './ProductThumb';
import { StockBadge } from './StockBadge';

interface ProductRowProps {
  product: ProductItem;
  priceView: PriceView;
  /** Ayrıntı paneli açık mı (yalnızca telefon satırı). */
  expanded: boolean;
  /** Seçim modu: satıra dokunmak seçer, ayrıntı açılmaz. */
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMore: () => void;
  onZoom: () => void;
  onStockTracking: (on: boolean) => void;
  onSales: (on: boolean) => void;
}

const VIEW_NAMES: Record<PriceView, string> = {
  p1: 'Fiyat 1',
  p2: 'Fiyat 2',
  p3: 'Fiyat 3',
  cost: 'Alış',
};

/**
 * Telefon satırı: kapalıyken resim, ad, kod, stok durumu ve seçili fiyat; dokununca satır
 * açılır ve üç fiyat, stok/satış anahtarları ile işlemler görünür. Seçim modunda satır seçer.
 */
export function ProductRow({
  product,
  priceView,
  expanded,
  selecting,
  selected,
  onPress,
  onEdit,
  onDuplicate,
  onMore,
  onZoom,
  onStockTracking,
  onSales,
}: ProductRowProps) {
  const shown = withVat(netOf(product, priceView), vatOf(product, priceView));
  const margin =
    product.cost > 0 && currencyOf(product, 'p1') === currencyOf(product, 'cost')
      ? Math.round(((product.prices[0] - product.cost) / product.cost) * 100)
      : null;

  return (
    <div className={expanded ? 'rounded-3xl ring-2 ring-brand-500/40' : ''}>
      <div
        className={[
          'flex items-center gap-3 rounded-3xl border bg-surface-raised p-2.5',
          selected ? 'border-brand-600 bg-brand-50' : 'border-line',
          expanded ? 'rounded-b-none border-b-0' : '',
        ].join(' ')}
      >
        {selecting ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`${product.name} seç`}
            onClick={onPress}
            className="flex size-9 shrink-0 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={[
                'flex size-6 items-center justify-center rounded-lg border-2 transition-colors',
                selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-field-border',
              ].join(' ')}
            >
              {selected ? <Check className="size-4" /> : null}
            </span>
          </button>
        ) : null}
        <ProductThumb product={product} onZoom={selecting ? undefined : onZoom} />
        <button
          type="button"
          onClick={onPress}
          aria-expanded={selecting ? undefined : expanded}
          aria-label={
            selecting ? undefined : `${product.name} ayrıntılarını ${expanded ? 'kapat' : 'aç'}`
          }
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm leading-snug font-bold">{product.name}</span>
            {(product.variantCount ?? 0) > 0 && (
              <span className="block text-xs text-brand-ink">{product.variantCount} varyant</span>
            )}
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs text-ink-muted">{product.code}</span>
              <StockBadge product={product} />
              {product.salesOpen ? null : (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-ink">
                  Satışta değil
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-extrabold">
              {formatMoney(shown, currencyOf(product, priceView))}
            </span>
            <span className="block text-[0.6875rem] text-ink-muted">
              {VIEW_NAMES[priceView]} · KDV dahil
            </span>
          </span>
        </button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-3 rounded-b-3xl border border-t-0 border-line bg-brand-50 p-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {(['p1', 'p2', 'p3'] as const).map((view) => (
              <div
                key={view}
                className={[
                  'rounded-2xl bg-surface-raised px-1 py-2',
                  view === priceView ? 'ring-2 ring-brand-600' : '',
                ].join(' ')}
              >
                <dt className="text-[0.6875rem] font-semibold text-ink-muted">
                  {VIEW_NAMES[view]}
                </dt>
                <dd className="text-sm font-extrabold">
                  {formatMoney(
                    withVat(netOf(product, view), vatOf(product, view)),
                    currencyOf(product, view),
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="px-1 text-xs text-ink-muted">
            KDV %{vatOf(product, priceView)} dahil
            {product.cost > 0
              ? ` · Alış ${formatMoney(product.cost, currencyOf(product, 'cost'))}${margin !== null ? ` · Kâr %${margin}` : ''}`
              : ''}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <span className="flex items-center text-sm font-semibold">
              Stok Takibi
              <ToggleSwitch
                label={`${product.name} stok takibi`}
                checked={product.stockTracking}
                onChange={onStockTracking}
              />
            </span>
            <span className="flex items-center text-sm font-semibold">
              Satışta
              <ToggleSwitch
                label={`${product.name} satışta`}
                checked={product.salesOpen}
                onChange={onSales}
              />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ActionButton icon={<Pencil className="size-4" />} label="Düzenle" onClick={onEdit} />
            <ActionButton icon={<Copy className="size-4" />} label="Kopya" onClick={onDuplicate} />
            <ActionButton
              icon={<MoreHorizontal className="size-4" />}
              label="Diğer"
              onClick={onMore}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-surface-raised text-sm font-bold text-brand-ink transition-colors hover:bg-brand-100"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
