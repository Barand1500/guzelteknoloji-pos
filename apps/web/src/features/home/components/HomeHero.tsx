import {
  Boxes,
  Moon,
  ShoppingBag,
  Sun,
  Sunrise,
  Sunset,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { greetingFor, greetingPeriod } from '../../app-shell/greeting-text';
import { PERIODS, type HomeData, type HomePeriod } from '../types';
import { CountUp, Sparkline, formatMoney, formatMoneyShort } from './parts';

const MOODS = {
  sabah: { icon: Sunrise, bg: 'linear-gradient(135deg,#d9480f 0%,#f08a14 60%,#ffb44d 100%)' },
  gunduz: { icon: Sun, bg: 'linear-gradient(135deg,#c2410c 0%,#b8460f 55%,#9a3a0e 100%)' },
  aksam: { icon: Sunset, bg: 'linear-gradient(135deg,#9a3a0e 0%,#8a2f5c 60%,#5b2a86 100%)' },
  gece: { icon: Moon, bg: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4c3a8c 100%)' },
} as const;

const PERIOD_TITLE: Record<HomePeriod, string> = {
  today: 'Bugünün cirosu',
  week: 'Bu haftanın cirosu',
  month: 'Bu ayın cirosu',
  year: 'Bu yılın cirosu',
  all: 'Toplam ciro',
};

/** Kayan göstergeli dönem seçici (Bugün · Bu Hafta · Bu Ay · Bu Yıl · Tümü). */
export function PeriodTabs({
  value,
  onChange,
}: {
  value: HomePeriod;
  onChange: (p: HomePeriod) => void;
}) {
  const index = PERIODS.findIndex((p) => p.value === value);
  return (
    <div
      role="radiogroup"
      aria-label="Dönem"
      className="relative grid grid-cols-5 rounded-full bg-white/15 p-1 backdrop-blur-sm"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/5)] rounded-full bg-white shadow-soft transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={value === p.value}
          onClick={() => onChange(p.value)}
          className={[
            'relative min-h-10 rounded-full px-1 text-[0.8125rem] font-bold whitespace-nowrap transition-colors duration-300 sm:text-sm',
            value === p.value ? 'text-brand-800' : 'text-white/90 hover:text-white',
          ].join(' ')}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Üstteki karşılama kartı: günün saatine göre renk ve simge değişir (sabah turuncu, akşam mor, gece
 * lacivert), selamlama + seçili dönemin cirosu sayılarak gelir, önceki dönemle farkı ve küçük ciro
 * eğrisi yanında durur. Dönem seçici kartın içindedir.
 */
export function HomeHero({
  name,
  data,
  period,
  onPeriod,
}: {
  name: string | null;
  data: HomeData | null;
  period: HomePeriod;
  onPeriod: (p: HomePeriod) => void;
}) {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const mood = MOODS[greetingPeriod(hour)];
  const Icon = mood.icon;
  const delta =
    data && data.previousSalesAmount > 0
      ? ((data.salesAmount - data.previousSalesAmount) / data.previousSalesAmount) * 100
      : null;

  return (
    <div
      style={{ background: mood.bg }}
      className="relative isolate flex flex-col gap-5 overflow-hidden rounded-[2rem] p-5 text-white shadow-card sm:p-7"
    >
      {/* Süs: yavaşça süzülen yumuşak ışık lekeleri ve günün simgesi */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 -z-10 size-56 animate-pulse rounded-full bg-white/15 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-60 animate-pulse rounded-full bg-black/15 blur-3xl [animation-delay:1.2s]"
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-5 -z-10 size-24 animate-[pulse_6s_ease-in-out_infinite] text-white/15 sm:size-32"
      />

      <div className="flex flex-col gap-1">
        {data?.sample ? (
          <span className="absolute top-4 left-5 rounded-full bg-black/25 px-2.5 py-0.5 text-[0.6875rem] font-bold tracking-wide">
            ÖRNEK VERİ
          </span>
        ) : null}
        <p className={`text-sm font-semibold text-white/85 ${data?.sample ? 'mt-6' : ''}`}>
          {greetingFor(hour)}
          {name ? `, ${name}` : ''}
        </p>
        <p className="text-sm text-white/75">{PERIOD_TITLE[period]}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <CountUp value={data?.salesAmount ?? 0} format={formatMoney} />
          </p>
          {delta !== null ? (
            <p
              className={[
                'mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
                delta >= 0 ? 'bg-white/20' : 'bg-black/25',
              ].join(' ')}
            >
              {delta >= 0 ? (
                <TrendingUp className="size-4" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-4" aria-hidden="true" />
              )}
              <span>
                %{Math.abs(delta).toFixed(1).replace('.', ',')} {delta >= 0 ? 'artış' : 'düşüş'}
              </span>
              <span className="font-medium text-white/75">
                (önceki: {formatMoneyShort(data!.previousSalesAmount)})
              </span>
            </p>
          ) : null}
        </div>
        {data ? (
          <Sparkline
            key={period}
            values={data.trend}
            className="h-14 w-full max-w-48 text-white sm:h-16"
          />
        ) : null}
      </div>

      <PeriodTabs value={period} onChange={onPeriod} />
    </div>
  );
}

const TILES = [
  { id: 'orders', label: 'Sipariş', icon: ShoppingBag },
  { id: 'customers', label: 'Müşteri', icon: Users },
  { id: 'products', label: 'Ürün', icon: Boxes },
  { id: 'totalSales', label: 'Toplam Satış', icon: Wallet },
] as const;

/** Dört küçük sayı kutusu (sipariş, müşteri, ürün, toplam satış); sayılar akarak gelir. */
export function StatTiles({ stats }: { stats: HomeData['stats'] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TILES.map((t, i) => {
        const Icon = t.icon;
        const money = t.id === 'totalSales';
        return (
          <div
            key={t.id}
            style={{ animationDelay: `${i * 60}ms` }}
            className="flex animate-rise-in items-center gap-3 rounded-3xl border border-line bg-surface-raised p-4 shadow-soft"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dd className="truncate text-xl font-extrabold tracking-tight">
                <CountUp value={stats[t.id]} format={money ? formatMoneyShort : undefined} />
              </dd>
              <dt className="truncate text-sm text-ink-muted">{t.label}</dt>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
