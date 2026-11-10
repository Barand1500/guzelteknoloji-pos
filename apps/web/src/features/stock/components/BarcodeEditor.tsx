import { Eye, Plus, ScanBarcode, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Sheet } from '../../../components/ui/Sheet';
import { useDuplicateCheck } from '../duplicate-check';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { uid } from '../stock.rules';
import type { BarcodeEntry } from '../types';
import { BarcodeScanSheet } from './BarcodeScanSheet';
import { DuplicateNote } from './DuplicateNote';

interface BarcodeEditorProps {
  barcodes: BarcodeEntry[];
  types: SelectOption[];
  onChange: (barcodes: BarcodeEntry[]) => void;
}

/** Barkod girişi; kayıtlı barkodlar göz düğmesiyle açılan pencerede yönetilir. */
export function BarcodeEditor({ barcodes, types, onChange }: BarcodeEditorProps) {
  const [type, setType] = useState('EAN13');
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const check = useDuplicateCheck();

  const add = async () => {
    const value = code.trim();
    if (!value || lock.current) return;
    setError('');
    if (
      barcodes.some((b) => b.code.toLocaleLowerCase('en-US') === value.toLocaleLowerCase('en-US'))
    ) {
      setError('Bu barkod zaten eklenmiş.');
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const hit = await check?.({ code: '', barcode: value });
      if (hit?.barcode) {
        setError(`Bu barkod kullanılıyor: ${hit.barcode.name || hit.barcode.code}`);
        return;
      }
      onChange([...barcodes, { id: uid(), type, code: value }]);
      setCode('');
    } catch {
      setError('Barkod kontrol edilemedi. Tekrar deneyin.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Giriş grubu: tür + barkod + (+) tek parça görünür (bitişik, ortak köşeler). */}
      <div
        role="group"
        aria-label="Barkod ekle"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-y-3 sm:flex sm:items-start"
      >
        <div className="col-span-2 min-w-0 focus-within:z-10 sm:w-28 sm:shrink-0">
          <SelectField
            label="Barkod Türü"
            options={types}
            value={type}
            onChange={setType}
            className="sm:rounded-r-none!"
          />
        </div>
        <div className="relative min-w-0 flex-1 focus-within:z-10 sm:-ml-px">
          <TextField
            label="Barkod"
            inputMode="numeric"
            value={code}
            className={`rounded-r-none! sm:rounded-none! ${barcodes.length > 0 ? 'pr-24!' : ''}`}
            disabled={busy}
            onChange={(e) => setCode(e.target.value)}
            trailing={
              <span className="flex items-center">
                <button
                  type="button"
                  onClick={() => setScanning(true)}
                  aria-label="Kamerayla barkod oku"
                  title="Kamerayla barkod oku"
                  className="mr-1 inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-ink"
                >
                  <ScanBarcode className="size-5" aria-hidden="true" />
                </button>
                {barcodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewing(true)}
                    aria-label={`Barkodları görüntüle (${barcodes.length})`}
                    className="mr-1 inline-flex size-10 items-center justify-center rounded-full text-brand-ink hover:bg-brand-50"
                  >
                    <Eye className="size-5" aria-hidden="true" />
                  </button>
                )}
              </span>
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || code.trim() === ''}
          aria-label="Barkod Ekle"
          className="-ml-px inline-flex size-14 shrink-0 items-center justify-center rounded-r-control bg-brand-700 text-white transition-opacity disabled:opacity-40"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>

      <DuplicateNote kind="barcode" value={code} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {scanning ? (
        <BarcodeScanSheet
          typeValues={types.map((t) => t.value)}
          onClose={() => setScanning(false)}
          onUse={(value, scannedType) => {
            setCode(value);
            if (scannedType) setType(scannedType);
            setScanning(false);
          }}
        />
      ) : null}

      {viewing ? (
        <Sheet open title="Barkodlar" onClose={() => setViewing(false)}>
          <ul className="flex flex-col gap-2" aria-label="Eklenen barkodlar">
            {barcodes.map((b, index) => (
              <li
                key={b.id}
                className="inline-flex min-h-9 items-center gap-2 rounded-full bg-surface-muted py-1 pr-1 pl-3 text-sm"
              >
                <span className="font-semibold text-ink-muted">
                  {b.type === 'none' ? 'Barkod' : b.type}
                </span>
                <span className="min-w-0 break-all font-mono text-ink">{b.code}</span>
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
          {barcodes.length === 0 && <p className="text-sm text-ink-muted">Eklenen barkod yok.</p>}
        </Sheet>
      ) : null}
    </div>
  );
}
