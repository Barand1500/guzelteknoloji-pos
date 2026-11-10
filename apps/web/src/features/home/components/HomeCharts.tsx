import { useEffect, useState } from 'react';
import type { HomeData, PaymentMethod, RevenuePoint } from '../types';
import { CountUp, formatMoney, formatMoneyShort } from './parts';

/** Anahtar değişince (ve ilk açılışta) kısa süre sonra true olur: çubuk/halka büyüyerek gelsin diye. */
function useGrown(key: unknown) {
  const id = String(key);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(id), 30);
    return () => window.clearTimeout(timer);
  }, [id]);
  return done === id;
}

const SERIES = [
  { id: 'sales', label: 'Satış', bar: 'bg-brand-600', dot: 'bg-brand-600' },
  { id: 'cost', label: 'Maliyet', bar: 'bg-danger/80', dot: 'bg-danger' },
  { id: 'profit', label: 'Kâr', bar: 'bg-success', dot: 'bg-success' },
] as const;

/**
 * Gelir raporu: her etiket için üç çubuk (satış, maliyet, kâr). Çubuklar aşağıdan büyür;
 * üzerine gelince/odaklanınca tutarlar yazılır. Dar ekranda yatay kayar.
 */
export function RevenueChart({ points, version }: { points: RevenuePoint[]; version: string }) {
  const grown = useGrown(version);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const rows = points.map((p) => ({ ...p, profit: p.sales - p.cost }));
  const top = Math.max(1, ...rows.map((r) => Math.max(r.sales, r.cost, r.profit)));
  const shown = SERIES.filter((s) => !hidden.has(s.id));
  const info = active !== null ? rows[active] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Seriler" className="flex flex-wrap gap-2">
          {SERIES.map((s) => {
            const off = hidden.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={!off}
                onClick={() =>
                  setHidden((cur) => {
                    const next = new Set(cur);
                    if (next.has(s.id)) next.delete(s.id);
                    else if (next.size < SERIES.length - 1) next.add(s.id);
                    return next;
                  })
                }
                className={[
                  'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors',
                  off ? 'border-line text-ink-muted line-through' : 'border-field-border text-ink',
                ].join(' ')}
              >
                <span className={`size-2.5 rounded-full ${s.dot} ${off ? 'opacity-30' : ''}`} />
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="min-h-5 text-sm font-semibold text-ink-muted" aria-live="polite">
          {info ? (
            <>
              <b className="text-ink">{info.label}</b> · Satış {formatMoneyShort(info.sales)} · Kâr{' '}
              {formatMoneyShort(info.profit)}
            </>
          ) : (
            'Çubuğun üzerine gelin'
          )}
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <ul
          aria-label="Gelir grafiği"
          className="flex h-56 min-w-full items-end gap-2 border-b border-line pt-2"
          style={{ minWidth: `${rows.length * 3.6}rem` }}
        >
          {rows.map((r, i) => (
            <li key={r.label} className="h-full min-w-0 flex-1">
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${r.label}: satış ${formatMoney(r.sales)}, maliyet ${formatMoney(r.cost)}, kâr ${formatMoney(r.profit)}`}
                className={[
                  'group flex h-full w-full min-w-0 flex-col justify-end gap-1.5 rounded-xl px-1 transition-colors',
                  active === i ? 'bg-brand-50' : 'hover:bg-surface-muted/60',
                ].join(' ')}
              >
                <div className="flex flex-1 items-end justify-center gap-[0.2rem]">
                  {shown.map((s, k) => {
                    const value = s.id === 'sales' ? r.sales : s.id === 'cost' ? r.cost : r.profit;
                    return (
                      <span
                        key={s.id}
                        aria-hidden="true"
                        style={{
                          height: grown
                            ? `${Math.max(2, (Math.max(0, value) / top) * 100)}%`
                            : '0%',
                          transitionDelay: `${i * 40 + k * 60}ms`,
                        }}
                        className={`w-full max-w-4 rounded-t-md transition-[height] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${s.bar}`}
                      />
                    );
                  })}
                </div>
                <span className="pb-1.5 text-center text-xs font-semibold text-ink-muted">
                  {r.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {SERIES.map((s) => {
          const total = rows.reduce(
            (n, r) => n + (s.id === 'sales' ? r.sales : s.id === 'cost' ? r.cost : r.profit),
            0,
          );
          return (
            <div key={s.id} className="min-w-0 rounded-2xl bg-surface-muted/70 p-3">
              <dt className="flex items-center gap-2 text-xs font-bold text-ink-muted">
                <span className={`size-2 rounded-full ${s.dot}`} />
                {s.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-extrabold sm:text-base">
                <CountUp value={total} format={formatMoneyShort} />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Sipariş durumu: teslim / bekleyen / iptal halkası, ortada teslim yüzdesi. */
export function OrderStatusRing({ orders }: { orders: HomeData['orders'] }) {
  const total = orders.delivered + orders.cancelled + orders.pending;
  const grown = useGrown(total + ':' + orders.delivered);
  const R = 52;
  const C = 2 * Math.PI * R;
  const parts = [
    { id: 'delivered', label: 'Teslim Edildi', value: orders.delivered, color: 'text-success' },
    { id: 'pending', label: 'Bekleyen', value: orders.pending, color: 'text-accent' },
    { id: 'cancelled', label: 'İptal Edildi', value: orders.cancelled, color: 'text-danger' },
  ];
  const percent = total === 0 ? 0 : (orders.delivered / total) * 100;
  let offset = 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="relative size-52 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="11"
            className="stroke-surface-muted"
          />
          {parts.map((p) => {
            const len = total === 0 ? 0 : (p.value / total) * C;
            const dash = grown ? Math.max(0, len - 3) : 0;
            const el = (
              <circle
                key={p.id}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                stroke="currentColor"
                strokeDasharray={`${dash} ${C}`}
                strokeDashoffset={-offset}
                className={`${p.color} transition-[stroke-dasharray] duration-1000 ease-out`}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tracking-tight">
            <CountUp value={percent} format={(n) => `%${n.toFixed(1).replace('.', ',')}`} />
          </span>
          <span className="text-xs font-semibold text-ink-muted">teslim edildi</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-3 gap-2.5">
        {parts.map((p) => (
          <li key={p.id} className="min-w-0 rounded-2xl bg-surface-muted/70 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-ink-muted">
              <span className={`size-2 rounded-full bg-current ${p.color}`} />
              <span className="truncate">{p.label}</span>
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              <CountUp value={p.value} />
            </p>
            <p className="text-xs text-ink-muted">
              %{total === 0 ? 0 : Math.round((p.value / total) * 100)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold text-ink-muted">
        Toplam <b className="text-ink">{total}</b> sipariş
      </p>
    </div>
  );
}

/** Ödeme şekilleri: tek parça orantılı çubuk + her yöntem için pay. */
export function PaymentMix({ payments }: { payments: PaymentMethod[] }) {
  const grown = useGrown(payments.map((p) => p.amount).join());
  const total = payments.reduce((n, p) => n + p.amount, 0) || 1;
  const colors = ['bg-brand-600', 'bg-accent', 'bg-success', 'bg-ink-muted'];
  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label="Ödeme şekilleri oranı"
        className="flex h-4 overflow-hidden rounded-full bg-surface-muted"
      >
        {payments.map((p, i) => (
          <span
            key={p.id}
            style={{ width: grown ? `${(p.amount / total) * 100}%` : '0%' }}
            className={`${colors[i % colors.length]} border-r-2 border-surface-raised transition-[width] duration-1000 ease-out last:border-0`}
          />
        ))}
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-3">
        {payments.map((p, i) => (
          <li key={p.id} className="rounded-2xl bg-surface-muted/70 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold">
              <span className={`size-2.5 rounded-full ${colors[i % colors.length]}`} />
              {p.label}
            </p>
            <p className="mt-1 text-lg font-extrabold">
              <CountUp value={p.amount} format={formatMoneyShort} />
            </p>
            <p className="text-xs text-ink-muted">
              {p.orderCount} sipariş · %{Math.round((p.amount / total) * 100)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
