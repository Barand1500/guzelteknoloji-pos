import { Boxes, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import type { SortableRowContext } from '../../../components/ui/SortableList';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import type { Brand } from '../types';
import { BrandLogo } from './BrandLogo';

interface BrandRowProps {
  brand: Brand;
  /** true: telefon düzeni (sola kaydırınca işlemler çıkar); false: masaüstü/tablet. */
  phone: boolean;
  sortable: SortableRowContext;
  /** Sıralama kapalıyken (arama sırasında) tutamak soluk gösterilir. */
  sortingDisabled: boolean;
  swipeOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

const ACTION_WIDTH = 68;

const subtitle = (brand: Brand) => `${brand.productCount} ürün${brand.active ? '' : ' · Pasif'}`;

/** Telefonda bir marka satırı: logo, ad, ürün sayısı, anahtar; sola kaydırınca işlemler. */
function PhoneRow({
  brand,
  swipeOpen,
  onSwipeOpenChange,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: BrandRowProps) {
  const actionClass =
    'flex w-17 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold';
  return (
    <div data-swipe-row={brand.id}>
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
        <div className="flex items-center gap-3 rounded-3xl border border-line bg-surface-raised p-2 pr-1">
          {/* Satırın ana alanı: dokununca düzenler. (role=button: basılı tutma sürüklemesi buradan başlar) */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`${brand.name} markasını düzenle`}
            onClick={onEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit();
              }
            }}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl ${brand.active ? '' : 'opacity-50'}`}
          >
            <BrandLogo brand={brand} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold">{brand.name}</span>
              <span className="block truncate text-sm text-ink-muted">{subtitle(brand)}</span>
            </span>
          </div>
          <ToggleSwitch label={`${brand.name} aktif`} checked={brand.active} onChange={onToggle} />
        </div>
      </SwipeRow>
    </div>
  );
}

/** Masaüstü/tablet satırı: tutamak, büyük logo, ad + açıklama, ürün sayısı, anahtar, işlem düğmeleri. */
function WideRow({
  brand,
  sortable,
  sortingDisabled,
  onEdit,
  onAssign,
  onDelete,
  onToggle,
}: BrandRowProps) {
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
      {/* Masaüstünde düzenlemek için markaya ÇİFT TIKLANIR (kalem düğmesi yok). Klavye/ekran okuyucu: Enter. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${brand.name} markasını düzenle`}
        title="Düzenlemek için çift tıklayın"
        onDoubleClick={onEdit}
        onClick={(e) => {
          // detail=0: klavye ya da ekran okuyucu etkinleştirmesi (fareyle çift tıklama ayrı işlenir).
          if (e.detail === 0) onEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit();
          }
        }}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl select-none ${brand.active ? '' : 'opacity-50'}`}
      >
        <BrandLogo brand={brand} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{brand.name}</p>
          <p className="truncate text-sm text-ink-muted">
            {brand.description || 'Açıklama eklenmemiş'}
          </p>
        </div>
      </div>
      <span className="hidden shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted sm:inline">
        {brand.productCount} ürün
      </span>
      <ToggleSwitch label={`${brand.name} aktif`} checked={brand.active} onChange={onToggle} />
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onAssign}
          aria-label={`${brand.name} markasının ürünlerini yönet`}
          title="Ürünler"
          className={iconButton}
        >
          <Boxes className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${brand.name} markasını sil`}
          title="Sil"
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:bg-danger-soft"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function BrandRow(props: BrandRowProps) {
  return props.phone ? <PhoneRow {...props} /> : <WideRow {...props} />;
}
