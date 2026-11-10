import { Ban, Check, ChevronDown, ChevronUp, Clock, PackageCheck, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { RETURN_STATUS_LABEL, STATUS_LABEL, type OrderStatus, type ReturnStatus } from '../types';

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

const STATUS_STYLE: Record<OrderStatus, { tone: string; icon: typeof Check }> = {
  pending: { tone: 'bg-accent-soft text-brand-800', icon: Clock },
  preparing: { tone: 'bg-brand-50 text-brand-ink', icon: PackageCheck },
  shipped: { tone: 'bg-surface-muted text-ink', icon: Truck },
  delivered: { tone: 'bg-success-soft text-success', icon: Check },
  cancelled: { tone: 'bg-danger-soft text-danger', icon: Ban },
};

function Pill({
  tone,
  icon: Icon,
  children,
}: {
  tone: string;
  icon: typeof Check;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tone}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {STATUS_LABEL[status]}
    </Pill>
  );
}

const RETURN_STYLE: Record<ReturnStatus, { tone: string; icon: typeof Check }> = {
  pending: STATUS_STYLE.pending,
  approved: STATUS_STYLE.preparing,
  rejected: STATUS_STYLE.cancelled,
  completed: STATUS_STYLE.delivered,
};

export function ReturnPill({ status }: { status: ReturnStatus }) {
  const s = RETURN_STYLE[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {RETURN_STATUS_LABEL[status]}
    </Pill>
  );
}

export interface ChipOption<V extends string> {
  value: V;
  label: string;
  count: number;
}

/** Sayaçlı süzgeç hapları (yatay kayar): "Tümü 38 · Bekliyor 4 · …". */
export function CountChips<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: ChipOption<V>[];
  onChange: (v: V) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={[
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all duration-200',
              on
                ? 'border-brand-600 bg-brand-700 text-white shadow-soft'
                : 'border-field-border bg-surface-raised text-ink-muted hover:border-brand-500 hover:text-ink',
            ].join(' ')}
          >
            {o.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/20' : 'bg-surface-muted'}`}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Sıralanabilir tablo başlığı. */
export function SortTh({
  label,
  active,
  dir,
  onSort,
  className = '',
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onSort: () => void;
  className?: string;
}) {
  const Arrow = dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 text-left text-xs font-extrabold tracking-wider whitespace-nowrap text-ink-muted uppercase ${className}`}
    >
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-ink ${active ? 'text-brand-ink' : ''}`}
      >
        {label}
        <Arrow className={`size-3.5 ${active ? '' : 'opacity-30'}`} aria-hidden="true" />
      </button>
    </th>
  );
}

/** Örnek veri uyarısı (sunucu uçları hazır olana kadar). */
export function SampleNote() {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-3 py-1 text-xs font-extrabold tracking-wide text-brand-800">
      ÖRNEK VERİ
    </p>
  );
}
