import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

interface AttributeGroupFoldProps {
  name: string;
  /** Bu gruptan seçili değer sayısı (kapalıyken özet olarak görünür). */
  selected: number;
  children: ReactNode;
}

/**
 * Bir özellik grubu (Renk, Materyal…): başlangıçta KAPALI gelir, uzayıp gitmez. Başlığa dokununca
 * değerler açılır; seçili değer varsa kapalıyken de sayısı görünür.
 */
export function AttributeGroupFold({ name, selected, children }: AttributeGroupFoldProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-2 rounded-2xl border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm font-semibold hover:bg-surface-muted"
      >
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {selected > 0 ? (
          <span className="rounded-full bg-brand-700 px-2 text-xs font-bold text-white">
            {selected} seçili
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div id={id} role="group" aria-label={name} className="animate-fade-in px-3 pb-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
