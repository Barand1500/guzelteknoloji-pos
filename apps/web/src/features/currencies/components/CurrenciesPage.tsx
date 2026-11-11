import { Landmark, Pencil, PenLine, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useCurrencies } from '../hooks/useCurrencies';
import { RATE_TYPES, formatRate, type Currency } from '../types';
import { CurrencyForm } from './CurrencyForm';

/**
 * Para Birimleri: her para birimi bir kart (sembol, ad, "1 USD = ₺50,30", kaynak). Ekleme ve düzenleme pencere
 * açmadan listenin içinde olur: alttaki "+" en üstte hızlı formu açar, kalem kartın yerinde formu açar.
 */
export function CurrenciesPage() {
  const store = useCurrencies();
  const [editing, setEditing] = useState<string | null>(null); // 'new' | kimlik
  const [deleting, setDeleting] = useState<Currency | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [spinning, setSpinning] = useState<string | null>(null);
  usePublishAddAction('Para Birimi Ekle', () => setEditing('new'));

  if (store.error && !store.items) return <Alert tone="error">{store.error}</Alert>;
  if (!store.items)
    return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const run = async (action: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(dataError(e));
    }
  };

  const form = (c: Currency | null) => (
    <CurrencyForm
      key={c?.id ?? 'new'}
      currency={c}
      preview={store.preview}
      onSave={async (d) => {
        await store.save(d, c?.id);
        setEditing(null);
      }}
      onCancel={() => setEditing(null)}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-3 pb-24">
      {store.sample ? <SampleNote /> : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      {editing === 'new' ? form(null) : null}

      <ul aria-label="Para birimleri" className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {store.items.map((c, i) =>
          editing === c.id ? (
            <li key={c.id}>{form(c)}</li>
          ) : (
            // Çift tık kısayoldur; kalem düğmesi aynı işi klavyeyle yapar.
             
            <li
              key={c.id}
              onDoubleClick={() => setEditing(c.id)}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className={`animate-rise-in rounded-3xl border border-line bg-surface-raised p-4 transition-colors hover:border-brand-500/40 ${c.active ? '' : 'opacity-70'}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-3xl font-extrabold text-brand-ink">
                  {c.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-lg font-extrabold">{c.name}</span>
                    <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-px text-[0.6875rem] font-bold text-brand-ink">
                      {c.shortName}
                    </span>
                  </span>
                  <span className="block text-sm">
                    {c.base ? (
                      <span className="text-ink-muted">Ana para birimi</span>
                    ) : (
                      <>
                        <b>
                          1 {c.shortName} = ₺{formatRate(c.rate)}
                        </b>
                        <span className="text-ink-muted">
                          {' '}
                          ·{' '}
                          {c.auto
                            ? `Merkez Bankası · ${RATE_TYPES.find((t) => t.value === c.rateType)?.label}`
                            : 'Elle girilen'}
                        </span>
                      </>
                    )}
                  </span>
                </span>
                {c.base ? null : (
                  <ToggleSwitch
                    label={`${c.name} aktif`}
                    checked={c.active}
                    onChange={(v) => void run(() => store.setActive(c.id, v))}
                  />
                )}
              </div>
              <div className="mt-2 flex items-center justify-end gap-1">
                {c.auto ? (
                  <span className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                    <Landmark className="size-3.5" aria-hidden="true" />
                    Otomatik
                  </span>
                ) : !c.base ? (
                  <span className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-ink-muted">
                    <PenLine className="size-3.5" aria-hidden="true" />
                    Elle
                  </span>
                ) : null}
                {c.auto ? (
                  <button
                    type="button"
                    aria-label={`${c.name} kurunu şimdi güncelle`}
                    title="Kuru şimdi güncelle"
                    onClick={() => {
                      setSpinning(c.id);
                      void run(() => store.refresh(c.id)).finally(() => setSpinning(null));
                    }}
                    className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                  >
                    <RefreshCw
                      className={`size-4 ${spinning === c.id ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`${c.name} düzenle`}
                  onClick={() => setEditing(c.id)}
                  className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                {c.base ? null : (
                  <button
                    type="button"
                    aria-label={`${c.name} sil`}
                    onClick={() => setDeleting(c)}
                    className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ),
        )}
      </ul>

      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Para birimi silinir; ürün fiyatlarında kullanılıyorsa sunucu silmeyi reddedebilir."
        confirmLabel="Sil"
        onConfirm={() => {
          const c = deleting;
          setDeleting(null);
          if (c) void run(() => store.remove(c.id));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
