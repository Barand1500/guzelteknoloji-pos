import {
  Boxes,
  ChevronRight,
  EyeOff,
  FolderInput,
  GripVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { SortableRowContext } from '../../../components/ui/SortableList';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import type { Category } from '../types';
import { CategoryImage } from './CategoryImage';
import { categorySubtitle } from './CategoryTile';

interface CategoryRowProps {
  category: Category;
  /** true: telefon düzeni (sola kaydırınca işlemler çıkar); false: masaüstü/tablet. */
  phone: boolean;
  sortable: SortableRowContext;
  sortingDisabled: boolean;
  /** Arama sonuçlarında "Ana › Alt" yolu gösterilir. */
  pathText?: string | undefined;
  swipeOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onMove: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

const ACTION_WIDTH = 68;

function PhoneRow(props: CategoryRowProps) {
  const {
    category,
    pathText,
    swipeOpen,
    onSwipeOpenChange,
    onOpen,
    onEdit,
    onAssign,
    onMove,
    onDelete,
  } = props;
  const actionClass =
    'flex w-17 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold';
  return (
    <div data-swipe-row={category.id}>
      <SwipeRow
        open={swipeOpen}
        onOpenChange={onSwipeOpenChange}
        actionsWidth={ACTION_WIDTH * 4}
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
              onClick={onMove}
              className={`${actionClass} bg-brand-900 text-white`}
            >
              <FolderInput className="size-5" aria-hidden="true" />
              Taşı
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
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface-raised p-2 pr-1">
          <div
            role="button"
            tabIndex={0}
            aria-label={`${category.name} kategorisini aç`}
            onClick={onOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl ${category.active ? '' : 'opacity-50'}`}
          >
            <CategoryImage category={category} className="size-12 rounded-xl text-sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="block truncate text-base font-bold">{category.name}</span>
                {category.hidden ? (
                  <EyeOff
                    className="size-4 shrink-0 text-ink-muted"
                    aria-label="Mağazada gizli"
                    role="img"
                  />
                ) : null}
              </span>
              <span className="block truncate text-sm text-ink-muted">
                {pathText ?? categorySubtitle(category)}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          </div>
          <ToggleSwitch
            label={`${category.name} aktif`}
            checked={category.active}
            onChange={props.onToggle}
          />
        </div>
      </SwipeRow>
    </div>
  );
}

/**
 * Masaüstü/tablet satırı: tutamak, görsel, ad, sayılar, anahtar, işlem düğmeleri. Tek tıklama
 * kategorinin içine girer (gezinme), bu yüzden düzenleme için kalem düğmesi vardır.
 */
function WideRow(props: CategoryRowProps) {
  const {
    category,
    pathText,
    sortable,
    sortingDisabled,
    onOpen,
    onEdit,
    onAssign,
    onMove,
    onDelete,
  } = props;
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
      <div
        role="button"
        tabIndex={0}
        aria-label={`${category.name} kategorisini aç`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl ${category.active ? '' : 'opacity-50'}`}
      >
        <CategoryImage category={category} className="size-14 rounded-2xl text-base" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate text-lg font-bold">{category.name}</span>
            {category.hidden ? (
              <EyeOff
                className="size-4 shrink-0 text-ink-muted"
                aria-label="Mağazada gizli"
                role="img"
              />
            ) : null}
          </p>
          <p className="truncate text-sm text-ink-muted">
            {pathText ?? (category.description || 'Açıklama eklenmemiş')}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted sm:inline">
          {category.childCount} alt · {category.productCount} ürün
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
      </div>
      <ToggleSwitch
        label={`${category.name} aktif`}
        checked={category.active}
        onChange={props.onToggle}
      />
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${category.name} kategorisini düzenle`}
          title="Düzenle"
          className={iconButton}
        >
          <Pencil className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onAssign}
          aria-label={`${category.name} kategorisinin ürünlerini yönet`}
          title="Ürünler"
          className={iconButton}
        >
          <Boxes className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onMove}
          aria-label={`${category.name} kategorisini taşı`}
          title="Taşı"
          className={iconButton}
        >
          <FolderInput className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${category.name} kategorisini sil`}
          title="Sil"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function CategoryRow(props: CategoryRowProps) {
  return props.phone ? <PhoneRow {...props} /> : <WideRow {...props} />;
}
