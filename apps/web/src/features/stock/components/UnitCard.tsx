import { Calculator, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleChip } from '../../../components/ui/ToggleChip';
import type { OptionList } from '../hooks/useOptionList';
import type { PriceBlockData, StockLookups, UnitRow, WeightUnit } from '../types';
import { BarcodeEditor } from './BarcodeEditor';
import { MeasureCalculator } from './MeasureCalculator';
import { PriceBlock } from './PriceBlock';

/** Bir birim satırını düzenleyen parçaların ortak girdileri. */
export interface UnitPartProps {
  row: UnitRow;
  /** Satırın sırası (ilk satırın çarpanı 1 ve kilitlidir). */
  index: number;
  lookups: StockLookups;
  units: OptionList;
  onChange: (patch: Partial<UnitRow>) => void;
}

interface UnitCardProps extends UnitPartProps {
  /** Yalnızca birden fazla satır varken verilir (en az bir birim kalmalı). */
  onRemove?: (() => void) | undefined;
}

/**
 * Bir birim satırı = tek bir kart (masaüstü). Aynı parçalar telefonda ayrı sekmelerde
 * (Fiyat / Barkod / Ölçü) tek tek gösterilir; bu yüzden parçalar ayrı bileşenlerdir.
 */
export function UnitCard({ onRemove, ...part }: UnitCardProps) {
  return (
    <article
      aria-label={`${part.index + 1}. birim`}
      className="relative animate-rise-in rounded-3xl border border-line p-4 focus-within:z-20 tablet:p-5"
    >
      <UnitHeaderFields {...part} onRemove={onRemove} />
      <div className="mt-4">
        <UnitPriceFields {...part} />
      </div>
      {/* Barkod kendi satırında; altında ağırlık, desi ve açıklama yan yana (alanlar rahat sığsın diye) */}
      <div className="mt-4 flex flex-col gap-4">
        <UnitBarcodeField {...part} />
        <UnitMeasureFields {...part} />
      </div>
    </article>
  );
}

/** Birim, çarpan, Ana/Varsayılan işaretleri ve silme. */
export function UnitHeaderFields({
  row,
  index,
  units,
  onChange,
  onRemove,
}: Pick<UnitPartProps, 'row' | 'index' | 'units' | 'onChange'> & {
  onRemove?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1 basis-28 sm:max-w-56">
        <SelectField
          label="Birim"
          options={units.options}
          value={row.unit}
          onChange={(unit) => onChange({ unit })}
          creator={{
            placeholder: 'Yeni birim adı…',
            onCreate: (label) => void units.add(label).then((o) => onChange({ unit: o.value })),
          }}
          onRemove={(value) => {
            units.remove(value);
            if (row.unit === value) onChange({ unit: units.options[0]?.value ?? 'adet' });
          }}
        />
      </div>
      <div className="w-28 sm:w-32">
        <TextField
          label="Çarpan"
          inputMode="decimal"
          value={row.multiplier}
          readOnly={index === 0}
          onChange={(e) => onChange({ multiplier: e.target.value })}
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2 pt-1.5">
        <ToggleChip
          label="Ana Birim"
          checked={row.isMain}
          onChange={(isMain) => onChange({ isMain })}
        />
        <ToggleChip
          label="Varsayılan"
          checked={row.isDefault}
          onChange={(isDefault) => onChange({ isDefault })}
        />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${index + 1}. birimi sil`}
            className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Alış ve Satış blokları (geniş ekranda yan yana, dar ekranda alt alta). */
export function UnitPriceFields({ row, lookups, onChange }: UnitPartProps) {
  const patchBlock = (key: 'purchase' | 'sale') => (patch: Partial<PriceBlockData>) =>
    onChange({ [key]: { ...row[key], ...patch } });
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      <PriceBlock
        title="Alış"
        data={row.purchase}
        lookups={lookups}
        onChange={patchBlock('purchase')}
      />
      <PriceBlock title="Satış" data={row.sale} lookups={lookups} onChange={patchBlock('sale')} />
    </div>
  );
}

/** Barkod türü + barkod + ekleme. */
export function UnitBarcodeField({ row, lookups, onChange }: UnitPartProps) {
  return (
    <BarcodeEditor
      barcodes={row.barcodes}
      types={lookups.barcodeTypes}
      onChange={(barcodes) => onChange({ barcodes })}
    />
  );
}

/** Ağırlık (kg/g), desi ve açıklama; hesaplayıcılar alanın içindeki ikondan açılır. */
export function UnitMeasureFields({ row, onChange }: Pick<UnitPartProps, 'row' | 'onChange'>) {
  // Hangi hesaplayıcı açık: ağırlık / hacim (aynı anda biri).
  const [calc, setCalc] = useState<'weight' | 'volume' | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="relative">
        <TextField
          label="Ağırlık"
          inputMode="decimal"
          value={row.weight}
          onChange={(e) => onChange({ weight: e.target.value })}
          className="pr-32!"
          trailing={
            <div className="flex items-center gap-1">
              <UnitToggle
                value={row.weightUnit}
                onChange={(weightUnit) => onChange({ weightUnit })}
              />
              <CalcButton label="Ağırlık Hesapla" onClick={() => setCalc('weight')} />
            </div>
          }
        />
        {calc === 'weight' ? (
          <MeasureCalculator
            mode="weight"
            onApply={(weight, unit) => onChange(unit ? { weight, weightUnit: unit } : { weight })}
            onClose={() => setCalc(null)}
          />
        ) : null}
      </div>
      <div className="relative">
        <TextField
          label="Hacim"
          inputMode="decimal"
          value={row.volume}
          onChange={(e) => onChange({ volume: e.target.value })}
          className="pr-28!"
          trailing={
            <div className="flex items-center gap-1">
              <span className="px-2 text-sm font-bold text-ink-muted">desi</span>
              <CalcButton label="Desi Hesapla" onClick={() => setCalc('volume')} />
            </div>
          }
        />
        {calc === 'volume' ? (
          <MeasureCalculator
            mode="volume"
            onApply={(volume) => onChange({ volume })}
            onClose={() => setCalc(null)}
          />
        ) : null}
      </div>
      <div>
        <TextField
          label="Birim Açıklama"
          value={row.note}
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

/** Alanın içindeki küçük hesap makinesi düğmesi. */
function CalcButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-full text-brand-ink transition-colors hover:bg-brand-50"
    >
      <Calculator className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Ağırlık biriminin (kg / g) alanın sonunda görünen küçük seçici düğmeleri. */
function UnitToggle({
  value,
  onChange,
}: {
  value: WeightUnit;
  onChange: (unit: WeightUnit) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Ağırlık birimi"
      className="flex rounded-full bg-surface-muted p-0.5"
    >
      {(['kg', 'g'] as const).map((unit) => (
        <button
          key={unit}
          type="button"
          role="radio"
          aria-checked={value === unit}
          onClick={() => onChange(unit)}
          className={[
            'h-8 min-w-8 rounded-full px-2 text-xs font-bold transition-colors',
            value === unit ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted',
          ].join(' ')}
        >
          {unit}
        </button>
      ))}
    </div>
  );
}
