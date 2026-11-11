import { ChevronDown, Landmark, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { useLiveRate } from '../hooks/useLiveRate';
import {
  CATALOG,
  DEFAULT_API,
  RATE_TYPES,
  emptyCurrencyDraft,
  formatRate,
  type Currency,
  type CurrencyDraft,
  type RateType,
} from '../types';

/**
 * Hızlı para birimi formu (pencere açmaz; listenin içinde açılır). Sembol önce sorulur: kutuya yazılır ya da
 * yandaki hazır sembollerden biri seçilir; hazır sembol seçilince ad ve kısa ad kendiliğinden dolar (sonra
 * değiştirilebilir). Kur kaynağı varsayılan olarak Merkez Bankası'dır (kur tipi seçilir, canlı önizleme çıkar,
 * elle giriş kapalı); "Elle" seçilirse kur yazılır. Yeni kayıt her zaman aktif başlar.
 */
export function CurrencyForm({
  currency,
  preview,
  onSave,
  onCancel,
  embedded = false,
}: {
  currency: Currency | null;
  /** true: bir pencerenin içinde (kendi çerçevesi ve başlığı yok). */
  embedded?: boolean;
  preview: (code: string, type: RateType) => Promise<number | null>;
  onSave: (draft: CurrencyDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CurrencyDraft>(
    currency
      ? {
          name: currency.name,
          shortName: currency.shortName,
          symbol: currency.symbol,
          rateType: currency.rateType,
          auto: currency.auto,
          rate: currency.rate,
          apiUrl: currency.apiUrl || DEFAULT_API,
        }
      : emptyCurrencyDraft(),
  );
  const [rateText, setRateText] = useState(currency && !currency.auto ? String(currency.rate).replace('.', ',') : '');
  const [touched, setTouched] = useState({ name: !!currency, short: !!currency });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const base = currency?.base ?? false;

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  const liveRate = useLiveRate(preview, !base && draft.auto, draft.shortName, draft.rateType);

  const set = <K extends keyof CurrencyDraft>(k: K, v: CurrencyDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors({});
  };

  const setSymbol = (symbol: string) => {
    const hit = CATALOG.find((c) => c.symbol === symbol);
    setDraft((d) => ({
      ...d,
      symbol,
      name: hit && !touched.name ? hit.name : d.name,
      shortName: hit && !touched.short ? hit.code : d.shortName,
    }));
    setErrors({});
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!draft.symbol.trim()) next.symbol = 'Sembol gerekli.';
    if (!draft.name.trim()) next.name = 'Ad gerekli.';
    if (draft.shortName.trim().length < 2) next.shortName = 'Kısa ad gerekli (ör. USD).';
    const manual = Number(rateText.replace(',', '.'));
    if (!base && !draft.auto && !(manual > 0)) next.rate = 'Kuru yazın (0’dan büyük).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave({
        ...draft,
        symbol: draft.symbol.trim(),
        name: draft.name.trim(),
        shortName: draft.shortName.trim().toLocaleUpperCase('tr'),
        rate: base ? 1 : draft.auto ? (liveRate ?? currency?.rate ?? 0) : manual,
        apiUrl: draft.auto ? draft.apiUrl.trim() || DEFAULT_API : '',
      });
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  const short = draft.shortName.trim().toUpperCase() || 'XXX';

  return (
    <section
      aria-label={currency ? 'Para birimini düzenle' : 'Yeni para birimi'}
      className={embedded ? '' : 'animate-rise-in rounded-3xl border border-brand-500/40 bg-surface-raised p-4 shadow-soft ring-2 ring-brand-500/10 sm:p-5'}
    >
      {embedded ? null : (
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">
          {currency ? 'Para Birimini Düzenle' : 'Yeni Para Birimi'}
        </h2>
      )}
      {problem ? (
        <p role="alert" className="mb-3 text-danger">
          {problem}
        </p>
      ) : null}

      {/* Sembol: yazılır ya da hazırdan seçilir */}
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-surface p-2 transition-colors focus-within:border-brand-600 ${errors.symbol ? 'border-danger' : 'border-field-border'}`}
      >
        <input
          ref={firstField}
          aria-label="Sembol"
          value={draft.symbol}
          maxLength={4}
          placeholder="₺"
          onChange={(e) => setSymbol(e.target.value)}
          className="h-14 w-20 shrink-0 rounded-xl bg-brand-50 text-center text-3xl font-extrabold text-brand-ink outline-none placeholder:text-brand-ink/30"
        />
        <div
          role="group"
          aria-label="Hazır semboller"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]"
        >
          {CATALOG.map((c) => (
            <button
              key={c.symbol}
              type="button"
              title={c.name}
              aria-label={`${c.name} (${c.symbol})`}
              aria-pressed={draft.symbol === c.symbol}
              onClick={() => setSymbol(c.symbol)}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border text-xl font-bold transition-all ${draft.symbol === c.symbol ? 'border-brand-600 bg-brand-700 text-white shadow-soft' : 'border-field-border text-ink-muted hover:border-brand-500 hover:text-ink'}`}
            >
              {c.symbol}
            </button>
          ))}
        </div>
      </div>
      {errors.symbol ? (
        <p role="alert" className="mt-1 px-2 text-sm text-danger">
          {errors.symbol}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <TextField
          label="Adı"
          value={draft.name}
          error={errors.name}
          maxLength={60}
          onChange={(e) => {
            setTouched((t) => ({ ...t, name: true }));
            set('name', e.target.value);
          }}
        />
        <TextField
          label="Kısa Adı"
          value={draft.shortName}
          error={errors.shortName}
          maxLength={5}
          onChange={(e) => {
            setTouched((t) => ({ ...t, short: true }));
            set('shortName', e.target.value.toUpperCase());
          }}
        />
      </div>

      {base ? (
        <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          Ana para birimi: kuru her zaman 1’dir, silinemez.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div role="radiogroup" aria-label="Kur kaynağı" className="grid grid-cols-2 gap-2">
            {(
              [
                [true, Landmark, 'Merkez Bankası', 'Otomatik kur'],
                [false, PenLine, 'Elle', 'Kuru ben yazarım'],
              ] as const
            ).map(([auto, Icon, title, hint]) => (
              <button
                key={title}
                type="button"
                role="radio"
                aria-checked={draft.auto === auto}
                onClick={() => set('auto', auto)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${draft.auto === auto ? 'border-brand-600 bg-brand-50 text-brand-ink shadow-soft' : 'border-field-border text-ink-muted hover:border-brand-500'}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-extrabold">{title}</span>
                  <span className="block truncate text-xs">{hint}</span>
                </span>
              </button>
            ))}
          </div>

          {draft.auto ? (
            <div className="flex animate-fade-in flex-col gap-3">
              <div className="grid items-center gap-3 sm:grid-cols-2">
                <SelectField
                  label="Kur Tipi"
                  options={RATE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={draft.rateType}
                  onChange={(v) => set('rateType', v as RateType)}
                />
                <p
                  aria-live="polite"
                  className="rounded-2xl bg-surface-muted px-4 py-3 text-center font-bold"
                >
                  {liveRate === undefined ? (
                    <span className="text-ink-muted">Kur aranıyor…</span>
                  ) : liveRate === null ? (
                    <span className="text-ink-muted">Bu kod için kur bulunamadı · “Elle” seçin</span>
                  ) : (
                    <>
                      1 {short} = <span className="text-lg text-brand-ink">₺{formatRate(liveRate)}</span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                aria-expanded={advanced}
                className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-full px-1 text-sm font-semibold text-brand-ink"
              >
                Gelişmiş
                <ChevronDown
                  className={`size-4 transition-transform ${advanced ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {advanced ? (
                <TextField
                  label="Api Url"
                  value={draft.apiUrl}
                  maxLength={200}
                  onChange={(e) => set('apiUrl', e.target.value)}
                />
              ) : null}
            </div>
          ) : (
            <div className="flex animate-fade-in items-center gap-3">
              <span className="font-bold">1 {short} =</span>
              <div className="w-44">
                <TextField
                  label="Kur (₺)"
                  value={rateText}
                  error={errors.rate}
                  inputMode="decimal"
                  onChange={(e) => {
                    setRateText(e.target.value.replace(/[^\d.,]/g, ''));
                    setErrors({});
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3 border-t border-line pt-4 sm:justify-end">
        <Button variant="outline" flow={false} onClick={onCancel}>
          Vazgeç
        </Button>
        <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void submit()}>
          Kaydet
        </Button>
      </div>
    </section>
  );
}
