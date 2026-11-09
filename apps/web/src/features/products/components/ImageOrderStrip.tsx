import { X } from 'lucide-react';
import { SortableGrid } from '../../../components/ui/SortableGrid';
import { HoverZoomImage } from './HoverZoomImage';

/** Bir ürünün görsel şeridindeki tek kutucuk: ya mevcut (kayıtlı) ya da yeni yüklenecek görsel. */
export interface ImageTile {
  /** `e:<adres>` (mevcut) ya da `n:<dosya kimliği>` (yeni). */
  key: string;
  url: string;
  name: string;
  existing: boolean;
}

interface ImageOrderStripProps {
  productName: string;
  tiles: ImageTile[];
  /** true: mevcut görseller kilitlidir (sunucu henüz mevcut görsellerin sırasını değiştirmiyor). */
  lockExisting: boolean;
  onReorder: (tiles: ImageTile[]) => void;
  onRemove: (tile: ImageTile) => void;
}

const IMG = 'size-16 rounded-2xl border border-line bg-surface-muted object-cover';

/**
 * Bir ürünün görselleri tek şeritte: mevcut görseller (silinmiyorsa) ve yeni yüklenecekler yan
 * yana durur; basılı tutup (fareyle tutup çekerek) sürükleyerek ya da klavyede Alt + ok ile
 * sıralanır. Şeridin ilk görseli vitrin resmidir ("Vitrin" etiketi). Yeni görsel ✕ ile çıkarılır.
 */
export function ImageOrderStrip({
  productName,
  tiles,
  lockExisting,
  onReorder,
  onRemove,
}: ImageOrderStripProps) {
  const label = (t: ImageTile) => (t.existing ? 'Mevcut görsel' : t.name);
  const vitrin = (index: number) =>
    index === 0 ? (
      <span className="absolute bottom-1 left-1 rounded-md bg-accent px-1.5 text-[0.625rem] font-extrabold text-ink">
        Vitrin
      </span>
    ) : null;

  const locked = lockExisting ? tiles.filter((t) => t.existing) : [];
  const movable = lockExisting ? tiles.filter((t) => !t.existing) : tiles;

  return (
    <div className="flex flex-wrap items-start gap-2" aria-label={`${productName} görselleri`}>
      {locked.map((t, index) => (
        <div key={t.key} className="relative">
          <HoverZoomImage src={t.url} alt={label(t)} className={IMG} />
          {vitrin(index)}
        </div>
      ))}
      <SortableGrid
        label={`${productName} görsel sırası`}
        items={movable}
        getId={(t) => t.key}
        getLabel={label}
        onReorder={(next) => onReorder([...locked, ...next])}
        className="flex flex-wrap gap-2"
        renderItem={(t, ctx) => (
          <div
            role="button"
            tabIndex={0}
            aria-label={`${label(t)} (sürükleyerek sırala)`}
            {...ctx.keyboardProps}
            className="relative cursor-grab touch-none select-none active:cursor-grabbing"
          >
            <HoverZoomImage src={t.url} alt={label(t)} className={IMG} />
            {vitrin(locked.length + ctx.index)}
            {t.existing ? null : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ctx.wasDragged()) onRemove(t);
                }}
                aria-label={`${t.name} dosyasını kaldır`}
                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-surface shadow-soft"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
