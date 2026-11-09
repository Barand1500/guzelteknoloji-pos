import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

export interface MultiOption {
  id: string;
  name: string;
}

interface MultiSelectFieldProps {
  label: string;
  options: readonly MultiOption[];
  /** Seçili kimlikler. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** Hiçbiri seçili değilken tetikte yazan metin (varsayılan "Hepsi"). */
  emptyText?: string;
}

const fold = (s: string) => s.toLocaleLowerCase('tr');
/** Seçili çiplerden en çok bu kadarı gösterilir; fazlası "+N" olur (kalabalık olmasın). */
const MAX_CHIPS = 6;

/**
 * Çoklu seçimli, aranabilir açılır kutu (yüzlerce kategori/marka olsa da kullanışlı kalır).
 * Tetik düğmesi özeti yazar ("Hepsi" / "3 seçili"); açılınca arama kutusu ve kaydırılan onay
 * kutulu liste çıkar. Liste ekrandaki yerinde (satır içi) açılır; pencerede kırpılmaz. Seçilenler
 * altında silinebilir çipler olarak görünür.
 */
export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  emptyText = 'Hepsi',
}: MultiSelectFieldProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => (query ? options.filter((o) => fold(o.name).includes(fold(query))) : options),
    [options, query],
  );
  const chosen = options.filter((o) => value.includes(o.id));
  const toggle = (optionId: string) =>
    onChange(value.includes(optionId) ? value.filter((x) => x !== optionId) : [...value, optionId]);

  const summary =
    value.length === 0
      ? emptyText
      : value.length === 1
        ? (chosen[0]?.name ?? '1 seçili')
        : `${value.length} seçili`;

  return (
    <div className="flex flex-col gap-2">
      <div className="field">
        <button
          id={id}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((v) => !v)}
          className="field-input flex items-center pr-11 text-left aria-expanded:border-brand-600"
        >
          <span className={`truncate ${value.length === 0 ? 'text-ink-muted' : ''}`}>
            {summary}
          </span>
        </button>
        <label htmlFor={id} className="field-label" data-floated="true">
          {label}
        </label>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open ? (
        <div
          id={`${id}-panel`}
          role="group"
          aria-label={`${label} seçenekleri`}
          className="animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface"
        >
          <div className="relative border-b border-line p-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara…"
              aria-label={`${label} içinde ara`}
              className="h-10 w-full rounded-xl bg-surface-muted pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-muted">Sonuç yok</li>
            ) : (
              visible.map((o) => {
                const on = value.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(o.id)}
                      className={[
                        'flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors',
                        on ? 'bg-brand-50 font-semibold text-brand-ink' : 'text-ink hover:bg-surface-muted',
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
                      <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          {value.length > 0 ? (
            <div className="border-t border-line p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="min-h-9 rounded-full px-3 text-sm font-semibold text-brand-ink hover:bg-brand-50"
              >
                Seçimi Temizle
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {chosen.length > 0 ? (
        <ul aria-label={`Seçili ${label.toLocaleLowerCase('tr')}`} className="flex flex-wrap gap-2">
          {chosen.slice(0, MAX_CHIPS).map((o) => (
            <li
              key={o.id}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm font-semibold text-brand-ink"
            >
              {o.name}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                aria-label={`${o.name} seçimini kaldır`}
                className="inline-flex size-7 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {chosen.length > MAX_CHIPS ? (
            <li className="inline-flex min-h-9 items-center px-2 text-sm font-semibold text-ink-muted">
              +{chosen.length - MAX_CHIPS}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
