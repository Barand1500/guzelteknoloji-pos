import { useState } from 'react';
import { formatMoney } from '../../home/components/parts';
import type { PaymentMethod } from '../types';
import { MethodIcon } from './MethodIcon';

const SUBTOTAL = 1000;
const SHIPPING = 90;

/**
 * "Müşteri böyle görür": ödeme ekranının canlı önizlemesi. Yalnızca aktif şekiller, listedeki sırayla görünür;
 * ilk varsayılan şekil önceden seçilidir. Bir şekle basınca altta toplam değişir: kargo hesaplanmasın açıksa
 * kargo ₺0 olur (örnek sepet: ₺1.000 + kargo ₺90).
 */
export function PaymentPreview({ items }: { items: PaymentMethod[] }) {
  const active = items.filter((m) => m.active);
  const first = active.find((m) => m.isDefault) ?? active[0] ?? null;
  const [picked, setPicked] = useState<string | null>(null);
  const current = active.find((m) => m.id === picked) ?? first;
  const shipping = current?.noShipping ? 0 : SHIPPING;

  return (
    <section
      aria-label="Ödeme ekranı önizlemesi"
      className="rounded-[2rem] border border-line bg-gradient-to-b from-brand-50 to-surface-raised p-4 shadow-soft"
    >
      <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Müşteri böyle görür</p>
      <p className="mt-0.5 text-lg font-extrabold">Ödeme şekli</p>
      {active.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface px-4 py-6 text-center text-sm text-ink-muted">
          Aktif ödeme şekli yok.
        </p>
      ) : (
        <ul role="radiogroup" aria-label="Önizleme ödeme şekilleri" className="mt-3 flex flex-col gap-2">
          {active.map((m) => {
            const on = current?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPicked(m.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-all ${on ? 'border-brand-600 shadow-soft ring-2 ring-brand-500/15' : 'border-line hover:border-brand-500/50'}`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted'}`}>
                    <MethodIcon method={m} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{m.name}</span>
                    {m.allowAdjust || m.priceList ? (
                      <span className="block truncate text-xs text-ink-muted">
                        {[m.priceList ? `${m.priceList} fiyatı` : '', m.allowAdjust ? 'indirim/ek ücret' : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`size-5 shrink-0 rounded-full border-2 transition-colors ${on ? 'border-brand-700 bg-brand-700 shadow-[inset_0_0_0_3px_white]' : 'border-line-strong/60'}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-4 flex flex-col gap-1 border-t border-dashed border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Ürünler</dt>
          <dd className="font-bold tabular-nums">{formatMoney(SUBTOTAL)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Kargo</dt>
          <dd className={`font-bold tabular-nums ${shipping === 0 ? 'text-success' : ''}`}>
            {shipping === 0 ? 'Yok' : formatMoney(shipping)}
          </dd>
        </div>
        <div className="flex justify-between text-base">
          <dt className="font-extrabold">Toplam</dt>
          <dd className="font-extrabold tabular-nums" aria-live="polite">
            {formatMoney(SUBTOTAL + shipping)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
