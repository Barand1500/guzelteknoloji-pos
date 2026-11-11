import { Check, CircleAlert, Eye, Pencil, Plus, ScanBarcode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState('');
  const editOriginal = useRef<{ code: string; type: string } | null>(null);
  const lock = useRef(false);
  const check = useDuplicateCheck();

  const cancelEdit = () => {
    const original = editOriginal.current;
    if (editingId && original) {
      setEditCode(original.code);
      setEditType(original.type);
    }
    editOriginal.current = null;
    setEditingId(null);
    setError('');
  };

  useEffect(() => {
    if (!editingId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      cancelEdit();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  });

  const add = async () => {
    const value = code.trim();
    if (!value || lock.current) return;
    setError('');
    if (
      barcodes.some((b) => b.code.toLocaleLowerCase('en-US') === value.toLocaleLowerCase('en-US'))
    ) {
      setError('Bu barkod zaten eklenmiş.');
      inputRef.current?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const hit = await check?.({ code: '', barcode: value });
      if (hit?.barcode) {
        setError(`Bu barkod kullanılıyor: ${hit.barcode.name || hit.barcode.code}`);
        inputRef.current?.focus();
        return;
      }
      onChange([...barcodes, { id: uid(), type, code: value }]);
      // Art arda giriş için odak inputta kalır; kullanıcı bu arada yeni bir şey yazdıysa silinmez.
      setCode((current) => (current === value ? '' : current));
      inputRef.current?.focus();
    } catch {
      setError('Barkod kontrol edilemedi. Tekrar deneyin.');
      inputRef.current?.focus();
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
            ref={inputRef}
            inputMode="numeric"
            value={code}
            className={`rounded-r-none! sm:rounded-none! ${barcodes.length > 0 ? 'pr-24!' : ''}`}
            readOnly={busy}
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
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger ${viewing ? 'hidden' : ''}`}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-danger text-white">
            <CircleAlert className="size-4" aria-hidden="true" />
          </span>
          {error}
        </div>
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
        <Sheet
          open
          size="lg"
          title="Barkodlar"
          description="Kod türünü ve barkodu düzenlemek için satıra çift tıklayın."
          onClose={() => setViewing(false)}
        >
          <div className="mb-3 grid grid-cols-[2rem_6rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-surface-muted px-3 py-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
            <span>#</span>
            <span>Tür</span>
            <span>Barkod</span>
            <span>Durum</span>
            <span className="sr-only">İşlemler</span>
          </div>
          {error && (
            <div
              role="alert"
              className="mb-3 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                <CircleAlert className="size-4" aria-hidden="true" />
              </span>
              {error}
            </div>
          )}
          <ul className="flex flex-col gap-2" aria-label="Eklenen barkodlar">
            {barcodes.map((b, index) => (
              <li
                key={b.id}
                role="listitem"
                tabIndex={0}
                aria-label={`Barkod ${index + 1}: ${b.code}`}
                onDoubleClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, input, [role="combobox"]'))
                    return;
                  editOriginal.current = { code: b.code, type: b.type };
                  setEditingId(b.id);
                  setEditCode(b.code);
                  setEditType(b.type);
                }}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && editingId !== b.id) {
                    event.preventDefault();
                    editOriginal.current = { code: b.code, type: b.type };
                    setEditingId(b.id);
                    setEditCode(b.code);
                    setEditType(b.type);
                  }
                }}
                className="grid min-h-16 grid-cols-[2rem_6rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm transition-colors hover:border-line-strong"
              >
                <span className="text-center text-xs font-bold text-ink-muted">{index + 1}</span>
                {editingId === b.id ? (
                  <>
                    <SelectField
                      label="Tür"
                      options={types}
                      value={editType}
                      onChange={setEditType}
                    />
                    <TextField
                      label="Barkod"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget
                            .closest('li')
                            ?.querySelector<HTMLButtonElement>('[aria-label="Barkodu kaydet"]')
                            ?.click();
                        }
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Barkodu kaydet"
                      className="rounded-full p-2 text-brand-ink hover:bg-brand-50"
                      onClick={() => {
                        const normalized = editCode.trim();
                        if (
                          !normalized ||
                          barcodes.some(
                            (x) =>
                              x.id !== b.id &&
                              x.code.toLocaleLowerCase('en-US') ===
                                normalized.toLocaleLowerCase('en-US'),
                          )
                        ) {
                          setError('Bu barkod zaten eklenmiş veya boş.');
                          return;
                        }
                        onChange(
                          barcodes.map((x) =>
                            x.id === b.id ? { ...x, code: normalized, type: editType } : x,
                          ),
                        );
                        editOriginal.current = null;
                        setEditingId(null);
                        setError('');
                      }}
                    >
                      <Check className="size-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Barkod düzenlemeyi iptal et"
                      className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                      onClick={() => {
                        cancelEdit();
                      }}
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-ink-muted">
                      {b.type === 'none' ? 'Barkod' : b.type}
                    </span>
                    <span className="min-w-0 break-all font-mono text-ink">{b.code}</span>
                    {index === 0 ? (
                      <span className="justify-self-start rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-ink">
                        Ana
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`${b.code} düzenle`}
                        title="Çift tıklayarak da düzenleyebilirsiniz"
                        onClick={() => {
                          editOriginal.current = { code: b.code, type: b.type };
                          setEditingId(b.id);
                          setEditCode(b.code);
                          setEditType(b.type);
                        }}
                        className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${b.code} barkodunu sil`}
                        onClick={() => onChange(barcodes.filter((x) => x.id !== b.id))}
                        className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {barcodes.length === 0 && <p className="text-sm text-ink-muted">Eklenen barkod yok.</p>}
        </Sheet>
      ) : null}
    </div>
  );
}
