import { useEffect, useEffectEvent, useState } from 'react';
import { Layers3, Plus, Trash2 } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { SelectField } from '../../../components/ui/SelectField';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { apiRequest, ApiError } from '../../../lib/http';
import { dataError } from '../../../lib/catalog-data';
import type { AttributeSnapshot } from '../../attributes/services/attribute.demo';
import { reconcileVariants, type Variant, type VariantSnapshot } from '../variant.rules';

export function VariantEditor({
  cardId,
  attributes,
  selectedIds,
  disabled,
  onStateChange,
}: {
  cardId: string;
  attributes: AttributeSnapshot;
  selectedIds: string[];
  disabled: boolean;
  onStateChange: (state: {
    dirty: boolean;
    busy: boolean;
    count: number;
    quantity: string;
  }) => void;
}) {
  const [rows, setRows] = useState<Variant[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState('');
  const [baseline, setBaseline] = useState('[]');
  const [revision, setRevision] = useState('');
  const [reload, setReload] = useState(0);
  const [confirmReload, setConfirmReload] = useState(false);
  const [canReload, setCanReload] = useState(false);
  const [persisted, setPersisted] = useState({ count: 0, quantity: '0' });
  const dirty = JSON.stringify(rows) !== baseline;
  useEffect(() => {
    onStateChange({ dirty, busy, ...persisted });
  }, [dirty, busy, persisted, onStateChange]);
  const path = `/api/stok/kartlar/${encodeURIComponent(cardId)}/varyantlar`;
  const selectionKey = [...selectedIds].sort().join(',');
  const loadKey = `${path}:${selectionKey}:${reload}`;
  const receiveSnapshot = useEffectEvent((data: VariantSnapshot) => {
    if (dirty && JSON.stringify(data.variants) !== baseline) {
      setCanReload(true);
      setError(
        'Sunucudaki varyantlar değişti. Girdiğiniz bilgiler korunuyor; kaydetmeden önce güncel kaydı kontrol edin.',
      );
    } else {
      if (!dirty) {
        setRows(data.variants);
        setBaseline(JSON.stringify(data.variants));
      }
      setRevision(data.revision);
      setError('');
      setCanReload(false);
    }
    setPersisted({ count: data.variants.length, quantity: sumQuantity(data.variants) });
    setLoaded(loadKey);
  });
  useEffect(() => {
    if (disabled) return;
    let active = true;
    void apiRequest<VariantSnapshot>(path)
      .then((data) => {
        if (active) {
          receiveSnapshot(data);
        }
      })
      .catch((e) => {
        if (active) {
          setError(dataError(e));
          setCanReload(true);
        }
      });
    return () => {
      active = false;
    };
  }, [path, reload, disabled, selectionKey]);
  const groups = attributes.groups.filter(
    (g) =>
      g.variant && attributes.values.some((v) => v.groupId === g.id && selectedIds.includes(v.id)),
  );
  const valueName = (id: string) => attributes.values.find((v) => v.id === id)?.name ?? id;
  const allowedIds = new Set(
    attributes.values
      .filter(
        (value) =>
          selectedIds.includes(value.id) && groups.some((group) => group.id === value.groupId),
      )
      .map((value) => value.id),
  );
  const missingGroups = (row: Variant) =>
    groups.filter(
      (group) =>
        row.valueIds.filter(
          (id) =>
            allowedIds.has(id) &&
            attributes.values.some((value) => value.id === id && value.groupId === group.id),
        ).length !== 1,
    );
  const invalidSelection = (row: Variant) =>
    missingGroups(row).length > 0 || row.valueIds.some((id) => !allowedIds.has(id));
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
    const next = reconcileVariants(
      rows,
      combinations.filter((c) => c.length),
    );
    if (next.length > 200) {
      setError('En fazla 200 varyant oluşturulabilir.');
      return;
    }
    setRows(next);
    setMessage('');
    setError('');
    setCanReload(false);
  };
  const update = (index: number, patch: Partial<Variant>) => {
    setMessage('');
    setRows((old) => old.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const save = async () => {
    const invalidIndex = rows.findIndex(invalidSelection);
    if (invalidIndex !== -1) {
      setError(
        `${invalidIndex + 1}. varyantın özellik seçimlerini tamamlayın veya birleşimleri güncelleyin.`,
      );
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    setCanReload(false);
    try {
      const data = await apiRequest<VariantSnapshot>(path, {
        method: 'POST',
        body: { variants: rows, revision },
      });
      setRows(data.variants);
      setBaseline(JSON.stringify(data.variants));
      setRevision(data.revision);
      setPersisted({ count: data.variants.length, quantity: sumQuantity(data.variants) });
      setMessage('Varyantlar kaydedildi.');
    } catch (e) {
      setError(dataError(e));
      setCanReload(e instanceof ApiError && e.status === 409);
    } finally {
      setBusy(false);
    }
  };
  // Özellik seçilmemiş boş kartlarda bölüm gösterilmez; kayıtlı satırlar gizlenmez.
  if (!groups.length && !rows.length && !persisted.count && !error) return null;
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
            Her özellik birleşiminin stok kodu, barkodu, fiyatı ve miktarı ayrıdır. Fiyat KDV
            hariçtir.
          </p>
        </div>
        {rows.length > 0 && (
          <span className="w-fit shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink-muted">
            {rows.length} varyant
          </span>
        )}
      </div>
      {(error || disabled) && (
        <div className="mt-5 flex flex-col gap-3">
          {error && <Alert>{error}</Alert>}
          {disabled && <Alert tone="info">Önce stok kartındaki değişiklikleri kaydedin.</Alert>}
        </div>
      )}
      <fieldset
        disabled={busy || disabled || loaded !== loadKey}
        className="m-0 min-w-0 border-0 p-0"
      >
        {groups.length > 0 && (
          <div className="mb-5 mt-5">
            <Button
              variant="outline"
              flow={false}
              fullWidth={false}
              onClick={generate}
              disabled={!groups.length}
              leadingIcon={<Plus className="size-5" aria-hidden="true" />}
            >
              {rows.length ? 'Birleşimleri güncelle' : 'Varyantları oluştur'}
            </Button>
          </div>
        )}
        {loaded === loadKey && !rows.length && (
          <p className="py-3 text-sm text-ink-muted">
            {dirty
              ? 'Kaydettiğinde mevcut varyantlar kaldırılacak.'
              : 'Henüz varyant oluşturulmadı.'}
          </p>
        )}
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => {
            const missing = missingGroups(row);
            return (
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
                    onClick={() => {
                      setMessage('');
                      setRows(rows.filter((_, i) => i !== index));
                    }}
                    aria-label={`${row.valueIds.map(valueName).join(' / ')} varyantını sil`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Sil
                  </button>
                </div>
                {invalidSelection(row) && (
                  <p className="mb-4 text-sm text-danger">
                    {missing.length
                      ? 'Eksik özellik seçimlerini tamamla.'
                      : 'Bu satırın özellikleri değişmiş. Birleşimleri güncelle veya satırı kaldır.'}
                  </p>
                )}
                {missing.length > 0 && (
                  <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {missing.map((group) => (
                      <SelectField
                        key={group.id}
                        label={group.name}
                        value={
                          row.valueIds.find((id) =>
                            attributes.values.some((v) => v.id === id && v.groupId === group.id),
                          ) ?? ''
                        }
                        options={attributes.values
                          .filter((v) => v.groupId === group.id && selectedIds.includes(v.id))
                          .map((v) => ({ value: v.id, label: v.name }))}
                        onChange={(id) =>
                          update(index, {
                            valueIds: [
                              ...row.valueIds.filter(
                                (valueId) =>
                                  !attributes.values.some(
                                    (v) => v.id === valueId && v.groupId === group.id,
                                  ),
                              ),
                              id,
                            ],
                          })
                        }
                      />
                    ))}
                  </div>
                )}
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
                      numeric={
                        field === 'price'
                          ? 'decimal'
                          : field === 'quantity'
                            ? 'signed-decimal'
                            : undefined
                      }
                      onChange={(e) => update(index, { [field]: e.target.value })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {(rows.length > 0 || dirty) && (
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className={`text-sm ${dirty ? 'text-ink-muted' : 'text-success'}`}>
              {dirty ? 'Kaydedilmemiş değişiklikler var.' : message}
            </p>
            <Button
              fullWidth={false}
              flow={false}
              onClick={() => void save()}
              loading={busy}
              loadingLabel="Kaydediliyor…"
              disabled={!dirty}
            >
              Varyantları kaydet
            </Button>
          </div>
        )}
      </fieldset>
      {canReload && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            fullWidth={false}
            flow={false}
            disabled={busy || disabled}
            onClick={() => setConfirmReload(true)}
          >
            Güncel kaydı yükle
          </Button>
        </div>
      )}
      <ConfirmSheet
        open={confirmReload}
        title="Sunucudaki kayıt yüklensin mi?"
        description="Kaydedilmemiş varyant değişiklikleri kaldırılır ve güncel kayıt yüklenir."
        confirmLabel="Yeniden yükle"
        onClose={() => setConfirmReload(false)}
        onConfirm={() => {
          setConfirmReload(false);
          setRows([]);
          setBaseline('[]');
          setLoaded('');
          setReload((v) => v + 1);
        }}
      />
    </section>
  );
}

// Six decimal stock precision without binary floating point rounding.
function sumQuantity(rows: Variant[]) {
  const sum = rows.reduce((total, row) => {
    const [whole = '0', fraction = ''] = row.quantity.replace(',', '.').replace('-', '').split('.');
    const amount = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
    return total + (row.quantity.startsWith('-') ? -amount : amount);
  }, 0n);
  const abs = sum < 0n ? -sum : sum;
  return `${sum < 0n ? '-' : ''}${abs / 1000000n}.${String(abs % 1000000n).padStart(6, '0')}`;
}
