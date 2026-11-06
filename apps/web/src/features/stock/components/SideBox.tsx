import { ChevronDown, Lock, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';

interface SideBoxProps {
  icon: LucideIcon;
  title: string;
  /** Kapalıyken başlığın yanında görünen kısa durum yazısı (ör. "2 seçili"). */
  summary: string;
  open: boolean;
  onToggle: () => void;
  /** Verilirse kutu açılmaz ve neden kilitli olduğu bu metinle söylenir. */
  lockedReason?: string;
  children: ReactNode;
}

/**
 * Yan paneldeki yatay kutu. Kapalıyken ince, tek satırlık bir dikdörtgendir (ikon, ad, durum);
 * tıklanınca olduğu yerde açılıp içeriğini gösterir, yeniden tıklanınca kapanır. Aynı anda hangi
 * kutunun açık olacağını üst bileşen (StockSidePanel) belirler.
 */
export function SideBox({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  lockedReason,
  children,
}: SideBoxProps) {
  const bodyId = useId();

  if (lockedReason) {
    return (
      <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-dashed border-line-strong/60 bg-surface-muted px-3.5 text-ink-muted">
        <Lock className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-bold">{title}</span>
        <span className="ml-auto truncate text-xs">{lockedReason}</span>
      </div>
    );
  }

  return (
    <section
      className={[
        'rounded-2xl border bg-surface-raised transition-colors',
        open ? 'border-brand-600 shadow-soft' : 'border-line hover:border-brand-500',
      ].join(' ')}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left"
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-ink"
          >
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-bold">{title}</span>
          <span className="ml-auto min-w-0 truncate text-xs text-ink-muted">{summary}</span>
          <ChevronDown
            className={[
              'size-4 shrink-0 text-ink-muted transition-transform duration-200',
              open ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden="true"
          />
        </button>
      </h3>
      {open ? (
        <div id={bodyId} role="region" aria-label={title} className="animate-fade-in px-3.5 pb-3.5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
