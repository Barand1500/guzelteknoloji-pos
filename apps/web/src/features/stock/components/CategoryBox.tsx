import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SearchField } from '../../../components/ui/SearchField';
import { flattenTree } from '../../categories/tree';
import type { Category } from '../../categories/types';

interface CategoryBoxProps {
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Kategori kutusunun içeriği: seçilenler çip olarak üstte (✕ ile kaldırılır), altında aranabilir
 * kutucuklu ağaç. Seçim anında uygulanır; ayrı bir "Tamam" düğmesi yoktur. Ürün birden çok
 * kategoride olabilir; üst kategoriyi seçmek altlarını kendiliğinden seçmez.
 */
export function CategoryBox({ categories, selectedIds, onToggle }: CategoryBoxProps) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => flattenTree(categories), [categories]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const searching = query.trim() !== '';
  const visible = searching
    ? rows.filter(({ category }) => fold(category.name).includes(fold(query.trim())))
    : rows;

  return (
    <div className="flex flex-col gap-3">
      {selectedIds.length > 0 ? (
        <ul aria-label="Seçili kategoriler" className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const name = byId.get(id)?.name ?? id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  aria-label={`${name} kategorisini kaldır`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-700 px-3 text-xs font-bold text-white"
                >
                  {name}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <SearchField
        value={query}
        onChange={setQuery}
        label="Kategori ara"
        placeholder="Kategori ara…"
      />

      {visible.length === 0 ? (
        <p className="px-2 text-sm text-ink-muted">
          {categories.length === 0
            ? 'Henüz kategori yok. Kategoriler ekranından ekleyebilirsin.'
            : 'Eşleşen kategori yok.'}
        </p>
      ) : (
        <ul
          aria-label="Kategoriler"
          className="max-h-64 overflow-y-auto rounded-2xl border border-line bg-surface p-1"
        >
          {visible.map(({ category, depth }) => {
            const on = selectedIds.includes(category.id);
            return (
              <li key={category.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${category.name} kategorisini seç`}
                  onClick={() => onToggle(category.id)}
                  style={{ paddingLeft: `${0.5 + (searching ? 0 : depth) * 1.1}rem` }}
                  className={[
                    'flex min-h-10 w-full items-center gap-2.5 rounded-xl pr-2 text-left text-sm font-semibold transition-colors',
                    on ? 'bg-brand-50 text-brand-ink' : 'hover:bg-brand-50',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={[
                      'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-field-border',
                    ].join(' ')}
                  >
                    {on ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="truncate">{category.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
