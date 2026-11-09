import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OtherTaxEntry } from '../types';

interface OtherTaxesProps {
  /** Seçilebilecek vergiler (boş değerli "Seçilmedi" elemanı listede gösterilmez). */
  options: SelectOption[];
  value: OtherTaxEntry[];
  onChange: (taxes: OtherTaxEntry[]) => void;
}

/**
 * "Diğer Vergi Ekle": çoklu seçimli açılır kutu. Liste aşağı doğru açılır; her vergi tıklanınca
 * işaretlenir (✓) ve yanında ORAN (%) alanı belirir, tekrar tıklanınca işaret kalkar ve alan
 * kaybolur. Oran alanları kutuyla aynı satırda dizilir (dört sütun).
 */
export function OtherTaxes({ options, value, onChange }: OtherTaxesProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const taxes = options.filter((o) => o.value !== '');
  const chosen = new Set(value.map((t) => t.code));
  const nameOf = (code: string) => taxes.find((o) => o.value === code)?.label ?? code;

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (code: string) =>
    onChange(
      chosen.has(code) ? value.filter((t) => t.code !== code) : [...value, { code, rate: '' }],
    );

  const summary =
    value.length === 0
      ? 'Seçilmedi'
      : value.length === 1
        ? nameOf(value[0]!.code)
        : `${value.length} vergi seçili`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div ref={root} className="relative">
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
            Diğer Vergi Ekle
          </label>
          <ChevronDown
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>

        {open ? (
          <ul
            id={`${id}-panel`}
            aria-label="Diğer vergiler"
            className="animate-fade-in absolute top-full left-0 z-30 mt-2 max-h-64 w-full min-w-56 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-soft"
          >
            {taxes.map((o) => {
              const on = chosen.has(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(o.value)}
                    className={[
                      'flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors',
                      on
                        ? 'bg-brand-50 font-semibold text-brand-ink'
                        : 'text-ink hover:bg-surface-muted',
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
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {value.map((tax) => (
        <TextField
          key={tax.code}
          label={`${nameOf(tax.code)} Oranı`}
          numeric="decimal"
          value={tax.rate}
          trailing={<span className="pr-3 text-sm font-bold text-ink-muted">%</span>}
          onChange={(e) =>
            onChange(value.map((t) => (t.code === tax.code ? { ...t, rate: e.target.value } : t)))
          }
        />
      ))}
    </div>
  );
}
