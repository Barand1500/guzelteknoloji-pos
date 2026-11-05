import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { blockTotals, formatMoney } from '../stock.calc';
import { ExtraPrices } from './ExtraPrices';
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
    <fieldset className="min-w-0 rounded-2xl bg-surface p-4">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold tracking-wide text-ink-muted uppercase" aria-hidden="true">
          {title}
        </p>
        <p className="text-sm text-ink-muted">
          KDV dahil:{' '}
          <span className="font-bold text-ink">{formatMoney(totals.incl, data.currency)}</span>
        </p>
      </div>
      {/* Telefonda 6 sütun (2 alan/satır), md+ ekranda 12 sütunla 2 sıkı satır. */}
      <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
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
            numeric="decimal"
            value={data.discount}
            onChange={(e) => onChange({ discount: e.target.value })}
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
      <ExtraPrices
        title={title}
        items={data.extras}
        defaultCurrency={data.currency}
        currencies={lookups.currencies}
        onChange={(extras) => onChange({ extras })}
      />
    </fieldset>
  );
}
