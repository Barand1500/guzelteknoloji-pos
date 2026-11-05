import { ChevronLeft, Save } from 'lucide-react';
import { getCompletion } from '../stock.calc';
import type { StockCardDraft } from '../types';

interface CollapsedSummaryProps {
  draft: StockCardDraft;
  saving: boolean;
  onOpen: () => void;
  onSave: () => void;
}

/**
 * Özet kapalıyken sağda kalan ince şerit: ok ile yeniden açılır; doluluk sayısı ve
 * kaydetme düğmesi yine elin altındadır. Sol alan bu sırada genişler.
 */
export function CollapsedSummary({ draft, saving, onOpen, onSave }: CollapsedSummaryProps) {
  const checks = getCompletion(draft);
  const done = checks.filter((c) => c.ok).length;
  return (
    <div className="flex w-14 flex-col items-center gap-3 rounded-[1.75rem] border border-line bg-surface-raised py-3 shadow-soft">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Özeti Aç"
        title="Özeti aç"
        className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <span
        title="Kart doluluğu"
        className="rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-ink"
      >
        {done}/{checks.length}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        aria-label="Kaydet"
        title="Kaydet"
        className="inline-flex size-10 items-center justify-center rounded-full bg-brand-700 text-white disabled:opacity-60"
      >
        <Save className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
