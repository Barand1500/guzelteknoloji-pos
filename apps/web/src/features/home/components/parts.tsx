import { useEffect, useRef, useState, type ReactNode } from 'react';

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const moneyShort = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat('tr-TR');

/** 1.234,50 ₺ */
export const formatMoney = (n: number) => money.format(n);
/** 1.235 ₺ (kuruşsuz) */
export const formatMoneyShort = (n: number) => moneyShort.format(n);
export const formatCount = (n: number) => plain.format(Math.round(n));

const reduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Sayı değişince eski değerden yenisine akarak sayar (ilk gösterimde sıfırdan). Hareketi azalt
 * ayarı açıksa doğrudan yazılır. Ekran okuyucu yalnızca son değeri okur.
 */
export function CountUp({
  value,
  format = formatCount,
  duration = 900,
  className = '',
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduced() || typeof requestAnimationFrame !== 'function') {
      const id = window.setTimeout(() => setShown(value), 0);
      return () => window.clearTimeout(id);
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = origin + (value - origin) * eased;
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}

/** Küçük eğri grafik: çizgi kendini çizer, altı yumuşak dolar. Renk üst öğenin yazı rengidir. */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const w = 120;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - 4 - ((v - min) / span) * (h - 8),
  ]);
  // Yumuşak eğri (orta noktalar arası ikinci derece Bézier).
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    d += ` Q${x0},${y0} ${(x0! + x1!) / 2},${(y0! + y1!) / 2}`;
  }
  const last = pts[pts.length - 1]!;
  d += ` T${last[0]},${last[1]}`;
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" className="animate-fade-in" />
      <path
        d={d}
        pathLength={1}
        strokeDasharray={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="animate-draw"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" className="animate-pop" />
    </svg>
  );
}

/** Anasayfa kartı. */
export function Card({
  title,
  hint,
  action,
  children,
  className = '',
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-4 rounded-[1.75rem] border border-line bg-surface-raised p-5 shadow-soft ${className}`}
    >
      {title ? (
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold tracking-tight">{title}</h3>
            {hint ? <p className="truncate text-sm text-ink-muted">{hint}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Bölüm başlığı (altta yüzen çubuğun "git" düğmeleri bu kimliklere kayar). */
export function Block({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="flex items-center gap-2.5 px-1 text-lg font-extrabold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-ink">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
