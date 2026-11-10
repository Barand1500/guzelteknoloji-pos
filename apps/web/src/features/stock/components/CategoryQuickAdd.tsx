import { Check, ChevronDown, FolderTree, Plus } from 'lucide-react';
import { useState } from 'react';
import type { MultiOption } from '../../../components/ui/MultiSelectField';

interface CategoryQuickAddProps {
  /** Üst kategori olarak seçilebilecekler (ağaç sırasıyla, derinlikli). */
  categories: readonly MultiOption[];
  onCreate: (name: string, parentId: string | null) => Promise<void>;
}

/**
 * Kategori listesinin altında hızlı ekleme: önce (isteğe bağlı) üst kategori, sonra ad. Eklenen
 * kategori ürüne hemen seçili gelir. Kapalıyken tek satırlık "Yeni kategori ekle" düğmesidir.
 */
export function CategoryQuickAdd({ categories, onCreate }: CategoryQuickAddProps) {
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState('');
  const [parentOpen, setParentOpen] = useState(false);
  const parent = categories.find((c) => c.id === parentId);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim() === '' || busy) return;
    setBusy(true);
    try {
      await onCreate(name, parentId === '' ? null : parentId);
      setName('');
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-brand-ink hover:bg-brand-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          Yeni kategori ekle
        </button>
      </div>
    );

  return (
    <div
      role="group"
      aria-label="Yeni kategori"
      className="flex flex-col gap-2 border-t border-line p-3"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">
          Üst kategori <span className="font-medium normal-case">(boş olabilir)</span>
        </p>
        <button
          type="button"
          aria-expanded={parentOpen}
          aria-label="Üst kategori seç"
          onClick={() => setParentOpen((v) => !v)}
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-field-border bg-surface-raised px-3 text-left text-sm transition-colors hover:border-brand-500 aria-expanded:border-brand-600"
        >
          <FolderTree className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span
            className={`min-w-0 flex-1 truncate font-semibold ${parent ? '' : 'text-ink-muted'}`}
          >
            {parent ? parent.name : 'Üst kategori yok'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-ink-muted transition-transform duration-200 ${parentOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {parentOpen ? (
          <ul
            role="listbox"
            aria-label="Üst kategoriler"
            className="max-h-44 animate-fade-in overflow-y-auto rounded-xl border border-line bg-surface p-1"
          >
            {[{ id: '', name: 'Üst kategori yok', depth: 0 }, ...categories].map((c) => {
              const on = parentId === c.id;
              return (
                <li key={c.id || 'yok'} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setParentId(c.id);
                      setParentOpen(false);
                    }}
                    style={{ paddingLeft: `${0.625 + (c.depth ?? 0) * 1.1}rem` }}
                    className={[
                      'flex min-h-9 w-full items-center gap-2 rounded-lg pr-2 text-left text-sm transition-colors hover:bg-surface-muted',
                      on ? 'bg-brand-50 font-semibold text-brand-ink' : '',
                      c.id === '' ? 'text-ink-muted' : (c.depth ?? 0) === 0 ? 'font-semibold' : '',
                    ].join(' ')}
                  >
                    {(c.depth ?? 0) > 0 ? (
                      <span
                        aria-hidden="true"
                        className="-mt-2 inline-block h-3 w-2.5 shrink-0 rounded-bl-md border-b-2 border-l-2 border-line"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {on ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Yeni kategori adı…"
          aria-label="Yeni kategori adı"
          maxLength={100}
          className="h-10 min-w-0 flex-1 rounded-xl bg-surface-muted px-3 text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={name.trim() === '' || busy}
          aria-label="Kategoriyi ekle"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          Ekle
        </button>
      </div>
    </div>
  );
}
