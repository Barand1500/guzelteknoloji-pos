import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { formatMoney } from '../../home/components/parts';
import {
  VAT_OPTIONS,
  fromOf,
  normalizeTiers,
  priceFor,
  withVat,
  type Carrier,
  type PriceMode,
  type PriceTable,
  type Tier,
} from '../types';

const UNIT: Record<PriceMode, string> = { desi: 'desi', weight: 'kg' };

/** Küçük sayı kutusu: yazarken serbest, geçerli sayıysa hemen bildirir, çıkınca biçimler. */
function NumBox({
  value,
  onChange,
  label,
  decimal = false,
  className = '',
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  decimal?: boolean;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(value).replace('.', ',');
  return (
    <input
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={label}
      value={shown}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(decimal ? /[^\d,]/g : /\D/g, '');
        setText(raw);
        const n = Number(raw.replace(',', '.'));
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(null)}
      className={`h-11 min-w-0 rounded-xl border border-field-border bg-surface px-3 text-right font-bold tabular-nums transition-colors outline-none hover:border-brand-500 focus:border-brand-600 ${className}`}
    />
  );
}

/**
 * Firma fiyatları. Referanstaki 6 sütunlu tablo sadeleşti: başlangıç değeri hep otomatiktir (öncekinin
 * bitişi + 1), KDV tek seçimdir, "kat sayı" son satırdaki "ek desi başına" anahtarıdır. Altta "Dene" kutusu
 * girilen desi/kg için ücreti hesaplar.
 */
export function PriceSheet({
  carrier,
  onSave,
  onClose,
}: {
  carrier: Carrier;
  onSave: (prices: PriceTable) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<PriceMode>('desi');
  const [table, setTable] = useState<PriceTable>(() => JSON.parse(JSON.stringify(carrier.prices)));
  const [tryValue, setTryValue] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tiers = table[mode];
  const unit = UNIT[mode];

  const setTiers = (next: Tier[]) => setTable((t) => ({ ...t, [mode]: normalizeTiers(next) }));
  const edit = (i: number, patch: Partial<Tier>) =>
    setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const add = () => {
    const last = tiers[tiers.length - 1]!;
    const prev = tiers[tiers.length - 2];
    const start = fromOf(tiers, tiers.length - 1);
    setTiers([
      ...tiers.slice(0, -1),
      { to: start + 4, price: prev ? prev.price : last.price, perUnit: false },
      last,
    ]);
  };
  const remove = (i: number) => setTiers(tiers.filter((_, j) => j !== i));

  const result = priceFor(tiers, tryValue);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(table);
    } catch (e) {
      setError(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="lg" title={`${carrier.name} · Fiyatlar`}>
      <div className="flex flex-col gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_9rem]">
          <Segmented
            label="Fiyat tipi"
            value={mode}
            options={[
              { value: 'desi', label: 'Desiye Göre' },
              { value: 'weight', label: 'Ağırlığa Göre (kg)' },
            ]}
            onChange={(v) => setMode(v as PriceMode)}
          />
          <SelectField
            label="KDV"
            options={VAT_OPTIONS.map((v) => ({ value: String(v), label: `%${v}` }))}
            value={String(table.vat)}
            onChange={(v) => setTable((t) => ({ ...t, vat: Number(v) }))}
          />
        </div>

        <ul aria-label="Fiyat basamakları" className="flex flex-col gap-2">
          {tiers.map((t, i) => {
            const open = t.to === null;
            const from = fromOf(tiers, i);
            return (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-line bg-surface p-2.5 sm:gap-x-3 sm:p-3"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                  <span className="w-7 shrink-0 text-right tabular-nums text-ink-muted">{from}</span>
                  {open ? (
                    <span className="truncate">{unit} ve üzeri</span>
                  ) : (
                    <>
                      <span className="text-ink-muted">–</span>
                      <NumBox
                        label={`${i + 1}. basamak bitişi`}
                        value={t.to ?? from}
                        onChange={(n) => edit(i, { to: n })}
                        className="w-16 sm:w-20"
                      />
                      <span className="hidden sm:inline">{unit}</span>
                    </>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <NumBox
                    label={`${i + 1}. basamak fiyatı`}
                    value={t.price}
                    onChange={(n) => edit(i, { price: n })}
                    decimal
                    className="w-24 sm:w-28"
                  />
                  <span className="font-bold text-ink-muted">₺</span>
                </span>
                <span className="hidden w-24 text-xs text-ink-muted sm:block">
                  KDV dahil
                  <br />
                  <b className="text-sm text-ink">{formatMoney(withVat(t.price, table.vat))}</b>
                </span>
                <span
                  className={`flex items-center gap-1 sm:ml-auto ${open ? 'max-sm:order-last max-sm:basis-full max-sm:justify-end' : ''}`}
                >
                  {open ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-ink-muted">
                      Her ek {unit} için
                      <ToggleSwitch
                        label={`Her ek ${unit} için bu fiyat`}
                        checked={t.perUnit}
                        onChange={(v) => edit(i, { perUnit: v })}
                      />
                    </span>
                  ) : null}
                  {tiers.length > 1 && !open ? (
                    <button
                      type="button"
                      aria-label={`${i + 1}. basamağı sil`}
                      onClick={() => remove(i)}
                      className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-dashed border-brand-500/60 px-4 font-bold text-brand-ink hover:bg-brand-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          Basamak ekle
        </button>

        {/* Dene */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-brand-50 px-4 py-3">
          <span className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Dene</span>
          <NumBox
            label={`Denenecek ${unit}`}
            value={tryValue}
            onChange={setTryValue}
            className="w-20"
          />
          <span className="font-semibold">{unit} →</span>
          <span aria-live="polite" className="font-bold">
            {result === null ? (
              '—'
            ) : (
              <>
                {formatMoney(result)}{' '}
                <span className="font-semibold text-ink-muted">
                  (KDV dahil {formatMoney(withVat(result, table.vat))})
                </span>
              </>
            )}
          </span>
        </div>

        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
          <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void submit()}>
            Kaydet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
