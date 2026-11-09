import { Plus } from 'lucide-react';
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
      <label className="flex flex-col gap-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
        Üst kategori (boş olabilir)
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="h-10 w-full rounded-xl border border-field-border bg-surface-raised px-3 text-sm font-normal tracking-normal text-ink normal-case outline-none focus:border-brand-600"
        >
          <option value="">Üst kategori yok</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {`${'— '.repeat(c.depth ?? 0)}${c.name}`}
            </option>
          ))}
        </select>
      </label>
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
