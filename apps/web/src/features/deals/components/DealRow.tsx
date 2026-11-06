import { Boxes, GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { SortableRowContext } from '../../../components/ui/SortableList';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { positionLabel, sizeLabel, type Deal } from '../types';
import { DealPreview } from './DealPreview';

interface DealRowProps {
  deal: Deal;
  /** true: telefon düzeni (sola kaydırınca işlemler çıkar); false: masaüstü/tablet. */
  phone: boolean;
  sortable: SortableRowContext;
  sortingDisabled: boolean;
  swipeOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

const ACTION_WIDTH = 68;

/** Rozetin yeri ve boyutu: listeden bakınca ürün resminde nasıl duracağı anlaşılsın diye yazılır. */
const placement = (d: Deal) =>
  d.showOnImage ? `${positionLabel(d.position)} · ${sizeLabel(d.size)}` : 'Yalnızca etiket';

const subtitle = (d: Deal) =>
  `${placement(d)} · ${d.productCount} ürün${d.active ? '' : ' · Pasif'}`;

/** Telefonda bir fırsat satırı: ürün önizlemesi, ad, yer/boyut, anahtar; sola kaydırınca işlemler. */
function PhoneRow({
  deal,
  swipeOpen,
  onSwipeOpenChange,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: DealRowProps) {
  const actionClass =
    'flex w-17 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold';
  return (
    <div data-swipe-row={deal.id}>
      <SwipeRow
        open={swipeOpen}
        onOpenChange={onSwipeOpenChange}
        actionsWidth={ACTION_WIDTH * 3}
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
            <button
              type="button"
              onClick={onAssign}
              className={`${actionClass} bg-ink-muted text-surface`}
            >
              <Boxes className="size-5" aria-hidden="true" />
              Ürünler
            </button>
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
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface-raised p-2.5 pr-1">
          <div
            role="button"
            tabIndex={0}
            aria-label={`${deal.name} fırsatını düzenle`}
            onClick={onEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit();
              }
            }}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl ${deal.active ? '' : 'opacity-50'}`}
          >
            <DealPreview look={deal} className="relative size-[4.5rem] shrink-0 rounded-2xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold">{deal.name}</span>
              <span className="block text-sm leading-snug text-ink-muted">{subtitle(deal)}</span>
            </span>
          </div>
          <ToggleSwitch label={`${deal.name} aktif`} checked={deal.active} onChange={onToggle} />
        </div>
      </SwipeRow>
    </div>
  );
}

/** Masaüstü/tablet satırı: tutamak, büyük önizleme, ad + yer, ürün sayısı, anahtar, işlem düğmeleri. */
function WideRow({
  deal,
  sortable,
  sortingDisabled,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: DealRowProps) {
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
      {/* Masaüstünde düzenlemek için satıra ÇİFT TIKLANIR (kalem düğmesi yok). Klavye: Enter. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${deal.name} fırsatını düzenle`}
        title="Düzenlemek için çift tıklayın"
        onDoubleClick={onEdit}
        onClick={(e) => {
          if (e.detail === 0) onEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit();
          }
        }}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl select-none ${deal.active ? '' : 'opacity-50'}`}
      >
        <DealPreview look={deal} className="relative size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{deal.name}</p>
          <p className="truncate text-sm text-ink-muted">Ürün resminde: {placement(deal)}</p>
        </div>
      </div>
      <span className="hidden shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted sm:inline">
        {deal.productCount} ürün
      </span>
      <ToggleSwitch label={`${deal.name} aktif`} checked={deal.active} onChange={onToggle} />
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onAssign}
          aria-label={`${deal.name} fırsatının ürünlerini yönet`}
          title="Ürünler"
          className={iconButton}
        >
          <Boxes className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${deal.name} fırsatını sil`}
          title="Sil"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function DealRow(props: DealRowProps) {
  return props.phone ? <PhoneRow {...props} /> : <WideRow {...props} />;
}
