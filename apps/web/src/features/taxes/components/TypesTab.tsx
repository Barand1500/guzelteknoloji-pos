import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import { formatMoney } from '../../home/components/parts';
import type { TaxStore } from '../hooks/useTaxes';
import { calcTax, formatPct, type CalcMode, type TaxType } from '../types';
import { TaxTypeSheet } from './TaxSheets';

/** "+ Oran" etiketi: basınca küçük bir sayı kutusuna dönüşür; Enter ekler, Esc vazgeçer. */
function RateAdder({ type, store, onError }: { type: TaxType; store: TaxStore; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setText('');
  };
  const commit = async () => {
    const n = Number(text.replace(',', '.'));
    if (!text.trim() || !Number.isFinite(n) || n < 0 || n > 100) return onError('Oran 0 ile 100 arasında olmalı.');
    if (type.rates.includes(n)) return onError(`${formatPct(n)} zaten ekli.`);
    try {
      await store.addRate(type.id, n);
      close();
    } catch (e) {
      onError(dataError(e));
    }
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => input.current?.focus(), 0);
        }}
        aria-label={`${type.name} için oran ekle`}
        className="inline-flex h-12 items-center gap-1.5 rounded-2xl border border-dashed border-brand-500/60 px-4 font-bold text-brand-ink transition-colors hover:bg-brand-50"
      >
        <Plus className="size-4" aria-hidden="true" />
        Oran
      </button>
    );
  return (
    <span className="inline-flex h-12 animate-fade-in items-center gap-1 rounded-2xl border border-brand-600 bg-surface pl-3">
      <span className="font-extrabold text-brand-ink">%</span>
      <input
        ref={input}
        inputMode="decimal"
        aria-label={`${type.name} yeni oran`}
        value={text}
        placeholder="8"
        onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          if (e.key === 'Escape') close();
        }}
        className="w-14 bg-transparent text-lg font-extrabold outline-none"
      />
      <button
        type="button"
        onClick={() => void commit()}
        aria-label="Oranı ekle"
        className="flex h-full items-center rounded-r-2xl bg-brand-700 px-3 text-white"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/** "Dene": tutarı yaz, bir oran seç; vergi hariç/dahil sonucu anında söyler. */
function Calculator({ types }: { types: TaxType[] }) {
  const pairs = useMemo(
    () => types.flatMap((t) => t.rates.map((r) => ({ key: `${t.id}|${r}`, short: t.shortName, rate: r }))),
    [types],
  );
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState<CalcMode>('net');
  const [pick, setPick] = useState<string | null>(null);
  if (pairs.length === 0) return null;
  const chosen = pairs.find((p) => p.key === pick) ?? pairs[0]!;
  const r = calcTax(amount, chosen.rate, mode);

  return (
    <section
      aria-label="Vergi hesaplayıcı"
      className="grid gap-4 rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-4 shadow-soft sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-6"
    >
      {/* Soldaki: tutar, tür ve oran seçimi */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <span className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Dene</span>
          <span className="flex items-baseline gap-1.5">
            <input
              inputMode="numeric"
              aria-label="Tutar"
              value={amount.toLocaleString('tr-TR')}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setAmount(Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, 99999999))}
              className="w-36 border-0 border-b-[3px] border-brand-500/50 bg-transparent px-1 text-center text-2xl font-extrabold text-brand-ink outline-none transition-colors hover:border-brand-500 focus:border-brand-700"
            />
            <b className="text-xl text-brand-ink">₺</b>
          </span>
          <span role="radiogroup" aria-label="Tutar türü" className="inline-flex rounded-full bg-surface-muted p-1 text-sm">
            {(
              [
                ['net', 'Vergi hariç'],
                ['gross', 'Vergi dahil'],
              ] as const
            ).map(([v, text]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                onClick={() => setMode(v)}
                className={`min-h-9 whitespace-nowrap rounded-full px-3.5 font-extrabold transition-all ${mode === v ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted'}`}
              >
                {text}
              </button>
            ))}
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Oran">
          {pairs.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={p.key === chosen.key}
              onClick={() => setPick(p.key)}
              className={`min-h-9 rounded-full border px-3.5 text-sm font-bold transition-colors ${p.key === chosen.key ? 'border-brand-600 bg-brand-700 text-white' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500'}`}
            >
              {p.short} {formatPct(p.rate)}
            </button>
          ))}
        </div>
      </div>

      {/* Sağdaki: üç büyük sonuç kutusu (hariç + vergi = dahil); telefonda alt alta */}
      <div
        aria-live="polite"
        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3"
      >
        {(
          [
            ['Vergi hariç', r.net, `bg-surface-raised ${mode === 'net' ? 'ring-2 ring-brand-500/30' : ''}`, 'opacity-70'],
            [`${chosen.short} ${formatPct(chosen.rate)}`, r.vat, 'bg-accent-soft text-brand-800', 'opacity-70'],
            ['Vergi dahil', r.gross, `bg-brand-700 text-white ${mode === 'gross' ? 'ring-2 ring-brand-500/40' : ''}`, 'text-white/80'],
          ] as const
        ).map(([label, value, tone, labelTone], i) => (
          <span key={label} className="contents">
            {i > 0 ? (
              <span aria-hidden="true" className="hidden text-xl font-extrabold text-ink-muted sm:block">
                {i === 1 ? '+' : '='}
              </span>
            ) : null}
            <span
              className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-soft sm:block sm:p-3 ${tone}`}
            >
              <span className={`block text-xs font-bold ${labelTone}`}>{label}</span>
              <span className="block text-lg font-extrabold tabular-nums sm:truncate sm:text-xl">{formatMoney(value)}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

/**
 * Vergiler (Vergi Türleri + Vergiler tek yerde): her vergi türü bir kart; oranlar kartın içinde büyük etiketlerdir
 * (✕ ile silinir, "+ Oran" ile eklenir). Üstteki "Dene" kutusu seçilen oranla vergi hariç/dahil hesaplar.
 */
export function TypesTab({ store }: { store: TaxStore }) {
  const types = store.types ?? [];
  const [sheet, setSheet] = useState<{ type: TaxType | null } | null>(null);
  const [deleting, setDeleting] = useState<TaxType | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Vergi Türü Ekle', () => setSheet({ type: null }));

  return (
    <div className="flex flex-col gap-4">
      {problem ? (
        <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <Calculator types={types} />

      {types.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
          <p className="font-bold">Henüz vergi türü yok</p>
          <button type="button" onClick={() => setSheet({ type: null })} className="font-bold text-brand-ink underline">
            İlk vergi türünü ekle
          </button>
        </div>
      ) : (
        <ul aria-label="Vergi türleri" className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {types.map((t, i) => (
            <li
              key={t.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="animate-rise-in rounded-3xl border border-line bg-surface-raised p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-sm font-extrabold tracking-wide text-white">
                  {t.shortName.slice(0, 4)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-lg leading-tight font-extrabold">{t.name}</span>
                  <span className="text-sm text-ink-muted">{t.rates.length} oran</span>
                </span>
                <button
                  type="button"
                  aria-label={`${t.name} düzenle`}
                  onClick={() => setSheet({ type: t })}
                  className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${t.name} sil`}
                  onClick={() => setDeleting(t)}
                  className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              <ul aria-label={`${t.name} oranları`} className="mt-3 flex flex-wrap items-center gap-2">
                {t.rates.map((r) => (
                  <li
                    key={r}
                    className="group relative flex h-12 min-w-16 items-center justify-center rounded-2xl bg-brand-50 pr-7 pl-4 text-xl font-extrabold text-brand-ink"
                  >
                    {formatPct(r)}
                    <button
                      type="button"
                      aria-label={`${t.shortName} ${formatPct(r)} oranını sil`}
                      onClick={() => void store.removeRate(t.id, r).catch((e: unknown) => setProblem(dataError(e)))}
                      className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-brand-ink/60 transition-colors hover:bg-brand-700 hover:text-white"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                <li>
                  <RateAdder type={t} store={store} onError={setProblem} />
                </li>
              </ul>
            </li>
          ))}
        </ul>
      )}

      {sheet ? (
        <TaxTypeSheet
          type={sheet.type}
          onSave={async (d) => {
            await store.saveType(d, sheet.type?.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Vergi türü ve tüm oranları silinir."
        confirmLabel="Sil"
        onConfirm={() => {
          const t = deleting;
          setDeleting(null);
          if (t) void store.removeType(t.id).catch((e: unknown) => setProblem(dataError(e)));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
