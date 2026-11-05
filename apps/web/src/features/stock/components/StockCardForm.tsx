import { ArrowLeft, CheckCircle2, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { Switch } from '../../../components/ui/Switch';
import { TextField } from '../../../components/ui/TextField';
import { stockService } from '../services/stock.service';
import { emptyDraft, validateRequired } from '../stock.rules';
import type { StockCardDraft, StockLookups } from '../types';
import { Stepper } from './Stepper';

const STEPS = ['Temel Bilgi', 'Fiyat', 'Barkod ve Ölçü', 'Özet'] as const;

/** Her adımda doğrulanacak alanlar (zorunluluk listesi stock.rules.ts içindedir). */
const STEP_FIELDS: readonly (readonly (keyof StockCardDraft)[])[] = [
  [
    'stockType',
    'code',
    'name',
    'vatDepartment',
    'brand',
    'stockKind',
    'inventoryTracking',
    'lowerLimit',
    'upperLimit',
    'gtip',
    'origin',
  ],
  [
    'priceList',
    'unit',
    'multiplier',
    'purchasePrice',
    'salePrice',
    'currency',
    'discount',
    'vatRate',
  ],
  ['barcode', 'weight', 'volume', 'unitNote'],
  [],
];

const label = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label || '—';

/**
 * Stok kartı sihirbazı: az alanla başlar, adım adım ilerler. Gelişmiş alanlar katlıdır.
 * Veri yalnızca stockService üzerinden gelir/gider (şimdilik sahte).
 */
export function StockCardForm() {
  const [lookups, setLookups] = useState<StockLookups | null>(null);
  const [draft, setDraft] = useState<StockCardDraft>(emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof StockCardDraft, string>>>({});
  const [step, setStep] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void stockService.getLookups().then((data) => active && setLookups(data));
    return () => {
      active = false;
    };
  }, []);

  if (!lookups) {
    return (
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-muted" aria-busy="true" />
    );
  }

  // Alan bağlama yardımcıları: değeri yazar, o alanın hatasını temizler.
  const set = <K extends keyof StockCardDraft>(key: K, value: StockCardDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const text = (key: keyof StockCardDraft & string, fieldLabel: string, extra = {}) => (
    <TextField
      label={fieldLabel}
      value={draft[key] as string}
      error={errors[key]}
      onChange={(e) => set(key, e.target.value as never)}
      {...extra}
    />
  );
  const select = (
    key: keyof StockCardDraft & string,
    fieldLabel: string,
    options: { value: string; label: string }[],
  ) => (
    <SelectField
      label={fieldLabel}
      options={options}
      value={draft[key] as string}
      onChange={(e) => set(key, e.target.value as never)}
    />
  );

  const next = () => {
    const all = validateRequired(draft);
    const own = Object.fromEntries(
      Object.entries(all).filter(([k]) => STEP_FIELDS[step]?.includes(k as keyof StockCardDraft)),
    );
    setErrors(own);
    if (Object.keys(own).length === 0) setStep((s) => s + 1);
  };

  const save = async () => {
    setSaving(true);
    await stockService.save(draft);
    setSaving(false);
    setSaved(true);
  };

  const startOver = () => {
    setDraft(emptyDraft);
    setStep(0);
    setSaved(false);
  };

  if (saved) {
    return (
      <div className="flex animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-16 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <p className="text-2xl font-extrabold">Stok kartı kaydedildi!</p>
        <p className="text-ink-muted">{draft.name || draft.code || 'Yeni ürün'}</p>
        <Button fullWidth={false} onClick={startOver} className="mt-2">
          Yeni Stok Kartı
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Stepper steps={STEPS} current={step} />

      {/* key: adım değişince içerik yumuşakça yeniden belirir */}
      <section
        key={step}
        aria-label={STEPS[step]}
        className="animate-rise-in rounded-[1.75rem] bg-surface-raised p-5 shadow-soft tablet:p-8"
      >
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {select('stockType', 'Stok Tipi', lookups.stockTypes)}
            {text('code', 'Stok Kodu')}
            <div className="md:col-span-2">{text('name', 'Stok Adı')}</div>
            {select('vatDepartment', 'KDV Departmanı', lookups.vatDepartments)}
            {select('brand', 'Marka', lookups.brands)}

            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink md:col-span-2"
            >
              Daha Fazla Alan
              <ChevronDown
                className={`size-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {moreOpen ? (
              <>
                {select('stockKind', 'Stok Nevi', lookups.stockKinds)}
                {select('inventoryTracking', 'Envanter Takibi', lookups.inventoryTracking)}
                {text('lowerLimit', 'Alt Limit', { inputMode: 'decimal' })}
                {text('upperLimit', 'Üst Limit', { inputMode: 'decimal' })}
                {text('gtip', 'GTIP Kodu')}
                {text('origin', 'Menşei')}
              </>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Segmented
                label="Fiyat Listesi"
                value={draft.priceList}
                options={lookups.priceLists}
                onChange={(v) => set('priceList', v)}
              />
            </div>
            {select('unit', 'Birim', lookups.units)}
            {text('multiplier', 'Çarpan', { inputMode: 'decimal' })}
            {text('purchasePrice', 'Alış Fiyatı', { inputMode: 'decimal' })}
            {text('salePrice', 'Satış Fiyatı', { inputMode: 'decimal' })}
            {select('currency', 'Para Birimi', lookups.currencies)}
            {text('discount', 'İskonto (%)', { inputMode: 'decimal' })}
            {select('vatRate', 'KDV Oranı', lookups.vatRates)}
            <Segmented
              label="KDV Durumu"
              value={draft.vatIncluded ? 'dahil' : 'haric'}
              options={[
                { value: 'haric', label: 'KDV Hariç' },
                { value: 'dahil', label: 'KDV Dahil' },
              ]}
              onChange={(v) => set('vatIncluded', v === 'dahil')}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              {text('barcode', 'Barkod', { inputMode: 'numeric' })}
            </div>
            {text('weight', 'Ağırlık (kg)', { inputMode: 'decimal' })}
            {text('volume', 'Hacim (desi)', { inputMode: 'decimal' })}
            <div className="md:col-span-2">{text('unitNote', 'Birim Açıklama')}</div>
            <Switch
              label="Ana Birim"
              checked={draft.isMainUnit}
              onChange={(v) => set('isMainUnit', v)}
            />
            <Switch
              label="Varsayılan Birim"
              checked={draft.isDefaultUnit}
              onChange={(v) => set('isDefaultUnit', v)}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {[
              ['Stok Kodu', draft.code || '—'],
              ['Stok Adı', draft.name || '—'],
              ['Marka', label(lookups.brands, draft.brand)],
              ['KDV Departmanı', label(lookups.vatDepartments, draft.vatDepartment)],
              ['Birim', `${label(lookups.units, draft.unit)} × ${draft.multiplier || '1'}`],
              [
                'Alış Fiyatı',
                draft.purchasePrice ? `${draft.purchasePrice} ${draft.currency}` : '—',
              ],
              ['Satış Fiyatı', draft.salePrice ? `${draft.salePrice} ${draft.currency}` : '—'],
              [
                'KDV',
                `${label(lookups.vatRates, draft.vatRate)} · ${draft.vatIncluded ? 'Dahil' : 'Hariç'}`,
              ],
              ['Barkod', draft.barcode || '—'],
            ].map(([term, value]) => (
              <div key={term} className="border-b border-line pb-3">
                <dt className="text-sm text-ink-muted">{term}</dt>
                <dd className="mt-0.5 text-base font-semibold break-words">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            fullWidth={false}
            flow={false}
            onClick={() => setStep((s) => s - 1)}
            leadingIcon={<ArrowLeft className="size-5" aria-hidden="true" />}
          >
            Geri
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button fullWidth={false} onClick={next} className="min-w-40">
            Devam Et
          </Button>
        ) : (
          <Button
            fullWidth={false}
            onClick={save}
            loading={saving}
            loadingLabel="Kaydediliyor…"
            className="min-w-40"
          >
            Kaydet
          </Button>
        )}
      </div>
    </div>
  );
}
