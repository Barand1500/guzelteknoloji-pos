import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SortableTileContext } from '../../../components/ui/SortableGrid';
import type { AttrValue, ValueKind } from '../types';

/** Çip üzerinde doğrudan değiştirilebilen alanlar. */
export interface ValuePatch {
  name?: string;
  color?: string | null;
  imageUrl?: string | null;
}

interface ValueTileProps {
  value: AttrValue;
  kind: ValueKind;
  sortable: SortableTileContext;
  /** Değişikliği kaydeder; hata varsa mesaj döndürür (çip düzenlemede kalır), yoksa null. */
  onUpdate: (patch: ValuePatch) => Promise<string | null>;
  onDelete: () => void;
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Özellik çipi: renk kutusu / küçük resim / yalnızca yazı. Pencere AÇILMAZ, çift tıklayınca
 * doğrudan yerinde değişir: ada çift tıklayınca ad kutuya döner (Enter/odak kaybı kaydeder, Esc
 * vazgeçer); renk kutusuna çift tıklayınca renk seçici, resme çift tıklayınca dosya seçici açılır.
 * Sağdaki çöp kutusu özelliği siler (onay sorulur). Basılı tutup sürükleyerek (klavyede Alt + ok)
 * sıralanır.
 */
export function ValueTile({ value, kind, sortable, onUpdate, onDelete }: ValueTileProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.name);
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const colorInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);
  const latestUpdate = useRef(onUpdate);
  useEffect(() => {
    latestUpdate.current = onUpdate;
  });

  useEffect(() => {
    if (editing) {
      nameInput.current?.focus();
      nameInput.current?.select();
    }
  }, [editing]);

  // Renk seçici kapanınca (change) kaydedilir; sürüklerken (input) her harekette kaydedilmez.
  useEffect(() => {
    const input = colorInput.current;
    if (!input) return;
    const commit = () => void latestUpdate.current({ color: input.value });
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, [kind]);

  const startEdit = () => {
    finishing.current = false;
    setDraft(value.name);
    setError(null);
    setEditing(true);
  };

  const finish = async (save: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    const name = draft.trim();
    if (!save || name === '' || name === value.name) {
      setEditing(false);
      setError(null);
      return;
    }
    const message = await onUpdate({ name });
    if (message) {
      setError(message);
      finishing.current = false;
      nameInput.current?.focus();
      return;
    }
    setEditing(false);
  };

  const takeImage = (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError('Yalnızca PNG, JPG, WebP veya SVG.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Resim en çok 2 MB olabilir.');
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string')
        void onUpdate({ imageUrl: reader.result }).then((m) => m && setError(m));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${value.name} özelliğini düzenle`}
      title="Düzenlemek için çift tıklayın"
      {...sortable.keyboardProps}
      onDoubleClick={() => {
        if (!sortable.wasDragged() && !editing) startEdit();
      }}
      onKeyDown={(e) => {
        if (editing) return;
        sortable.keyboardProps.onKeyDown(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          startEdit();
        }
      }}
      className={[
        'group flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border bg-surface-raised px-3 py-2.5 text-left transition-colors select-none',
        error ? 'border-danger' : 'border-line hover:border-brand-500/60',
      ].join(' ')}
    >
      {kind === 'color' ? (
        <span
          role="presentation"
          onDoubleClick={(e) => {
            e.stopPropagation();
            colorInput.current?.click();
          }}
          title="Rengi değiştirmek için çift tıklayın"
          className="relative shrink-0"
        >
          <span
            aria-hidden="true"
            className="block size-9 rounded-xl ring-1 ring-black/15"
            style={{ backgroundColor: value.color ?? '#9ca3af' }}
          />
          <input
            ref={colorInput}
            type="color"
            value={value.color ?? '#9ca3af'}
            onChange={() => undefined}
            tabIndex={-1}
            aria-label={`${value.name} rengi`}
            className="sr-only"
          />
        </span>
      ) : null}
      {kind === 'image' ? (
        <span
          role="presentation"
          onDoubleClick={(e) => {
            e.stopPropagation();
            fileInput.current?.click();
          }}
          title="Resmi değiştirmek için çift tıklayın"
          className="shrink-0"
        >
          {value.imageUrl ? (
            <img
              src={value.imageUrl}
              alt=""
              className="size-9 rounded-xl bg-white object-contain ring-1 ring-line"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl border border-dashed border-field-border text-[0.625rem] font-bold text-ink-muted"
            >
              Resim
            </span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            tabIndex={-1}
            aria-label={`${value.name} resmi seç`}
            className="sr-only"
            onChange={(e) => {
              takeImage(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={nameInput}
            value={draft}
            aria-label={`${value.name} özellik adı`}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={() => void finish(true)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                void finish(true);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                void finish(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            maxLength={100}
            className="h-9 w-full rounded-lg border border-brand-600 bg-surface px-2 text-sm font-bold outline-none"
          />
        ) : (
          <span className="block truncate text-sm font-bold">{value.name}</span>
        )}
        {error ? <span className="block truncate text-xs text-danger">{error}</span> : null}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!sortable.wasDragged()) onDelete();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-label={`${value.name} özelliğini sil`}
        title="Sil"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
