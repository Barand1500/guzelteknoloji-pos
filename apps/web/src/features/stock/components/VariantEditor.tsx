import { useEffect, useState } from 'react';
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
    <section className="rounded-3xl border border-line bg-surface-raised p-5">
      <h2 className="text-lg font-extrabold">Varyantlar</h2>
      <p className="my-2 text-sm text-ink-muted">
        Özellikleri kaydettikten sonra varyantları oluşturup ayrı stok kodu, barkod, fiyat ve miktar
        girebilirsin. Fiyat KDV hariçtir.
      </p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message && <p className="text-success">{message}</p>}
      {disabled && (
        <p className="text-sm text-ink-muted">Önce stok kartındaki değişiklikleri kaydedin.</p>
      )}
      <fieldset disabled={busy || disabled || !loaded}>
        <button
          type="button"
          onClick={generate}
          disabled={!groups.length}
          className="my-3 rounded-xl border border-line px-4 py-2"
        >
          Seçili özelliklerden varyant oluştur
        </button>
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div key={index} className="rounded-xl border border-line p-3">
              <div className="flex justify-between gap-2">
                <strong>{row.valueIds.map(valueName).join(' / ')}</strong>
                <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))}>
                  Sil
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['code', 'Stok kodu'],
                    ['barcode', 'Barkod'],
                    ['price', 'Fiyat'],
                    ['quantity', 'Stok miktarı'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="text-sm">
                    {label}
                    <input
                      className="block w-full rounded-lg border border-line bg-surface p-2"
                      value={row[field]}
                      onChange={(e) => update(index, { [field]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="mt-3 rounded-xl bg-brand-700 px-4 py-2 font-bold text-white"
        >
          Varyantları kaydet
        </button>
      </fieldset>
    </section>
  );
}
