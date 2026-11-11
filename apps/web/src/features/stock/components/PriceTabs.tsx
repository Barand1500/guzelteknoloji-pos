import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SelectOption } from '../../../components/ui/SelectField';

interface PriceTabsProps {
  lists: SelectOption[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
}

/**
 * Fiyat adı sekmeleri (FİYAT, PERAKENDE, TOPTAN…). Sondaki "+" satır içinde bir yazı kutusuna
 * dönüşür: adı yaz, Enter'a bas — yeni sekme hazır. Ayrı pencere açılmaz.
 */
export function PriceTabs({
  lists,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onRename,
}: PriceTabsProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const finishingEdit = useRef(false);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const finish = (commit: boolean) => {
    const label = text.trim();
    if (commit && label) onAdd(label);
    setText('');
    setAdding(false);
  };

  return (
    <div role="tablist" aria-label="Fiyat adı" className="flex flex-wrap items-center gap-2">
      {lists.map((list) => {
        const active = list.value === activeId;
        const finishEdit = (commit: boolean) => {
          if (finishingEdit.current) return;
          finishingEdit.current = true;
          const label = text.trim();
          if (commit && label && label !== list.label) onRename(list.value, label);
          setEditing(null);
          setText('');
        };
        return (
          <span
            key={list.value}
            className={[
              'inline-flex items-center rounded-full transition-colors duration-200',
              active ? 'bg-brand-700 text-white shadow-soft' : 'bg-surface-muted text-ink',
            ].join(' ')}
          >
            {editing === list.value ? (
              <input
                autoFocus
                value={text}
                aria-label={`${list.label} fiyat adını düzenle`}
                className="h-10 w-36 rounded-full bg-surface-muted px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-600/40"
                onChange={(e) => setText(e.target.value)}
                onBlur={() => finishEdit(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEdit(true);
                  }
                  if (e.key === 'Escape') finishEdit(false);
                }}
              />
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onDoubleClick={() => {
                  finishingEdit.current = false;
                  setText(list.label);
                  setEditing(list.value);
                }}
                onClick={() => onSelect(list.value)}
                title="Çift tıklayarak fiyat adını düzenleyin"
                className={[
                  'min-h-10 rounded-full pl-4 text-sm font-bold tracking-wide',
                  list.removable ? 'pr-1' : 'pr-4',
                ].join(' ')}
              >
                {list.label}
              </button>
            )}
            {list.removable ? (
              <button
                type="button"
                aria-label={`${list.label} fiyat adını sil`}
                onClick={() => onRemove(list.value)}
                className="mr-1 inline-flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        );
      })}

      {adding ? (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => finish(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finish(true);
            } else if (e.key === 'Escape') {
              finish(false);
            }
          }}
          placeholder="Yeni fiyat adı…"
          aria-label="Yeni fiyat adı"
          className="h-10 w-44 rounded-full bg-surface-muted px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-brand-600/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Fiyat Adı Ekle"
          className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-line-strong/60 text-brand-ink transition-colors hover:bg-brand-50"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
