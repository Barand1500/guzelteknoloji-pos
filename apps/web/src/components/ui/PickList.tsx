import { Check, Search } from 'lucide-react';
import { useState } from 'react';

export interface PickOption {
  value: string;
  label: string;
  depth?: number;
}

/**
 * Tek seçimli, aranabilir liste (açılır kutu yerine pencere içinde düz liste). Seçenekler `depth`
 * ile girintilenir (ağaç); arama yazılınca düz liste olur.
 */
export function PickList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: PickOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const shown = query
    ? options.filter((o) => o.label.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')))
    : options;
  return (
    <div className="flex flex-col gap-2">
      {options.length > 6 ? (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${label} ara…`}
            aria-label={`${label} ara`}
            className="h-11 w-full rounded-full border border-field-border bg-surface px-10 text-sm text-ink outline-none focus:border-brand-600"
          />
        </div>
      ) : null}
      <ul
        role="radiogroup"
        aria-label={label}
        className="max-h-60 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5"
      >
        {shown.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-ink-muted">Sonuç yok</li>
        ) : (
          shown.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value || 'bos'}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange(o.value)}
                  style={{ paddingLeft: `${0.75 + (query ? 0 : (o.depth ?? 0)) * 1.1}rem` }}
                  className={[
                    'flex min-h-11 w-full items-center gap-2.5 rounded-xl pr-3 text-left text-sm font-semibold transition-colors',
                    on ? 'bg-brand-50 text-brand-ink' : 'hover:bg-surface-muted',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {on ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
