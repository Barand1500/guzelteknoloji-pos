import { Pencil } from 'lucide-react';
import type { SortableTileContext } from '../../../components/ui/SortableGrid';
import type { AttrValue, ValueKind } from '../types';

interface ValueTileProps {
  value: AttrValue;
  kind: ValueKind;
  sortable: SortableTileContext;
  onEdit: () => void;
  /** Resme çift tıklama (resimli gruplar): düzenleme penceresi resim seçici açık olarak gelir. */
  onEditImage?: (() => void) | undefined;
}

/**
 * Özellik çipi: renk kutusu / küçük resim / yalnızca yazı. Dokununca (ya da Enter) düzenler.
 * Basılı tutup sürükleyerek (fareyle tutup çekerek, klavyede Alt + ok) sıralanır.
 */
export function ValueTile({ value, kind, sortable, onEdit, onEditImage }: ValueTileProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${value.name} özelliğini düzenle`}
      {...sortable.keyboardProps}
      onClick={() => {
        if (!sortable.wasDragged()) onEdit();
      }}
      onKeyDown={(e) => {
        sortable.keyboardProps.onKeyDown(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-2.5 text-left transition-colors select-none hover:border-brand-500/60"
    >
      {kind === 'color' ? (
        <span
          aria-hidden="true"
          className="size-9 shrink-0 rounded-xl ring-1 ring-black/15"
          style={{ backgroundColor: value.color ?? '#9ca3af' }}
        />
      ) : null}
      {kind === 'image' ? (
        value.imageUrl ? (
          // Resme tek tıklama bir şey yapmaz; çift tıklama resim yüklemeyi açar.
          <span
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditImage?.();
            }}
            title="Resmi değiştirmek için çift tıklayın"
            className="shrink-0"
          >
            <img
              src={value.imageUrl}
              alt=""
              className="size-9 rounded-xl bg-white object-contain ring-1 ring-line"
            />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-field-border text-[0.625rem] font-bold text-ink-muted"
          >
            Resim
          </span>
        )
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{value.name}</span>
        <span className="block truncate text-xs text-ink-muted">{value.code}</span>
      </span>
      <Pencil
        className="size-4 shrink-0 text-ink-muted opacity-60 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </div>
  );
}
