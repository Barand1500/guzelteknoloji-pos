import { Crown, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePublishAddAction } from '../../app-shell/save-action';
import { formatMoney } from '../../home/components/parts';
import type { ShippingStore } from '../hooks/useShipping';
import { priceFor, withVat, type PriceMode } from '../types';
import { CarrierSheet } from './CarriersTab';

/**
 * Karşılaştır: "Bu paket hangi firmayla en ucuz?" Desi ya da kg yazılır, tüm firmalar KDV dahil fiyata göre
 * sıralanır; en ucuzu taç alır, diğerlerinin farkı ve oransal çubuğu görünür. Fiyat girilmemiş firmalar sonda kalır.
 */
export function CompareTab({ store }: { store: ShippingStore }) {
  const carriers = useMemo(() => store.data?.carriers ?? [], [store.data]);
  const [mode, setMode] = useState<PriceMode>('desi');
  const [amount, setAmount] = useState(5);
  const [adding, setAdding] = useState(false);
  usePublishAddAction('Firma Ekle', () => setAdding(true));
  const unit = mode === 'desi' ? 'desi' : 'kg';

  const ranked = useMemo(() => {
    const rows = carriers.map((c) => {
      const net = priceFor(c.prices[mode], amount);
      return { c, net, gross: net === null ? null : withVat(net, c.prices.vat) };
    });
    const priced = rows.filter((r) => r.gross !== null).sort((a, b) => a.gross! - b.gross!);
    return { priced, none: rows.filter((r) => r.gross === null) };
  }, [carriers, mode, amount]);
  const cheapest = ranked.priced[0]?.gross ?? 0;
  const dearest = ranked.priced[ranked.priced.length - 1]?.gross ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Paket"
        className="rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-5 shadow-soft sm:p-6"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-3 text-lg font-semibold">
          <span>Paketim</span>
          <input
            inputMode="numeric"
            aria-label="Paket miktarı"
            value={amount}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setAmount(Math.min(Number(e.target.value.replace(/\D/g, '')) || 0, 9999))}
            className="w-24 border-0 border-b-[3px] border-brand-500/50 bg-transparent px-1 text-center text-3xl font-extrabold text-brand-ink outline-none transition-colors hover:border-brand-500 focus:border-brand-700 sm:text-4xl"
          />
          <span
            role="radiogroup"
            aria-label="Birim"
            className="inline-flex self-center rounded-full bg-surface-muted p-1 text-sm"
          >
            {(
              [
                ['desi', 'desi'],
                ['weight', 'kg'],
              ] as const
            ).map(([k, text]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={mode === k}
                onClick={() => setMode(k)}
                className={`min-h-9 rounded-full px-4 font-extrabold transition-all ${mode === k ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted'}`}
              >
                {text}
              </button>
            ))}
          </span>
          <span>olursa en ucuzu hangisi?</span>
        </div>
      </section>

      {carriers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
          <Scale className="size-8 text-brand-600/60" aria-hidden="true" />
          <p className="font-bold">Karşılaştıracak firma yok</p>
        </div>
      ) : (
        <ol aria-label="Firma sıralaması" className="flex flex-col gap-2.5">
          {ranked.priced.map(({ c, gross, net }, i) => (
            <li
              key={c.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className={`animate-rise-in rounded-3xl border bg-surface-raised p-4 ${i === 0 ? 'border-success/40 ring-2 ring-success/10' : 'border-line'}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${i === 0 ? 'bg-success-soft text-success' : 'bg-surface-muted text-ink-muted'}`}
                >
                  {i === 0 ? <Crown className="size-5" aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-extrabold">{c.name}</span>
                    {i === 0 ? (
                      <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-extrabold text-success">
                        En ucuz
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-ink-muted">
                    KDV hariç {formatMoney(net ?? 0)} · %{c.prices.vat}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xl font-extrabold tabular-nums">{formatMoney(gross ?? 0)}</span>
                  {i > 0 ? (
                    <span className="text-xs font-bold text-danger">
                      +{formatMoney((gross ?? 0) - cheapest)}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${i === 0 ? 'bg-success' : 'bg-brand-500/70'}`}
                  style={{ width: `${Math.max(8, ((gross ?? 0) / dearest) * 100)}%` }}
                />
              </div>
            </li>
          ))}
          {ranked.none.map(({ c }) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-3xl border border-dashed border-line-strong/50 p-4 text-ink-muted"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted">—</span>
              <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
              <span className="text-sm">{amount} {unit} için fiyat yok</span>
            </li>
          ))}
        </ol>
      )}

      {adding ? (
        <CarrierSheet
          carrier={null}
          onSave={async (d) => {
            await store.saveCarrier(d);
            setAdding(false);
          }}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </div>
  );
}
