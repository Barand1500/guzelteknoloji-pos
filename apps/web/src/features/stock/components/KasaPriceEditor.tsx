import { Delete } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Segmented } from '../../../components/ui/Segmented';
import { blockTotals, formatMoney, marginPercent, parseNumber } from '../stock.calc';
import type { PriceBlockData, StockLookups, UnitRow } from '../types';

type Side = 'purchase' | 'sale';
type Target = 'amount' | 'discount';

interface KasaPriceEditorProps {
  row: UnitRow;
  /** Üstte gösterilen birim adı (örn. "ADET"). */
  unitLabel: string;
  lookups: Pick<StockLookups, 'currencies' | 'vatRates'>;
  onChange: (patch: Partial<UnitRow>) => void;
}

const SIDES = [
  { value: 'purchase', label: 'Alış' },
  { value: 'sale', label: 'Satış' },
];
const VAT_MODES = [
  { value: 'haric', label: 'Hariç' },
  { value: 'dahil', label: 'Dahil' },
];
const MAX_LENGTH = 12;
const MAX_DECIMALS = 2;

/** "1250,5" → "1.250,5" (yalnızca ekranda gösterim için). */
function groupThousands(raw: string): string {
  const [integer = '', decimals] = raw.replace('.', ',').split(',');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals === undefined && !raw.includes(',') && !raw.includes('.')
    ? grouped
    : `${grouped},${decimals ?? ''}`;
}

/**
 * Telefonda Fiyat sekmesi — "Kasa Modu": fiyat dev rakamla ekranın ortasında, altında tuş takımı.
 * Alış/Satış hızlı geçişi, KDV oranı ve para birimi tek dokunuşluk çipler. Ekran klavyesi açılmaz;
 * kasa tuşlarıyla girilir. Sağdaki uzun tuş Alış ↔ Satış arasında geçer. Kaydet alt çubuktaki "+" düğmesindedir.
 */
export function KasaPriceEditor({ row, unitLabel, lookups, onChange }: KasaPriceEditorProps) {
  const [side, setSide] = useState<Side>('sale');
  const [target, setTarget] = useState<Target>('amount');

  const block = row[side];
  const patchBlock = (patch: Partial<PriceBlockData>) =>
    onChange({ [side]: { ...block, ...patch } });

  const editing = target === 'amount' ? block.amount : block.discount;
  const symbol =
    target === 'amount'
      ? block.currency === 'TRY'
        ? '₺'
        : currencySymbol(lookups, block.currency)
      : '%';
  const totals = blockTotals(block);
  const margin = side === 'sale' ? marginPercent(row) : null;
  const sideLabel = side === 'sale' ? 'Satış' : 'Alış';

  /** Tuşa basılınca değeri günceller (yalnızca rakam, tek virgül, en çok 2 ondalık). */
  const press = (key: string) => {
    let next = editing;
    if (key === 'back') {
      next = editing.slice(0, -1);
    } else if (key === ',') {
      if (editing.includes(',') || editing.includes('.')) return;
      next = `${editing === '' ? '0' : editing},`;
    } else if (key === '00') {
      if (editing === '' || editing === '0') next = editing === '' ? '0' : editing;
      else next = `${editing}00`;
    } else {
      next = editing === '0' ? key : `${editing}${key}`;
    }
    if (next.length > MAX_LENGTH) return;
    const decimals = next.split(/[,.]/)[1];
    if (decimals !== undefined && decimals.length > MAX_DECIMALS) return;
    if (target === 'discount' && parseNumber(next) > 100) return;
    patchBlock(target === 'amount' ? { amount: next } : { discount: next });
  };

  const key = (
    id: string,
    label: ReactNode,
    onPress: () => void,
    className = '',
    aria?: string,
  ) => (
    <button
      type="button"
      key={id}
      aria-label={aria}
      onClick={onPress}
      className={[
        'flex min-h-13 items-center justify-center rounded-2xl text-2xl font-bold shadow-[0_1px_0_var(--color-line)] transition-transform active:scale-95',
        className || 'bg-surface-raised text-ink',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <section aria-label="Fiyat girişi" className="flex flex-col gap-3">
      <Segmented
        label="Fiyat türü"
        value={side}
        options={SIDES}
        onChange={(v) => {
          setSide(v as Side);
          setTarget('amount');
        }}
      />

      {/* Dev rakam ekranı */}
      <div className="rounded-3xl border border-line bg-surface-raised px-4 py-4 text-center">
        <p className="text-sm font-semibold text-ink-muted">
          {unitLabel} · {target === 'amount' ? `${sideLabel} fiyatı` : `${sideLabel} iskontosu`}
        </p>
        <output
          aria-label={target === 'amount' ? `${sideLabel} fiyatı` : `${sideLabel} iskontosu`}
          className="mt-1 flex items-baseline justify-center gap-2 text-5xl font-extrabold tracking-tight"
        >
          <span className="text-3xl text-ink-muted">{symbol}</span>
          <span className={editing === '' ? 'text-ink-muted/50' : ''}>
            {editing === '' ? '0' : groupThousands(editing)}
          </span>
        </output>
        <p className="mt-1 text-sm text-ink-muted">
          KDV Dahil <b className="text-ink">{formatMoney(totals.incl, block.currency)}</b>
          {margin !== null ? (
            <span className="font-semibold text-success">
              {' '}
              · Kâr %{margin.toFixed(1).replace('.', ',')}
            </span>
          ) : null}
        </p>
      </div>

      {/* Hızlı seçimler: KDV oranı, Hariç/Dahil, para birimi, iskonto */}
      <div className="flex flex-col gap-2.5">
        <div role="radiogroup" aria-label="KDV oranı" className="flex items-center gap-2">
          <span className="w-10 text-xs font-bold text-ink-muted">KDV</span>
          {lookups.vatRates.map((rate) => (
            <Chip
              key={rate.value}
              checked={block.vatRate === rate.value}
              onClick={() => patchBlock({ vatRate: rate.value })}
              label={rate.label}
              className="flex-1"
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Segmented
              label="KDV durumu"
              value={block.vatIncluded ? 'dahil' : 'haric'}
              options={VAT_MODES}
              onChange={(v) => patchBlock({ vatIncluded: v === 'dahil' })}
            />
          </div>
          <div role="radiogroup" aria-label="Para birimi" className="flex gap-1.5">
            {lookups.currencies.map((c) => (
              <Chip
                key={c.value}
                checked={block.currency === c.value}
                onClick={() => patchBlock({ currency: c.value })}
                label={c.label.split(' ')[0] ?? c.value}
                ariaLabel={c.label}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-pressed={target === 'discount'}
          onClick={() => setTarget((t) => (t === 'amount' ? 'discount' : 'amount'))}
          className={[
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors',
            target === 'discount'
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border text-ink-muted',
          ].join(' ')}
        >
          İskonto %{block.discount === '' ? '0' : groupThousands(block.discount)}
          <span className="text-xs font-semibold opacity-70">
            {target === 'discount' ? '· fiyata dön' : '· düzenle'}
          </span>
        </button>
      </div>

      {/* Tuş takımı */}
      <div className="grid grid-cols-4 gap-2 rounded-3xl bg-surface-muted p-2.5">
        {['1', '2', '3'].map((d) => key(d, d, () => press(d)))}
        {key(
          'back',
          <Delete className="size-6" aria-hidden="true" />,
          () => press('back'),
          'bg-brand-50 text-brand-ink',
          'Sil',
        )}
        {['4', '5', '6'].map((d) => key(d, d, () => press(d)))}
        {key(
          'side',
          side === 'sale' ? '‹ Alış' : 'Satış ›',
          () => {
            setSide(side === 'sale' ? 'purchase' : 'sale');
            setTarget('amount');
          },
          'row-span-3 bg-brand-50 text-brand-ink text-base!',
          side === 'sale' ? 'Alış fiyatına geç' : 'Satış fiyatına geç',
        )}
        {['7', '8', '9'].map((d) => key(d, d, () => press(d)))}
        {key('comma', ',', () => press(','), 'bg-brand-50 text-brand-ink', 'Virgül')}
        {key('0', '0', () => press('0'))}
        {key('00', '00', () => press('00'), 'bg-brand-50 text-brand-ink')}
      </div>
    </section>
  );
}

/** Para biriminin kısa simgesi ("₺ TRY" → "₺"). */
function currencySymbol(lookups: Pick<StockLookups, 'currencies'>, code: string): string {
  return lookups.currencies.find((c) => c.value === code)?.label.split(' ')[0] ?? code;
}

function Chip({
  checked,
  onClick,
  label,
  ariaLabel,
  className = '',
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        'min-h-10 rounded-full border px-3 text-sm font-bold whitespace-nowrap transition-colors',
        checked
          ? 'border-brand-600 bg-brand-700 text-white'
          : 'border-field-border bg-surface-raised text-ink-muted',
        className,
      ].join(' ')}
    >
      {label}
    </button>
  );
}
