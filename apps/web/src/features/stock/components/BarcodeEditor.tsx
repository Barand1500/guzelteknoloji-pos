import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { uid } from '../stock.rules';
import type { BarcodeEntry } from '../types';

interface BarcodeEditorProps {
  barcodes: BarcodeEntry[];
  types: SelectOption[];
  onChange: (barcodes: BarcodeEntry[]) => void;
}

/**
 * Bir birimin barkodları. Tür seç + barkodu yaz + (+) ile ekle; eklenenler altta etiket olarak
 * görünür ve (×) ile silinir. İlk eklenen ana barkoddur. Ayrı pencere açılmaz.
 */
export function BarcodeEditor({ barcodes, types, onChange }: BarcodeEditorProps) {
  const [type, setType] = useState('EAN13');
  const [code, setCode] = useState('');

  const add = () => {
    const value = code.trim();
    if (!value) return;
    onChange([...barcodes, { id: uid(), type, code: value }]);
    setCode('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-2">
        <SelectField label="Barkod Türü" options={types} value={type} onChange={setType} />
        <TextField
          label="Barkod"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={code.trim() === ''}
          aria-label="Barkod Ekle"
          className="inline-flex size-14 items-center justify-center rounded-control bg-brand-700 text-white transition-opacity disabled:opacity-40"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>

      {barcodes.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Eklenen barkodlar">
          {barcodes.map((b, index) => (
            <li
              key={b.id}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-muted py-1 pr-1 pl-3 text-sm"
            >
              <span className="font-semibold text-ink-muted">
                {b.type === 'none' ? 'Barkod' : b.type}
              </span>
              <span className="font-mono text-ink">{b.code}</span>
              {index === 0 ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-ink">
                  Ana
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`${b.code} barkodunu sil`}
                onClick={() => onChange(barcodes.filter((x) => x.id !== b.id))}
                className="inline-flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
