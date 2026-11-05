import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** md: dar (iletişim kartları gibi), lg: geniş (gömülü form gibi). */
  size?: 'md' | 'lg';
  /** İçerik alanının dolgusunu kaldırır (iframe gibi kenara dayanan içerik için). */
  flush?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], iframe, button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobilde alttan açılan sayfa (bottom sheet), md ve üzerinde ortalanmış modal.
 * Erişilebilirlik: role="dialog" + aria-modal, odak tuzağı, Escape ile kapanma,
 * kapanınca odağın açan öğeye dönmesi ve arka plan kaydırmasının kilitlenmesi.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  size = 'md',
  flush = false,
  children,
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Odak/klavye effect'i yalnızca open değişince kurulsun diye güncel onClose ref'te tutulur.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      {/* KURAL: arka plana tıklamak modalı kapatmaz (yalnızca Esc veya X). onClick eklemeyin. */}
      <div className="modal-backdrop animate-fade-in" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={[
          'animate-sheet-in relative flex w-full flex-col overflow-hidden',
          'rounded-t-panel bg-surface-raised shadow-card md:rounded-panel',
          size === 'lg'
            ? 'max-h-[min(94dvh,56rem)] md:max-w-2xl'
            : 'max-h-[min(90dvh,40rem)] md:max-w-md',
        ].join(' ')}
      >
        <div
          className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden"
          aria-hidden="true"
        />
        <div className="flex items-start gap-4 px-6 pt-4 md:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Kapat"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div
          className={[
            'overflow-y-auto overscroll-contain',
            flush
              ? 'px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4'
              : 'px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
