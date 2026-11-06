import { Check, Circle, Package } from 'lucide-react';
import { blockTotals, formatMoney, getCompletion, marginPercent } from '../stock.calc';
import type { StockCardDraft, StockLookups, UnitRow } from '../types';

interface StockPreviewProps {
  draft: StockCardDraft;
  lookups: StockLookups;
  rows: UnitRow[];
  priceListLabel: string;
}

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

/**
 * Canlı kart önizlemesi (yan panelin "Özet" kutusunun içeriği): kullanıcı yazdıkça ürünün nasıl
 * görüneceğini ve fiyat/kâr hesabını anında gösterir. Kutu çerçevesini SideBox çizer.
 */
export function StockPreview({ draft, lookups, rows, priceListLabel }: StockPreviewProps) {
  const chips = [
    labelOf(lookups.stockTypes, draft.stockType),
    labelOf(lookups.brands, draft.brand),
    labelOf(lookups.vatDepartments, draft.vatDepartment),
  ].filter(Boolean);

  const checks = getCompletion(draft);
  const done = checks.filter((x) => x.ok).length;

  return (
    <section aria-label="Kart önizlemesi" className="flex flex-col gap-5 pt-1">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink"
        >
          <Package className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-lg leading-tight font-extrabold break-words ${draft.name ? '' : 'text-ink-muted'}`}
          >
            {draft.name || 'Ürün adı'}
          </p>
          <p className="mt-0.5 font-mono text-sm text-ink-muted">{draft.code || 'STOK-KODU'}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-bold tracking-wide text-ink-muted uppercase">
          <span>Kart Doluluğu</span>
          <span>
            {done}/{checks.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Kart doluluğu"
          aria-valuemin={0}
          aria-valuemax={checks.length}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${(done / checks.length) * 100}%` }}
          />
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Doluluk listesi">
          {checks.map((x) => (
            <li
              key={x.label}
              className={[
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                x.ok ? 'bg-brand-50 text-brand-ink' : 'bg-surface-muted text-ink-muted',
              ].join(' ')}
            >
              {x.ok ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <Circle className="size-3" aria-hidden="true" />
              )}
              {x.label}
            </li>
          ))}
        </ul>
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
    </section>
  );
}
