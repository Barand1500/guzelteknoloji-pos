import { useEffect, useState } from 'react';
import { Layers3, Plus, Trash2 } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { apiRequest } from '../../../lib/http';
import { dataError } from '../../../lib/catalog-data';
import type { AttributeSnapshot } from '../../attributes/services/attribute.demo';

interface Variant {
  code: string;
  barcode: string;
  price: string;
  quantity: string;
  valueIds: string[];
}
export function VariantEditor({
  cardId,
  attributes,
  selectedIds,
  disabled,
}: {
  cardId: string;
  attributes: AttributeSnapshot;
  selectedIds: string[];
  disabled: boolean;
}) {
  const [rows, setRows] = useState<Variant[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const path = `/api/stok/kartlar/${encodeURIComponent(cardId)}/varyantlar`;
  useEffect(() => {
    let active = true;
    void apiRequest<Variant[]>(path)
      .then((data) => {
        if (active) {
          setRows(data);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(dataError(e));
      });
    return () => {
      active = false;
    };
  }, [path]);
  const groups = attributes.groups.filter(
    (g) =>
      g.variant && attributes.values.some((v) => v.groupId === g.id && selectedIds.includes(v.id)),
  );
  const valueName = (id: string) => attributes.values.find((v) => v.id === id)?.name ?? id;
  const generate = () => {
    let combinations: string[][] = [[]];
    for (const group of groups) {
      const ids = attributes.values
        .filter((v) => v.groupId === group.id && selectedIds.includes(v.id))
        .map((v) => v.id);
      combinations = combinations.flatMap((c) => ids.map((id) => [...c, id]));
      if (combinations.length > 200) {
        setError('En fazla 200 varyant oluşturulabilir.');
        return;
      }
    }
    const key = (ids: string[]) => [...ids].sort().join(',');
    const existing = new Set(rows.map((r) => key(r.valueIds)));
    setRows([
      ...rows,
      ...combinations
        .filter((c) => c.length && !existing.has(key(c)))
        .map((valueIds) => ({ code: '', barcode: '', price: '0', quantity: '0', valueIds })),
    ]);
    setError('');
  };
  const update = (index: number, patch: Partial<Variant>) =>
    setRows((old) => old.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(path, { method: 'POST', body: { variants: rows } });
      setMessage('Varyantlar kaydedildi.');
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-6 rounded-[1.75rem] border border-line bg-surface-raised p-5 shadow-soft tablet:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink"
            >
              <Layers3 className="size-5" />
            </span>
            Varyantlar
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Her varyant için ayrı stok kodu, barkod, fiyat ve miktar belirleyebilirsin. Fiyat KDV
            hariçtir.
          </p>
        </div>
        {rows.length > 0 && (
          <span className="w-fit shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink-muted">
            {rows.length} varyant
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        {message && (
          <p role="status" className="text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {disabled && <Alert tone="info">Önce stok kartındaki değişiklikleri kaydedin.</Alert>}
      </div>
      <fieldset disabled={busy || disabled || !loaded} className="m-0 min-w-0 border-0 p-0">
        <div className="mb-5 mt-5">
          <Button
            variant="outline"
            flow={false}
            fullWidth={false}
            onClick={generate}
            disabled={!groups.length}
            leadingIcon={<Plus className="size-5" aria-hidden="true" />}
          >
            Seçili özelliklerden varyant oluştur
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <div
              key={index}
              className="min-w-0 rounded-3xl border border-line bg-surface p-4 sm:p-5"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <strong className="min-w-0 break-words text-sm sm:text-base">
                  {row.valueIds.map(valueName).join(' / ')}
                </strong>
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  aria-label={`${row.valueIds.map(valueName).join(' / ')} varyantını sil`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Sil
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ['code', 'Stok kodu'],
                    ['barcode', 'Barkod'],
                    ['price', 'Fiyat'],
                    ['quantity', 'Stok miktarı'],
                  ] as const
                ).map(([field, label]) => (
                  <TextField
                    key={field}
                    label={label}
                    value={row[field]}
                    inputMode={field === 'price' || field === 'quantity' ? 'decimal' : undefined}
                    onChange={(e) => update(index, { [field]: e.target.value })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            fullWidth={false}
            flow={false}
            onClick={() => void save()}
            loading={busy}
            loadingLabel="Kaydediliyor…"
          >
            Varyantları kaydet
          </Button>
        </div>
      </fieldset>
    </section>
  );
}
