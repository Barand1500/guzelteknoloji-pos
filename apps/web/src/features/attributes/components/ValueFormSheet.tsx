import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { LogoPicker } from '../../brands/components/LogoPicker';
import { COLOR_PALETTE, nearestColorName } from '../color-names';
import { emptyValueDraft, slugify, type AttrGroup, type ValueDraft } from '../types';

interface ValueFormSheetProps {
  group: AttrGroup;
  /** Aynı gruptaki diğer özelliklerin adları (aynı ad iki kez eklenmesin). */
  takenNames: string[];
  onSave: (draft: ValueDraft) => Promise<void>;
  saveError?: string | null;
  onClose: () => void;
}

const fold = (s: string) => s.toLocaleLowerCase('tr').trim();

/**
 * Özellik (değer) ekleme paneli (düzenleme ve silme çip üzerinde yapılır). Kod kullanıcıya
 * sorulmaz, addan otomatik üretilir. Grup "Renk" ise renk, "Resim" ise görsel istenir.
 */
export function ValueFormSheet({
  group,
  takenNames,
  onSave,
  saveError,
  onClose,
}: ValueFormSheetProps) {
  const [draft, setDraft] = useState<ValueDraft>(() => ({
    ...emptyValueDraft(),
    color: group.kind === 'color' ? '#4f5380' : null,
  }));
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Ad boşsa (ya da önceki otomatik adsa) seçilen rengin adı kendiliğinden yazılır.
  const [autoName, setAutoName] = useState('');
  const chooseColor = (color: string, name: string) => {
    setDraft((d) => {
      const auto = d.name.trim() === '' || d.name === autoName;
      return { ...d, color, name: auto ? name : d.name };
    });
    setAutoName(name);
    setNameError(undefined);
  };

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
    await onSave({ ...draft, name, code: slugify(name) });
    setSaving(false);
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      title="Özellik Ekle"
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
            setDraft((d) => ({ ...d, name }));
            setNameError(undefined);
          }}
        />

        {group.kind === 'color' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">Renk</p>
            <div
              role="radiogroup"
              aria-label="Renk seçimi"
              className="flex flex-wrap items-center gap-2.5"
            >
              {COLOR_PALETTE.map(({ hex: color, name }) => {
                const on = draft.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Renk ${name}`}
                    title={name}
                    onClick={() => chooseColor(color, name)}
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
                  onChange={(e) => chooseColor(e.target.value, nearestColorName(e.target.value))}
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
        </div>
      </div>
    </Sheet>
  );
}
