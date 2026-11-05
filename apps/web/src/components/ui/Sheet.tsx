import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Ana pencerenin yanında açılıp kapanan ikinci panel (masaüstünde solda; telefonda üstte alttan açılır). */
export interface SheetAside {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** md: dar (iletişim kartları gibi), lg: geniş (gömülü form gibi). */
  size?: 'md' | 'lg';
  /** İçerik alanının dolgusunu kaldırır (iframe gibi kenara dayanan içerik için). */
  flush?: boolean;
  /** İsteğe bağlı yan panel (ör. markanın ürünleri). Escape önce yan paneli kapatır. */
  aside?: SheetAside;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], iframe, button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobilde alttan açılan sayfa (bottom sheet), md ve üzerinde ortalanmış modal.
 * Erişilebilirlik: role="dialog" + aria-modal, odak tuzağı, Escape ile kapanma,
 * kapanınca odağın açan öğeye dönmesi ve arka plan kaydırmasının kilitlenmesi.
 * `aside` verilirse ana pencerenin yanında ikinci bir panel açılır; odak tuzağı ikisini birlikte kapsar.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  size = 'md',
  flush = false,
  aside,
  children,
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const asidePanelRef = useRef<HTMLElement>(null);
  // Odak/klavye effect'i yalnızca open değişince kurulsun diye güncel değerler ref'te tutulur.
  const onCloseRef = useRef(onClose);
  const asideRef = useRef(aside);
  useEffect(() => {
    onCloseRef.current = onClose;
    asideRef.current = aside;
  });

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
        const side = asideRef.current;
        if (side?.open) side.onClose();
        else onCloseRef.current();
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

  // Yan panel açılınca odak panelin içine geçer.
  const asideOpen = aside?.open ?? false;
  useEffect(() => {
    if (asideOpen) asidePanelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [asideOpen]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      {/* KURAL: arka plana tıklamak modalı kapatmaz (yalnızca Esc veya X). onClick eklemeyin. */}
      <div className="modal-backdrop animate-fade-in" aria-hidden="true" />
      {/* Odak tuzağı hem ana pencereyi hem yan paneli kapsar. */}
      <div
        ref={panelRef}
        className="relative flex w-full items-end justify-center gap-4 md:max-w-[min(100%,72rem)] md:items-stretch"
      >
        {aside?.open ? (
          <aside
            ref={asidePanelRef}
            role="dialog"
            aria-label={aside.title}
            className={[
              'animate-sheet-in flex flex-col overflow-hidden bg-surface-raised shadow-card',
              // Telefon: ana pencerenin üstünde, alttan açılır. Masaüstü: ana pencerenin solunda.
              'fixed inset-x-0 bottom-0 z-[60] max-h-[min(88dvh,40rem)] rounded-t-panel',
              'md:static md:z-auto md:max-h-[min(94dvh,56rem)] md:w-[24rem] md:shrink-0 md:rounded-panel',
            ].join(' ')}
          >
            <div
              className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden"
              aria-hidden="true"
            />
            <div className="flex items-start gap-4 px-6 pt-4 md:pt-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight text-ink">{aside.title}</h2>
                {aside.subtitle ? (
                  <p className="mt-1 text-sm text-ink-muted">{aside.subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={aside.onClose}
                className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                aria-label={`${aside.title} panelini kapat`}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {aside.children}
            </div>
          </aside>
        ) : null}

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={[
            'animate-sheet-in relative flex w-full min-w-0 flex-col overflow-hidden',
            'rounded-t-panel bg-surface-raised shadow-card md:flex-1 md:rounded-panel',
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
      </div>
    </div>,
    document.body,
  );
}
