import { ChevronDown, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction, usePublishSaveAction } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useCurrencies, type CurrencyStore } from '../hooks/useCurrencies';
import { useLiveRate } from '../hooks/useLiveRate';
import {
  CATALOG,
  CATALOG_MORE,
  DEFAULT_API,
  RATE_TYPES,
  formatRate,
  type Currency,
  type CurrencyDraft,
  type RateType,
} from '../types';
import { CurrencyForm } from './CurrencyForm';

/**
 * Satırın içinde açılan küçük düzenleyici. "Kaydet" düğmesi yok: bir şey değişince alttaki yüzen adanın "+"
 * düğmesi "Kaydet"e döner. İçinde: ad, kısa ad, kaynak (Merkez Bankası / Elle), kur tipi ya da elle kur, aktif, sil.
 */
function RowEditor({
  currency,
  store,
  onClose,
  onDelete,
}: {
  currency: Currency;
  store: CurrencyStore;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(currency.name);
  const [short, setShort] = useState(currency.shortName);
  const [auto, setAuto] = useState(currency.auto);
  const [type, setType] = useState<RateType>(currency.rateType);
  const initialRate = currency.auto ? '' : String(currency.rate).replace('.', ',');
  const [rateText, setRateText] = useState(initialRate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const base = currency.base;
  const live = useLiveRate(store.preview, !base && auto, short, type);

  const dirty =
    name !== currency.name ||
    short !== currency.shortName ||
    (!base && (auto !== currency.auto || (auto ? type !== currency.rateType : rateText !== initialRate)));

  const save = async () => {
    if (saving) return;
    const manual = Number(rateText.replace(',', '.'));
    if (!name.trim() || short.trim().length < 2) return setError('Ad ve kısa ad gerekli.');
    if (!base && !auto && !(manual > 0)) return setError('Kuru yazın (0’dan büyük).');
    const draft: CurrencyDraft = {
      name: name.trim(),
      shortName: short.trim().toLocaleUpperCase('tr'),
      symbol: currency.symbol,
      rateType: type,
      auto: base ? false : auto,
      rate: base ? 1 : auto ? (live ?? currency.rate) : manual,
      apiUrl: !base && auto ? currency.apiUrl || DEFAULT_API : '',
    };
    setSaving(true);
    setError(null);
    try {
      await store.save(draft, currency.id);
      onClose();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setSaving(false);
    }
  };
  usePublishSaveAction(dirty ? { onSave: () => void save(), saving } : null);

  return (
    <div className="flex flex-col gap-2.5 border-t border-line bg-surface-muted/40 px-4 py-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2.5">
        <TextField label="Adı" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Kısa Adı"
          value={short}
          maxLength={5}
          onChange={(e) => setShort(e.target.value.toUpperCase())}
        />
      </div>

      {base ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div role="radiogroup" aria-label="Kur kaynağı" className="inline-flex rounded-full bg-surface-muted p-1 text-sm">
            {(
              [
                [true, 'Merkez Bankası'],
                [false, 'Elle'],
              ] as const
            ).map(([v, text]) => (
              <button
                key={text}
                type="button"
                role="radio"
                aria-checked={auto === v}
                onClick={() => setAuto(v)}
                className={`min-h-9 rounded-full px-3.5 font-extrabold transition-all ${auto === v ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted'}`}
              >
                {text}
              </button>
            ))}
          </div>
          {auto ? (
            <>
              <div className="min-w-0 flex-1 basis-40">
                <SelectField
                  label="Kur Tipi"
                  options={RATE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={type}
                  onChange={(v) => setType(v as RateType)}
                />
              </div>
              <p aria-live="polite" className="basis-full text-sm text-ink-muted">
                {live === undefined
                  ? 'Kur aranıyor…'
                  : live === null
                    ? 'Bu kod için kur bulunamadı. “Elle” seçin.'
                    : `Şu an: 1 ${short.toUpperCase()} = ₺${formatRate(live)}`}
              </p>
            </>
          ) : (
            <span className="flex items-center gap-2 font-bold">
              1 {short.toUpperCase()} =
              <input
                inputMode="decimal"
                aria-label="Kur (₺)"
                value={rateText}
                placeholder="0,00"
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  setRateText(e.target.value.replace(/[^\d.,]/g, ''));
                  setError(null);
                }}
                className="h-11 w-28 rounded-xl border border-field-border bg-surface px-3 text-right font-extrabold tabular-nums outline-none transition-colors hover:border-brand-500 focus:border-brand-600"
              />
              ₺
            </span>
          )}
        </div>
      )}

      {base ? null : (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-bold">
            Aktif
            <ToggleSwitch
              label={`${currency.name} aktif`}
              checked={currency.active}
              onChange={(v) => void store.setActive(currency.id, v)}
            />
          </span>
          <button
            type="button"
            aria-label={`${currency.name} sil`}
            onClick={onDelete}
            className="ml-auto flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Para Birimleri: kompakt "kur panosu". Her satır bir para birimi (sembol, kod, ad, büyük kur); satıra basınca
 * satır açılıp düzenleyici çıkar (pencere yok). Altta "Tek dokunuşla ekle": hazır sembollere basınca para birimi
 * Merkez Bankası kuruyla, aktif olarak hemen eklenir. Alttaki "+" kendi sembolünü yazarak ekleme penceresini açar.
 */
export function CurrenciesPage() {
  const store = useCurrencies();
  const [open, setOpen] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [deleting, setDeleting] = useState<Currency | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  usePublishAddAction('Para Birimi Ekle', () => setCustom(true));

  if (store.error && !store.items) return <Alert tone="error">{store.error}</Alert>;
  if (!store.items)
    return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const items = store.items;
  const have = new Set(items.map((c) => c.shortName.toUpperCase()));
  const quick = [...CATALOG, ...CATALOG_MORE].filter((c) => !have.has(c.code));

  const run = async (action: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(dataError(e));
    }
  };

  const quickAdd = (c: (typeof CATALOG)[number]) =>
    run(async () => {
      setBusy(c.code);
      try {
        const rate = await store.preview(c.code, 'efektifSatis');
        await store.save({
          name: c.name,
          shortName: c.code,
          symbol: c.symbol,
          rateType: 'efektifSatis',
          auto: true,
          rate: rate ?? 0,
          apiUrl: DEFAULT_API,
        });
      } finally {
        setBusy(null);
      }
    });

  const refreshAll = async () => {
    setRefreshing(true);
    await run(async () => {
      for (const c of items.filter((x) => x.auto)) await store.refresh(c.id);
    });
    setRefreshing(false);
  };

  const active = items.filter((c) => c.active && !c.base).length;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          <b className="text-ink">{active}</b> yabancı para birimi aktif<span className="hidden sm:inline"> · kurlar ₺ cinsinden</span>
        </p>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-field-border px-4 text-sm font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-ink"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Kurları güncelle
        </button>
      </div>

      <ul aria-label="Para birimleri" className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
        {items.map((c, i) => {
          const on = open === c.id;
          return (
            <li
              key={c.id}
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              className={`animate-rise-in ${i > 0 ? 'border-t border-line' : ''} ${c.active ? '' : 'bg-surface-muted/30'}`}
            >
              <button
                type="button"
                aria-expanded={on}
                aria-label={`${c.name} düzenle`}
                onClick={() => setOpen(on ? null : c.id)}
                className="flex min-h-[4.25rem] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-brand-50/50"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full text-xl font-extrabold ${c.active ? 'bg-brand-50 text-brand-ink' : 'bg-surface-muted text-ink-muted'}`}
                >
                  {c.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-extrabold">{c.shortName}</span>
                    {c.active ? null : (
                      <span className="rounded-md bg-surface-muted px-1.5 py-px text-[0.6875rem] font-bold text-ink-muted">
                        Pasif
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-ink-muted">{c.name}</span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-extrabold tabular-nums">
                    {c.base ? 'Ana' : `₺${formatRate(c.rate)}`}
                  </span>
                  <span className="block text-xs font-semibold text-ink-muted">
                    {c.base ? 'para birimi' : c.auto ? RATE_TYPES.find((t) => t.value === c.rateType)?.label : 'Elle'}
                  </span>
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-ink-muted transition-transform duration-300 ${on ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  {on ? (
                    <RowEditor
                      currency={c}
                      store={store}
                      onClose={() => setOpen(null)}
                      onDelete={() => setDeleting(c)}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {quick.length > 0 ? (
        <section aria-label="Tek dokunuşla ekle" className="flex flex-col gap-2">
          <p className="text-sm font-extrabold tracking-wider text-ink-muted uppercase">
            Tek dokunuşla ekle
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {quick.map((c) => (
              <button
                key={c.code}
                type="button"
                disabled={busy !== null}
                onClick={() => void quickAdd(c)}
                aria-label={`${c.name} ekle`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-dashed border-brand-500/60 px-4 font-bold text-brand-ink transition-colors hover:bg-brand-50 disabled:opacity-60"
              >
                {busy === c.code ? (
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                <span className="text-lg">{c.symbol}</span>
                {c.code}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {custom ? (
        <Sheet permission="save" open onClose={() => setCustom(false)} size="lg" title="Para Birimi Ekle">
          <CurrencyForm
            embedded
            currency={null}
            preview={store.preview}
            onSave={async (d) => {
              await store.save(d);
              setCustom(false);
            }}
            onCancel={() => setCustom(false)}
          />
        </Sheet>
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Para birimi silinir; ürün fiyatlarında kullanılıyorsa sunucu silmeyi reddedebilir."
        confirmLabel="Sil"
        onConfirm={() => {
          const c = deleting;
          setDeleting(null);
          if (c) {
            setOpen(null);
            void run(() => store.remove(c.id));
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
