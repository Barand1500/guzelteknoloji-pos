import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

/** Yuvarlak arama kutusu (liste ekranlarının tepesi). Doluyken temizleme düğmesi çıkar. */
export function SearchField({ value, onChange, label, placeholder = 'Ara…' }: SearchFieldProps) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-13 w-full appearance-none rounded-full border border-field-border bg-surface-raised pr-12 pl-12 text-base text-ink transition-colors outline-none placeholder:text-ink-muted hover:border-brand-500 focus:border-brand-600 focus:shadow-[0_0_0_4px_rgb(194_65_12/0.12)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Aramayı temizle"
          className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
