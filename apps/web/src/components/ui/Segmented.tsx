import type { SelectOption } from './SelectField';

interface SegmentedProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
}

/** Az seçenekli (2-4) tercihler için yumuşak, hap şeklinde seçici. */
export function Segmented({ label, value, options, onChange }: SegmentedProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-surface-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              'min-h-10 flex-1 rounded-full px-4 text-sm font-semibold transition-all duration-200',
              active
                ? 'bg-surface-raised text-brand-ink shadow-soft'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
