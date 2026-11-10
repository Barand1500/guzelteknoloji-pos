import { Check, Clock, Eye, X } from 'lucide-react';
import { useState } from 'react';
import type { OrderStatus, RankedProduct, RecentOrder } from '../types';
import { formatMoney } from './parts';

const STATUS: Record<OrderStatus, { label: string; tone: string; icon: typeof Check }> = {
  delivered: { label: 'Teslim Edildi', tone: 'bg-success-soft text-success', icon: Check },
  pending: { label: 'Bekliyor', tone: 'bg-accent-soft text-brand-800', icon: Clock },
  cancelled: { label: 'İptal Edildi', tone: 'bg-danger-soft text-danger', icon: X },
};

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Son siparişler: telefonda da rahat okunan kartlar (tablo değil); durum rengi soldaki şeritte. */
export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <ul aria-label="Son siparişler" className="flex flex-col gap-2">
      {orders.map((o, i) => {
        const s = STATUS[o.status];
        const Icon = s.icon;
        return (
          <li
            key={o.id}
            style={{ animationDelay: `${i * 50}ms` }}
            className="group flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-brand-500/60"
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}
              title={s.label}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{s.label}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{o.customer}</span>
              <span className="block truncate text-xs text-ink-muted">
                #{o.no} · {dateFormat.format(new Date(o.date))}
              </span>
            </span>
            <b className="shrink-0 text-sm sm:text-base">{formatMoney(o.amount)}</b>
            <button
              type="button"
              aria-label={`${o.no} numaralı siparişi görüntüle`}
              title="Görüntüle"
              className="hidden size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink sm:inline-flex"
            >
              <Eye className="size-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type RankTab = 'carts' | 'favorites' | 'alarms';
const TABS: { id: RankTab; label: string; unit: string }[] = [
  { id: 'carts', label: 'Sepette', unit: 'sepette' },
  { id: 'favorites', label: 'Favoriler', unit: 'favori' },
  { id: 'alarms', label: 'Fiyat Alarmı', unit: 'alarm' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toLocaleUpperCase('tr');

/** Ürün sıralamaları: sepette bekleyen, en çok favorilenen, fiyat alarmı kurulan — tek kartta sekmeli. */
export function ProductRanks({ ranks }: { ranks: Record<RankTab, RankedProduct[]> }) {
  const [tab, setTab] = useState<RankTab>('carts');
  const list = ranks[tab];
  const top = Math.max(1, ...list.map((p) => p.count));
  const unit = TABS.find((t) => t.id === tab)!.unit;
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Ürün sıralaması"
        className="grid grid-cols-3 rounded-full bg-surface-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              'min-h-10 rounded-full px-2 text-sm font-bold transition-all duration-200',
              tab === t.id
                ? 'bg-surface-raised text-brand-ink shadow-soft'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">Henüz kayıt yok.</p>
      ) : (
        <ol key={tab} aria-label="Ürünler" className="flex flex-col gap-2.5">
          {list.map((p, i) => (
            <li
              key={p.id}
              style={{ animationDelay: `${i * 55}ms` }}
              className="flex animate-rise-in items-center gap-3"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-extrabold text-brand-ink">
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-brand-600"
                      style={{ width: `${(p.count / top) * 100}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{p.code}</span>
                </span>
              </span>
              <span
                className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-extrabold text-brand-ink"
                title={`${p.count} ${unit}`}
              >
                {p.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
