import { Segmented } from '../../../components/ui/Segmented';
import { discountPercent } from '@gt/shared';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { blockTotals, formatMoney } from '../stock.calc';
import type { PriceBlockData, StockLookups } from '../types';

interface PriceBlockProps {
  /** "Alış" ya da "Satış". */
  title: string;
  data: PriceBlockData;
  lookups: Pick<StockLookups, 'currencies' | 'vatRates'>;
  onChange: (patch: Partial<PriceBlockData>) => void;
}

const VAT_MODES = [
  { value: 'haric', label: 'Hariç' },
  { value: 'dahil', label: 'Dahil' },
];

/**
 * Bir birimin alış ya da satış tarafı: fiyat + para birimi, iskonto, net fiyat (otomatik),
 * KDV oranı ve hariç/dahil seçimi. Alt satırda KDV'li toplam gösterilir.
 */
export function PriceBlock({ title, data, lookups, onChange }: PriceBlockProps) {
  const totals = blockTotals(data);
  return (
    <fieldset className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-line bg-surface-muted/60 px-4 py-3">
        <p className="text-sm font-extrabold tracking-wide text-ink" aria-hidden="true">
          {title} Fiyatlandırması
        </p>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">
          <span>
            KDV Dahil:{' '}
            <strong className="text-sm font-extrabold text-ink">
              {formatMoney(totals.incl, data.currency)}
            </strong>
          </span>
        </p>
      </div>
      {/* Telefonda 6 sütun (2 alan/satır), md+ ekranda 12 sütunla 2 sıkı satır. */}
      <div className="grid grid-cols-6 gap-3 px-4 pb-4 md:grid-cols-12">
        <div className="col-span-3 md:col-span-5">
          <TextField
            label={`${title} Fiyatı`}
            numeric="decimal"
            value={data.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
        </div>
        <div className="col-span-3 md:col-span-3">
          <SelectField
            label="Para Birimi"
            options={lookups.currencies}
            value={data.currency}
            onChange={(currency) => onChange({ currency })}
          />
        </div>
        <div className="col-span-3 md:col-span-4">
          <TextField
            label="İskonto %"
            inputMode="text"
            value={data.discount}
            onChange={(e) => onChange({ discount: e.target.value })}
            error={
              discountPercent(data.discount) === null
                ? 'Her iskonto oranı 0–100 arasında olmalı. Örnek: 20+20.'
                : undefined
            }
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const result = discountPercent(data.discount);
              if (result !== null) onChange({ discount: String(result).replace('.', ',') });
            }}
          />
        </div>
        <div className="col-span-3 md:col-span-4">
          <SelectField
            label={`${title} KDV`}
            options={lookups.vatRates}
            value={data.vatRate}
            onChange={(vatRate) => onChange({ vatRate })}
          />
        </div>
        <div className="col-span-3 flex items-center md:col-span-4">
          <div className="w-full">
            <Segmented
              label={`${title} KDV durumu`}
              value={data.vatIncluded ? 'dahil' : 'haric'}
              options={VAT_MODES}
              onChange={(v) => onChange({ vatIncluded: v === 'dahil' })}
            />
          </div>
        </div>
        <div className="col-span-3 md:col-span-4">
          <TextField
            label="Net Fiyat"
            readOnly
            tabIndex={-1}
            value={formatMoney(totals.net, data.currency)}
          />
        </div>
      </div>
    </fieldset>
  );
}
