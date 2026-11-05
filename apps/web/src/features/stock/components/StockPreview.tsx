import { Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, blockTotals, marginPercent } from '../stock.calc';
import type { StockCardDraft, StockLookups, UnitRow } from '../types';

interface StockPreviewProps {
  draft: StockCardDraft;
  lookups: StockLookups;
  rows: UnitRow[];
  priceListLabel: string;
  /** Kaydet düğmesi vb. kartın altına eklenir. */
  footer: ReactNode;
}

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

/**
 * Canlı kart önizlemesi: kullanıcı yazdıkça ürünün nasıl görüneceğini ve fiyat/kâr hesabını
 * anında gösterir. Masaüstünde sağda yapışkan durur (boş alan kullanılır), telefonda son adımdır.
 */
export function StockPreview({ draft, lookups, rows, priceListLabel, footer }: StockPreviewProps) {
  const chips = [
    labelOf(lookups.stockTypes, draft.stockType),
    labelOf(lookups.brands, draft.brand),
    labelOf(lookups.vatDepartments, draft.vatDepartment),
  ].filter(Boolean);

  return (
    <aside
      aria-label="Kart önizlemesi"
      className="flex flex-col gap-5 rounded-[1.75rem] bg-surface-raised p-5 shadow-soft tablet:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink"
        >
          <Package className="size-6" />
        </span>
        <div className="min-w-0">
          <p
            className={`text-lg leading-tight font-extrabold break-words ${draft.name ? '' : 'text-ink-muted'}`}
          >
            {draft.name || 'Ürün adı'}
          </p>
          <p className="mt-0.5 font-mono text-sm text-ink-muted">{draft.code || 'STOK-KODU'}</p>
        </div>
      </div>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Özellikler">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-bold tracking-wide text-ink-muted uppercase">
          {priceListLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const sale = blockTotals(row.sale);
            const margin = marginPercent(row);
            return (
              <li key={row.id} className="rounded-2xl bg-surface p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold">
                    {labelOf(lookups.units, row.unit)}
                    {row.multiplier && row.multiplier !== '1' ? ` × ${row.multiplier}` : ''}
                    {row.isDefault ? (
                      <span className="ml-2 text-xs font-semibold text-brand-ink">Varsayılan</span>
                    ) : null}
                  </span>
                  <span className="text-lg font-extrabold">
                    {formatMoney(sale.incl, row.sale.currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                  <span>
                    Alış {formatMoney(blockTotals(row.purchase).incl, row.purchase.currency)} · KDV
                    dahil
                  </span>
                  {margin !== null ? (
                    <span className="font-semibold text-success">
                      Kâr %{margin.toFixed(1).replace('.', ',')}
                    </span>
                  ) : null}
                </div>
                {row.barcodes[0] ? (
                  <p className="mt-1 font-mono text-xs text-ink-muted">{row.barcodes[0].code}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {footer}
    </aside>
  );
}
