import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: readonly SelectOption[];
}

/**
 * Yüzen etiketli seçim kutusu. Tarayıcının kendi seçicisini kullanır: telefonda sistem
 * seçicisi açılır (en kolay kullanım), klavye ve ekran okuyucu desteği hazırdır.
 * Görünüm `index.css` içindeki .field-* sınıflarından gelir.
 */
export function SelectField({ label, options, id, className = '', ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="field">
      <select id={selectId} className={`field-input field-select ${className}`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor={selectId} className="field-label" data-floated="true">
        {label}
      </label>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}
