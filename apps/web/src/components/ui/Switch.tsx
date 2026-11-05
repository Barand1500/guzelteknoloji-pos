interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Aç/kapa anahtarı; etiketin tamamı tıklanabilir (büyük dokunma alanı). */
export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-control border border-field-border px-4 text-left transition-colors hover:border-brand-500"
    >
      <span className="text-base font-medium text-ink">{label}</span>
      <span
        aria-hidden="true"
        className={[
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-line-strong/50',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft transition-transform duration-200',
            checked ? 'translate-x-5' : '',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
