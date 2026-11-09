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
 * Bir birimin barkodları: tür + barkod + (+) tek giriş grubudur (birim ve çarpanın yanında durur); eklenenler altta etiket olarak
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
      {/* Giriş grubu: tür + barkod + (+) tek parça görünür (bitişik, ortak köşeler). */}
      <div role="group" aria-label="Barkod ekle" className="flex items-start">
        <div className="w-28 shrink-0 focus-within:z-10 sm:w-36">
          <SelectField
            label="Barkod Türü"
            options={types}
            value={type}
            onChange={setType}
            className="rounded-r-none!"
          />
        </div>
        <div className="relative -ml-px min-w-0 flex-1 focus-within:z-10">
          <TextField
            label="Barkod"
            inputMode="numeric"
            value={code}
            className="rounded-none!"
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={code.trim() === ''}
          aria-label="Barkod Ekle"
          className="-ml-px inline-flex size-14 shrink-0 items-center justify-center rounded-r-control bg-brand-700 text-white transition-opacity disabled:opacity-40"
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
