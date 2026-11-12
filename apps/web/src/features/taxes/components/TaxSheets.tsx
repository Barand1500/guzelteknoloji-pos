import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import type { TaxOffice, TaxType, TaxTypeDraft } from '../types';

function Footer({
  saving,
  onSave,
  onClose,
}: {
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex gap-3 border-t border-line pt-4">
      <Button variant="outline" flow={false} onClick={onClose}>
        Vazgeç
      </Button>
      <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={onSave}>
        Kaydet
      </Button>
    </div>
  );
}

/** Vergi türü ekle/düzenle: yalnızca ad ve kısa ad (oranlar kartın içinden eklenir). */
export function TaxTypeSheet({
  type,
  onSave,
  onClose,
}: {
  type: TaxType | null;
  onSave: (draft: TaxTypeDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(type?.name ?? '');
  const [short, setShort] = useState(type?.shortName ?? '');
  const [errors, setErrors] = useState<{ name?: string; short?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Ad gerekli.';
    if (!short.trim()) next.short = 'Kısa ad gerekli (ör. KDV).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), shortName: short.trim().toLocaleUpperCase('tr') });
    } catch (e) {
      setErrors({ save: dataError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title={type ? 'Vergi Türünü Düzenle' : 'Vergi Türü Ekle'}>
      <div className="flex flex-col gap-4">
        {errors.save ? (
          <p role="alert" className="text-danger">
            {errors.save}
          </p>
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <TextField
            label="Adı"
            value={name}
            error={errors.name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Kısa Adı"
            value={short}
            error={errors.short}
            maxLength={8}
            onChange={(e) => setShort(e.target.value.toUpperCase())}
          />
        </div>
        <Footer saving={saving} onSave={() => void submit()} onClose={onClose} />
      </div>
    </Sheet>
  );
}

/** Vergi dairesi ekle/düzenle: tek alan. */
export function TaxOfficeSheet({
  office,
  onSave,
  onClose,
}: {
  office: TaxOffice | null;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(office?.name ?? '');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Ad gerekli.');
    setSaving(true);
    try {
      await onSave(name.trim());
    } catch (e) {
      setError(dataError(e));
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
      title={office ? 'Vergi Dairesini Düzenle' : 'Vergi Dairesi Ekle'}
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Adı"
          value={name}
          error={error}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
        <Footer saving={saving} onSave={() => void submit()} onClose={onClose} />
      </div>
    </Sheet>
  );
}
