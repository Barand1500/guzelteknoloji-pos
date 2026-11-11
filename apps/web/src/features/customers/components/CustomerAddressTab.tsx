import { MapPin, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import type { AddressDraft, CustomerAddress, CustomerDetail } from '../types';

/** Adresler: çift tıklayınca düzenlenir (kalem de aynı işi yapar); ekleme alt adadaki "+" ile. */
export function AddressTab({
  detail,
  onEdit,
}: {
  detail: CustomerDetail;
  onEdit: (a: CustomerAddress) => void;
}) {
  if (detail.addresses.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line-strong/50 bg-surface px-4 py-10 text-center text-ink-muted">
        Kayıtlı adres yok. Alttaki + ile ekleyebilirsiniz.
      </p>
    );
  return (
    <ul aria-label="Adresler" className="flex flex-col gap-2">
      {detail.addresses.map((a, i) => (
        // Çift tık kısayoldur; kalem düğmesi aynı işi klavyeyle yapar.
         
        <li
          key={a.id}
          onDoubleClick={() => onEdit(a)}
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          className="flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-brand-500/40"
        >
          <MapPin className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-bold">
              {a.title}
              {a.isDefault ? (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
                  Varsayılan
                </span>
              ) : null}
            </span>
            <span className="block text-sm text-ink-muted">{a.address}</span>
          </span>
          <button
            type="button"
            aria-label={`${a.title} adresini düzenle`}
            onClick={() => onEdit(a)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Adres ekle / düzenle penceresi. */
export function AddressSheet({
  address,
  onSave,
  onClose,
}: {
  /** Düzenlenen adres; yoksa yeni eklenir. */
  address: CustomerAddress | null;
  onSave: (draft: AddressDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AddressDraft>({
    title: address?.title ?? '',
    address: address?.address ?? '',
    isDefault: address?.isDefault ?? false,
  });
  const [errors, setErrors] = useState<{ title?: string; address?: string }>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    const next: typeof errors = {};
    if (draft.title.trim() === '') next.title = 'Adres başlığı gerekli (ör. Ev, Depo).';
    if (draft.address.trim().length < 10) next.address = 'Adresi eksiksiz yazın.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setProblem(null);
    try {
      await onSave({ ...draft, title: draft.title.trim(), address: draft.address.trim() });
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="md"
      title={address ? 'Adresi Düzenle' : 'Adres Ekle'}
    >
      <div className="flex flex-col gap-4">
        {problem ? <Alert tone="error">{problem}</Alert> : null}
        <TextField
          label="Başlık"
          value={draft.title}
          error={errors.title}
          maxLength={60}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <TextField
          label="Açık adres"
          value={draft.address}
          error={errors.address}
          maxLength={300}
          onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
        />
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted/60 p-3">
          <span className="font-semibold">Varsayılan adres</span>
          <ToggleSwitch
            label="Varsayılan adres"
            checked={draft.isDefault}
            onChange={(v) => setDraft((d) => ({ ...d, isDefault: v }))}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row-reverse">
          <Button
            flow={false}
            loading={saving}
            loadingLabel="Kaydediliyor…"
            onClick={() => void submit()}
          >
            Kaydet
          </Button>
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
