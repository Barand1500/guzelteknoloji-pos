import { Coins, Pencil, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { formatMoney } from '../../home/components/parts';
import { usePublishAddAction } from '../../app-shell/save-action';
import type { ShippingStore } from '../hooks/useShipping';
import { emptyCarrierDraft, priceFor, type Carrier, type CarrierDraft } from '../types';
import { PriceSheet } from './PriceSheet';

/** Fiyat eğrisini gösteren küçük sütunlar: her sütun bir desi basamağı (yalnızca görsel). */
function PriceBars({ carrier }: { carrier: Carrier }) {
  const prices = carrier.prices.desi.map((t) => t.price).filter((p) => p > 0);
  const max = Math.max(...prices, 1);
  return (
    <span aria-hidden="true" className="flex h-10 items-end gap-1">
      {prices.slice(0, 9).map((p, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(12, (p / max) * 100)}%`, animationDelay: `${i * 40}ms` }}
          className="w-2 origin-bottom animate-rise-in rounded-t-md bg-brand-500/70"
        />
      ))}
    </span>
  );
}

function CarrierSheet({
  carrier,
  onSave,
  onClose,
}: {
  carrier: Carrier | null;
  onSave: (draft: CarrierDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CarrierDraft>(
    carrier
      ? { name: carrier.name, shortName: carrier.shortName, apiUrl: carrier.apiUrl }
      : emptyCarrierDraft(),
  );
  const [errors, setErrors] = useState<{ name?: string; shortName?: string }>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = 'Firma adı gerekli.';
    if (!draft.shortName.trim()) next.shortName = 'Kısa ad gerekli.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave({ ...draft, name: draft.name.trim(), shortName: draft.shortName.trim() });
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title={carrier ? 'Firmayı Düzenle' : 'Firma Ekle'}>
      <div className="flex flex-col gap-4">
        {problem ? <p role="alert" className="text-danger">{problem}</p> : null}
        <TextField
          label="Adı"
          value={draft.name}
          error={errors.name}
          maxLength={80}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <TextField
          label="Kısa Adı"
          value={draft.shortName}
          error={errors.shortName}
          maxLength={12}
          onChange={(e) => setDraft((d) => ({ ...d, shortName: e.target.value }))}
        />
        <TextField
          label="Api Url (isteğe bağlı)"
          value={draft.apiUrl}
          maxLength={200}
          onChange={(e) => setDraft((d) => ({ ...d, apiUrl: e.target.value }))}
        />
        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
          <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void submit()}>
            Kaydet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/** Firmalar: her firma bir kart; fiyat eğrisi küçük sütunlarla görünür, "Fiyatlar" fiyat penceresini açar. */
export function CarriersTab({ store }: { store: ShippingStore }) {
  const carriers = store.data?.carriers ?? [];
  const [form, setForm] = useState<{ carrier: Carrier | null } | null>(null);
  const [prices, setPrices] = useState<Carrier | null>(null);
  const [deleting, setDeleting] = useState<Carrier | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Firma Ekle', () => setForm({ carrier: null }));

  if (carriers.length === 0)
    return (
      <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
        <Truck className="size-8 text-brand-600/60" aria-hidden="true" />
        <p className="font-bold">Henüz kargo firması yok</p>
        <button type="button" onClick={() => setForm({ carrier: null })} className="font-bold text-brand-ink underline">
          İlk firmayı ekle
        </button>
        {form ? (
          <CarrierSheet
            carrier={null}
            onSave={async (d) => {
              await store.saveCarrier(d);
              setForm(null);
            }}
            onClose={() => setForm(null)}
          />
        ) : null}
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {problem ? <p role="alert" className="text-danger">{problem}</p> : null}
      <ul aria-label="Kargo firmaları" className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        {carriers.map((c, i) => {
          const base = priceFor(c.prices.desi, 1);
          return (
            // Çift tık kısayoldur; kalem düğmesi aynı işi klavyeyle yapar.
             
            <li
              key={c.id}
              onDoubleClick={() => setForm({ carrier: c })}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="flex animate-rise-in flex-col gap-3 rounded-3xl border border-line bg-surface-raised p-4 transition-colors hover:border-brand-500/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-extrabold tracking-wide text-brand-ink">
                  {c.shortName.slice(0, 4).toLocaleUpperCase('tr')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-extrabold">{c.name}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {c.apiUrl ? c.apiUrl.replace(/^https?:\/\//, '') : 'Api bağlı değil'}
                  </span>
                </span>
                <PriceBars carrier={c} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrices(c)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-bold text-white shadow-soft hover:bg-brand-800"
                >
                  <Coins className="size-4" aria-hidden="true" />
                  Fiyatlar
                </button>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                  {base !== null ? `1 desi ${formatMoney(base)}’den başlar` : 'Fiyat girilmedi'}
                </span>
                <button
                  type="button"
                  aria-label={`${c.name} firmasını düzenle`}
                  onClick={() => setForm({ carrier: c })}
                  className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${c.name} firmasını sil`}
                  onClick={() => setDeleting(c)}
                  className="flex size-10 items-center justify-center rounded-full text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {form ? (
        <CarrierSheet
          carrier={form.carrier}
          onSave={async (d) => {
            await store.saveCarrier(d, form.carrier?.id);
            setForm(null);
          }}
          onClose={() => setForm(null)}
        />
      ) : null}
      {prices ? (
        <PriceSheet
          carrier={prices}
          onSave={async (p) => {
            await store.savePrices(prices.id, p);
            setPrices(null);
          }}
          onClose={() => setPrices(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Firma ve fiyat tablosu silinir."
        confirmLabel="Sil"
        onConfirm={() => {
          const c = deleting;
          setDeleting(null);
          if (c) void store.removeCarrier(c.id).catch((e: unknown) => setProblem(dataError(e)));
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
