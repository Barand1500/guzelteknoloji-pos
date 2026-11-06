import { EyeOff, FolderTree, MoreVertical } from 'lucide-react';
import type { SortableTileContext } from '../../../components/ui/SortableGrid';
import type { Category } from '../types';
import { CategoryImage } from './CategoryImage';

interface CategoryTileProps {
  category: Category;
  sortable: SortableTileContext;
  /** Arama sonuçlarında "Ana › Alt" yolu gösterilir. */
  pathText?: string | undefined;
  onOpen: () => void;
  onMenu: () => void;
}

export const categorySubtitle = (c: Category) => {
  const parts = [
    c.childCount > 0 ? `${c.childCount} alt kategori` : null,
    `${c.productCount} ürün`,
    c.active ? null : 'Pasif',
  ];
  return parts.filter(Boolean).join(' · ');
};

/**
 * Görsel kutucuk: dokununca kategorinin içine girer; ⋮ düğmesi işlemleri açar. Telefonda basılı
 * tutup sürükleyerek, fareyle tutup çekerek, klavyede Alt + ok tuşlarıyla sıralanır.
 */
export function CategoryTile({ category, sortable, pathText, onOpen, onMenu }: CategoryTileProps) {
  return (
    <div className="relative h-full rounded-3xl border border-line bg-surface-raised p-2.5 transition-colors hover:border-brand-500/60">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${category.name} kategorisini aç`}
        {...sortable.keyboardProps}
        onClick={() => {
          if (!sortable.wasDragged()) onOpen();
        }}
        onKeyDown={(e) => {
          sortable.keyboardProps.onKeyDown(e);
          if (e.defaultPrevented) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex cursor-pointer flex-col gap-2 rounded-2xl select-none focus-visible:outline-offset-4"
      >
        <span className={`relative block ${category.active ? '' : 'opacity-50 grayscale'}`}>
          <CategoryImage category={category} className="aspect-[4/3] w-full rounded-2xl text-3xl" />
          {category.childCount > 0 ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-surface">
              <FolderTree className="size-3.5" aria-hidden="true" />
              {category.childCount}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 px-1 pb-1">
          <span className="flex items-center gap-1.5">
            <span className="block truncate text-[0.9375rem] font-bold">{category.name}</span>
            {category.hidden ? (
              <EyeOff
                className="size-4 shrink-0 text-ink-muted"
                aria-label="Mağazada gizli"
                role="img"
              />
            ) : null}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {pathText ?? categorySubtitle(category)}
          </span>
        </span>
      </div>
      <button
        type="button"
        data-no-drag
        onClick={onMenu}
        aria-label={`${category.name} işlemleri`}
        className="absolute top-3.5 right-3.5 inline-flex size-9 items-center justify-center rounded-full bg-surface-raised/90 text-ink shadow-soft backdrop-blur transition-colors hover:bg-brand-50 hover:text-brand-ink"
      >
        <MoreVertical className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
