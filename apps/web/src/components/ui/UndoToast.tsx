import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface UndoToastProps {
  /** Ana metin, ör. "Flexypos silindi". */
  message: string;
  /** Geri alma için tanınan süre (ms). Süre dolunca `onTimeout` çalışır. */
  durationMs?: number;
  onUndo: () => void;
  onTimeout: () => void;
}

/**
 * Silme sonrası "Geri almak ister misiniz?" bildirimi. Altındaki ilerleme çubuğu kalan süreyi
 * gösterir; "Geri Al"a basılırsa işlem iptal olur, basılmazsa süre dolunca kalıcı olur.
 * Yeni bir bildirim için `key` değiştirilir (sayaç sıfırlanır).
 */
export function UndoToast({ message, durationMs = 6000, onUndo, onTimeout }: UndoToastProps) {
  const timeout = useRef(onTimeout);
  useEffect(() => {
    timeout.current = onTimeout;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => timeout.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-28">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto relative w-full max-w-md animate-rise-in overflow-hidden rounded-2xl bg-ink text-surface shadow-card"
      >
        <div className="flex items-center gap-3 py-3 pr-3 pl-4">
          <Trash2 className="size-5 shrink-0 opacity-80" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm leading-snug">
            <span className="font-bold">{message}</span>
            <span className="block opacity-80">Geri almak ister misiniz?</span>
          </p>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-brand-500 px-4 text-sm font-bold text-white transition-transform active:scale-95"
          >
            Geri Al
          </button>
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-1 bg-brand-500"
          style={{ animation: `undo-progress ${durationMs}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
