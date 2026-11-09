import { X } from 'lucide-react';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import type { OtherTaxEntry } from '../types';

interface OtherTaxesProps {
  /** Seçilebilecek vergiler (ilk eleman "Seçilmedi" olabilir; o listede gösterilmez). */
  options: SelectOption[];
  value: OtherTaxEntry[];
  onChange: (taxes: OtherTaxEntry[]) => void;
}

/**
 * "Diğer Vergi Ekle": açılır kutudan bir vergi seçilince yanında o verginin ORAN (%) alanı belirir
 * (ÖTV, MTV, ÖİV, Alış ÖTV, Satış ÖTV, Konaklama Vergisi…). Eklenen vergi listeden düşer; alanın
 * köşesindeki ✕ ile kaldırılır. Birden fazla vergi eklenebilir. Seçilebilir vergi kalmayınca kutu
 * pasif görünür.
 */
export function OtherTaxes({ options, value, onChange }: OtherTaxesProps) {
  const chosen = new Set(value.map((t) => t.code));
  // "Seçilmedi" (boş değer) başlangıç durumudur; gerçek vergiler eklenmemiş olanlardır.
  const available = options.filter((o) => o.value !== '' && !chosen.has(o.value));
  const nameOf = (code: string) => options.find((o) => o.value === code)?.label ?? code;

  const select: SelectOption[] = [{ value: '', label: 'Seçilmedi' }, ...available];

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="w-full sm:w-56">
        <SelectField
          label="Diğer Vergi Ekle"
          options={select}
          value=""
          onChange={(code) => {
            if (code !== '') onChange([...value, { code, rate: '' }]);
          }}
          // Eklenecek vergi kalmadıysa liste boştur; tetik yine görünür.
          searchable={false}
        />
      </div>
      {value.map((tax) => (
        <div key={tax.code} className="relative w-[calc(50%-0.375rem)] sm:w-44">
          <TextField
            label={nameOf(tax.code)}
            numeric="decimal"
            value={tax.rate}
            trailing={<span className="pr-3 text-sm font-bold text-ink-muted">%</span>}
            onChange={(e) =>
              onChange(value.map((t) => (t.code === tax.code ? { ...t, rate: e.target.value } : t)))
            }
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t.code !== tax.code))}
            aria-label={`${nameOf(tax.code)} vergisini kaldır`}
            title="Kaldır"
            className="absolute -top-2 right-3 flex size-5 items-center justify-center rounded-full bg-surface-raised text-ink-muted ring-1 ring-line transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
