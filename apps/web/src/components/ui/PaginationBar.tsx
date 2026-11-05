import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TextField } from './TextField';

interface PaginationBarProps {
  total: number;
  from: number;
  to: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  sizeText: string;
  onSizeTextChange: (text: string) => void;
  /** Sayılan şeyin adı, ör. "marka" → "1–10 / 42 marka" ve "Sayfada Kaç Marka". */
  noun: string;
}

/** Gösterilecek sayfa numaraları: ilk, son ve geçerli sayfanın komşuları; aralar "…" ile. */
function pageWindow(page: number, count: number): (number | 'gap')[] {
  const wanted = new Set([1, count, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  pages.forEach((p, i) => {
    const previous = pages[i - 1];
    if (previous !== undefined && p - previous > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const navButton =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Liste altındaki sayfalama çubuğu: gösterilen aralık, sayfa numaraları (telefonda "2 / 5") ve
 * "sayfada kaç adet" kutusu. Adedi kullanıcı yazar (varsayılan 10); yalnızca rakam kabul edilir.
 */
export function PaginationBar({
  total,
  from,
  to,
  page,
  pageCount,
  onPageChange,
  sizeText,
  onSizeTextChange,
  noun,
}: PaginationBarProps) {
  const sizeLabel = `Sayfada Kaç ${noun.charAt(0).toLocaleUpperCase('tr')}${noun.slice(1)}`;
  return (
    <nav
      aria-label="Sayfalama"
      className="flex flex-col gap-3 rounded-3xl border border-line bg-surface-raised p-3 md:flex-row md:items-center md:justify-between md:gap-4"
    >
      <div className="flex items-center gap-4 md:order-1">
        <div className="w-44 shrink-0">
          <TextField
            label={sizeLabel}
            numeric="integer"
            value={sizeText}
            maxLength={3}
            onChange={(e) => onSizeTextChange(e.target.value)}
          />
        </div>
        <p className="text-sm text-ink-muted" aria-live="polite">
          <b className="text-ink">
            {from}–{to}
          </b>{' '}
          / {total} {noun}
        </p>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-1 md:order-2 md:justify-end">
          <button
            type="button"
            aria-label="Önceki sayfa"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${navButton} bg-surface-muted text-ink hover:bg-brand-50 hover:text-brand-ink`}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Geri
          </button>

          {/* Telefonda yalnızca "2 / 5"; geniş ekranda numaralar */}
          <p className="px-3 text-sm font-bold sm:hidden">
            {page} / {pageCount}
          </p>
          <div className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, pageCount).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-ink-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-label={`Sayfa ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => onPageChange(p)}
                  className={[
                    'inline-flex size-11 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    p === page
                      ? 'bg-brand-700 text-white'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  ].join(' ')}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            aria-label="Sonraki sayfa"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className={`${navButton} bg-surface-muted text-ink hover:bg-brand-50 hover:text-brand-ink`}
          >
            İleri
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
