import { ChevronRight, Copy, GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SortableRowContext } from '../../../components/ui/SortableList';
import { SwipeRow } from '../../../components/ui/SwipeRow';

interface AttributeRowProps {
  /** Satırın benzersiz kimliği (kaydırma satırı için). */
  id: string;
  name: string;
  /** Satırın adının altındaki küçük etiketler (kategoriler, anahtarlar, sayılar). */
  tags: ReactNode;
  /** Ekran okuyucu etiketleri (ör. "Dokunmatik POS şablonunu aç"). */
  labels: { open: string; edit: string; remove: string; copy?: string };
  /** true: telefon düzeni (sola kaydırınca işlemler çıkar); false: masaüstü/tablet. */
  phone: boolean;
  sortable: SortableRowContext;
  sortingDisabled: boolean;
  swipeOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onEdit: () => void;
  /** Verilirse satırda "Kopyala" işlemi görünür (şablonlarda). */
  onCopy?: () => void;
  onDelete: () => void;
}

const ACTION_WIDTH = 68;

/** Ad baş harfleriyle küçük rozet (şablon ve gruplarda görsel yoktur). */
function Monogram({ name, className }: { name: string; className: string }) {
  const words = name.trim().split(/\s+/);
  const letters =
    words.length > 1 ? words.slice(0, 2).map((w) => w[0] ?? '') : [...name].slice(0, 2);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-brand-50 font-extrabold tracking-wide text-brand-ink ${className}`}
    >
      {letters.join('').toLocaleUpperCase('tr')}
    </span>
  );
}

/**
 * Şablon ve grup listelerinin ortak satırı. Tek dokunuş/tıklama İÇİNE GİRER (klasör gibi);
 * düzenleme ve silme telefonda sola kaydırınca, masaüstünde satırdaki düğmelerle yapılır.
 * Sürükleyerek sıralama diğer listelerle aynıdır (uzun basma / ⠿ tutamağı).
 */
export function AttributeRow(props: AttributeRowProps) {
  const {
    id,
    name,
    tags,
    labels,
    phone,
    sortable,
    sortingDisabled,
    swipeOpen,
    onSwipeOpenChange,
    onOpen,
    onEdit,
    onCopy,
    onDelete,
  } = props;

  const open = (
    <div
      role="button"
      tabIndex={0}
      aria-label={labels.open}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl"
    >
      <Monogram
        name={name}
        className={phone ? 'size-12 rounded-xl text-sm' : 'size-14 rounded-2xl text-base'}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-bold ${phone ? 'text-base' : 'text-lg'}`}>
          {name}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">{tags}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
    </div>
  );

  if (phone) {
    const actionClass =
      'flex w-17 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold';
    return (
      <div data-swipe-row={id}>
        <SwipeRow
          open={swipeOpen}
          onOpenChange={onSwipeOpenChange}
          actionsWidth={ACTION_WIDTH * (onCopy ? 3 : 2)}
          actions={
            <>
              <button
                type="button"
                onClick={onEdit}
                className={`${actionClass} bg-brand-700 text-white`}
              >
                <Pencil className="size-5" aria-hidden="true" />
                Düzenle
              </button>
              {onCopy ? (
                <button
                  type="button"
                  onClick={onCopy}
                  className={`${actionClass} bg-ink text-surface`}
                >
                  <Copy className="size-5" aria-hidden="true" />
                  Kopyala
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDelete}
                className={`${actionClass} bg-danger text-surface`}
              >
                <Trash2 className="size-5" aria-hidden="true" />
                Sil
              </button>
            </>
          }
        >
          <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface-raised p-2.5 pr-3">
            {open}
          </div>
        </SwipeRow>
      </div>
    );
  }

  const iconButton =
    'inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink focus-visible:bg-brand-50';
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface-raised p-3 pr-4 transition-colors hover:border-brand-500/60">
      <button
        type="button"
        {...sortable.handleProps}
        className={[
          'inline-flex size-10 shrink-0 touch-none items-center justify-center rounded-full text-ink-muted transition-colors',
          sortingDisabled
            ? 'cursor-not-allowed opacity-30'
            : 'cursor-grab hover:bg-surface-muted active:cursor-grabbing',
        ].join(' ')}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>
      {open}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          aria-label={labels.edit}
          title="Düzenle"
          className={iconButton}
        >
          <Pencil className="size-5" aria-hidden="true" />
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            aria-label={labels.copy}
            title="Kopyala"
            className={iconButton}
          >
            <Copy className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          aria-label={labels.remove}
          title="Sil"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
