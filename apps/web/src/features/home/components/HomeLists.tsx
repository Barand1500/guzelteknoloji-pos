import {
  BellRing,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { OrderStatus, RankedProduct, RecentOrder } from '../types';
import { CountUp, formatMoney } from './parts';

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

const PAGE_SIZE = 5;

/**
 * Son siparişler: telefonda da rahat okunan kartlar (tablo değil), sayfa başına 5 sipariş.
 * Altta önceki/sonraki düğmeleri ve "1 / 3" göstergesi vardır; kart yüksekliği sabit kalır.
 */
export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = orders.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const nav =
    'inline-flex size-10 items-center justify-center rounded-full border border-field-border text-ink transition-colors hover:border-brand-500 hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-field-border disabled:hover:text-ink';

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ul key={current} aria-label="Son siparişler" className="flex flex-col gap-2">
        {shown.map((o, i) => {
          const s = STATUS[o.status];
          const Icon = s.icon;
          return (
            <li
              key={o.id}
              style={{ animationDelay: `${i * 50}ms` }}
              className="flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-brand-500/60"
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
      {pages > 1 ? (
        <nav
          aria-label="Sipariş sayfaları"
          className="mt-auto flex items-center justify-between gap-3 pt-1"
        >
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            aria-label="Önceki sayfa"
            className={nav}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
            <b className="text-ink">{current}</b> / {pages}
            <span className="ml-2 hidden sm:inline">· {orders.length} sipariş</span>
          </p>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current === pages}
            aria-label="Sonraki sayfa"
            className={nav}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

type RankTab = 'carts' | 'favorites' | 'alarms';
const TABS: { id: RankTab; label: string; unit: string; icon: typeof Heart }[] = [
  { id: 'carts', label: 'Sepette', unit: 'sepette', icon: ShoppingCart },
  { id: 'favorites', label: 'Favoriler', unit: 'favori', icon: Heart },
  { id: 'alarms', label: 'Fiyat Alarmı', unit: 'alarm', icon: BellRing },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toLocaleUpperCase('tr');

/**
 * Ürün sıralamaları: sepette bekleyen, en çok favorilenen, fiyat alarmı kurulan. Sekmeli tek kart;
 * 1. sıradaki ürün büyük bir "zirve" kartıyla öne çıkar (sayısı akarak gelir), diğerleri sıra
 * numaralı satırlardır ve çubukları 1. sıraya göre dolar. Sekme değişince liste yeniden kayarak gelir.
 */
export function ProductRanks({ ranks }: { ranks: Record<RankTab, RankedProduct[]> }) {
  const [tab, setTab] = useState<RankTab>('carts');
  const list = ranks[tab];
  const active = TABS.find((t) => t.id === tab)!;
  const ActiveIcon = active.icon;
  const top = Math.max(1, ...list.map((p) => p.count));
  const [first, ...rest] = list;
  const index = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Ürün sıralaması"
        className="relative grid grid-cols-3 rounded-full bg-surface-muted p-1"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-surface-raised shadow-soft transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={[
                'relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-2 text-sm font-bold transition-colors duration-300',
                tab === t.id ? 'text-brand-ink' : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                <span className="sm:hidden" aria-hidden="true">
                  {t.id === 'alarms' ? 'Alarm' : t.label}
                </span>
                <span className="max-sm:hidden">{t.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!first ? (
        <p className="py-8 text-center text-ink-muted">Henüz kayıt yok.</p>
      ) : (
        <div
          key={tab}
          className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          {/* 1. sıra: öne çıkan kart */}
          <div className="relative isolate flex animate-pop flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <ActiveIcon
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -bottom-4 -z-10 size-32 text-white/15"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold tracking-wide">
                1. SIRA
              </span>
              <span className="text-xs font-semibold text-white/80">{first.code}</span>
            </div>
            <div>
              <p className="line-clamp-2 text-lg leading-snug font-extrabold">{first.name}</p>
              <p className="mt-3 flex items-end gap-2">
                <CountUp value={first.count} className="text-5xl leading-none font-extrabold" />
                <span className="pb-1 text-sm font-semibold text-white/85">{active.unit}</span>
              </p>
            </div>
          </div>

          {/* 2. ve sonrası */}
          <ol aria-label="Ürünler" className="flex flex-col gap-2">
            {rest.map((p, i) => (
              <li
                key={`${p.id}-${i}`}
                style={{ animationDelay: `${i * 55}ms` }}
                className="flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pr-3.5"
              >
                <span
                  className={[
                    'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold',
                    i === 0 ? 'bg-accent text-ink' : 'bg-surface-muted text-ink-muted',
                  ].join(' ')}
                >
                  {i + 2}
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-extrabold text-brand-ink max-sm:hidden">
                  {initials(p.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-[width] duration-700"
                        style={{ width: `${(p.count / top) * 100}%` }}
                      />
                    </span>
                    <span className="max-w-24 shrink-0 truncate text-xs text-ink-muted">
                      {p.code}
                    </span>
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-extrabold text-brand-ink"
                  title={`${p.count} ${active.unit}`}
                >
                  {p.count}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
