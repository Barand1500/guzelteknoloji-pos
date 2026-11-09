import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { LogoPicker } from '../../brands/components/LogoPicker';
import {
  emptyValueDraft,
  slugify,
  type AttrGroup,
  type AttrValue,
  type ValueDraft,
} from '../types';

interface ValueFormSheetProps {
  group: AttrGroup;
  /** Düzenlenen özellik; yoksa yeni özellik eklenir. */
  value: AttrValue | null;
  /** Aynı gruptaki diğer özelliklerin adları (aynı ad iki kez eklenmesin). */
  takenNames: string[];
  onSave: (draft: ValueDraft) => Promise<void>;
  saveError?: string | null;
  onDelete?: () => void;
  onClose: () => void;
  /** true: açılışta resim seçici hemen açılır (listede resme çift tıklanınca). */
  pickImage?: boolean;
}

/** Hazır renkler (hızlı seçim); isteyen kendi rengini de seçer. */
const PALETTE = [
  '#000000',
  '#dddddd',
  '#fafafa',
  '#d4d4d4',
  '#4f5380',
  '#3f86c8',
  '#1f9d55',
  '#f9fb4d',
  '#f57c00',
  '#e5251d',
  '#dfbfa5',
  '#8a5330',
];

const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/**
 * Özellik (değer) ekleme/düzenleme paneli. Kod, adından otomatik üretilir; kullanıcı elle
 * değiştirirse artık otomatik güncellenmez. Grup "Renk" ise renk, "Resim" ise görsel istenir.
 */
export function ValueFormSheet({
  group,
  value,
  takenNames,
  onSave,
  saveError,
  onDelete,
  onClose,
  pickImage = false,
}: ValueFormSheetProps) {
  const [draft, setDraft] = useState<ValueDraft>(() =>
    value
      ? { code: value.code, name: value.name, color: value.color, imageUrl: value.imageUrl }
      : { ...emptyValueDraft(), color: group.kind === 'color' ? '#4f5380' : null },
  );
  // Kod elle değiştirildiyse ad yazarken yeniden üretilmez.
  const [codeEdited, setCodeEdited] = useState(Boolean(value));
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const name = draft.name.trim();
    if (name === '') {
      setNameError('Özellik adı gerekli.');
      return;
    }
    if (takenNames.some((n) => fold(n) === fold(name))) {
      setNameError('Bu grupta aynı adda bir özellik zaten var.');
      return;
    }
    setSaving(true);
    await onSave({ ...draft, name, code: draft.code.trim() || slugify(name) });
    setSaving(false);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={value ? 'Özelliği Düzenle' : 'Özellik Ekle'}
      description={`${group.name} grubuna`}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {saveError ? <Alert tone="error">{saveError}</Alert> : null}
        <TextField
          label="Özellik Adı"
          value={draft.name}
          error={nameError}
          onChange={(e) => {
            const name = e.target.value;
            setDraft((d) => ({ ...d, name, code: codeEdited ? d.code : slugify(name) }));
            setNameError(undefined);
          }}
        />
        <TextField
          label="Özellik Kodu"
          value={draft.code}
          onChange={(e) => {
            setCodeEdited(true);
            setDraft((d) => ({ ...d, code: e.target.value }));
          }}
        />
        <p className="-mt-3 px-2 text-sm text-ink-muted">
          Kod adından otomatik üretilir; istersen değiştirebilirsin.
        </p>

        {group.kind === 'color' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Renk</p>
            <div
              role="radiogroup"
              aria-label="Renk seçimi"
              className="flex flex-wrap items-center gap-2.5"
            >
              {PALETTE.map((color) => {
                const on = draft.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Renk ${color}`}
                    onClick={() => setDraft((d) => ({ ...d, color }))}
                    style={{ backgroundColor: color }}
                    className={[
                      'size-10 rounded-xl ring-1 ring-black/15 transition-all duration-200',
                      on ? 'scale-110 outline-2 outline-offset-2 outline-brand-600' : '',
                    ].join(' ')}
                  />
                );
              })}
              <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-field-border px-3 text-sm font-semibold hover:border-brand-500">
                <input
                  type="color"
                  value={draft.color ?? '#4f5380'}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                  aria-label="Başka renk seç"
                  className="size-6 cursor-pointer border-0 bg-transparent p-0"
                />
                Başka Renk
              </label>
            </div>
          </div>
        ) : null}

        {group.kind === 'image' ? (
          <LogoPicker
            value={draft.imageUrl}
            name={draft.name}
            onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
            noun="Resim"
            hint="Kare oran önerilir"
            autoPick={pickImage}
          />
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              onClick={() => void submit()}
              loading={saving}
              loadingLabel="Kaydediliyor…"
              flow={false}
            >
              Kaydet
            </Button>
            <Button variant="outline" onClick={onClose} flow={false}>
              Vazgeç
            </Button>
          </div>
          {onDelete ? (
            <Button
              variant="danger"
              flow={false}
              onClick={onDelete}
              leadingIcon={<Trash2 className="size-5" aria-hidden="true" />}
            >
              Özelliği Sil
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
