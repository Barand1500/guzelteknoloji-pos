import { Check } from 'lucide-react';

interface ToggleChipProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Küçük, satır içi aç/kapa hapı (ör. "Ana Birim"). Açıkken tik ve vurgu rengi alır. */
export function ToggleChip({ label, checked, onChange }: ToggleChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-200',
        checked
          ? 'border-brand-600 bg-brand-50 text-brand-ink'
          : 'border-field-border text-ink-muted hover:border-brand-500 hover:text-ink',
      ].join(' ')}
    >
      {checked ? <Check className="size-4" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
