import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextField } from '../../../components/ui/TextField';
import { DealPlacePicker } from '../../deals/components/DealPlacePicker';
import {
  emptyGroupDraft,
  KIND_OPTIONS,
  type AttrGroup,
  type AttrTemplate,
  type GroupDraft,
  type ValueKind,
} from '../types';

interface GroupFormSheetProps {
  /** Düzenlenen grup; yoksa yeni grup eklenir. */
  group: AttrGroup | null;
  /** Yeni grup eklerken seçili gelen şablon (içinde bulunulan şablon). */
  defaultTemplateId: string | null;
  templates: AttrTemplate[];
  onSave: (draft: GroupDraft) => Promise<void>;
  saveError?: string | null;
  onClose: () => void;
}

const NAME_REQUIRED = 'Grup adı gerekli.';
const TEMPLATE_REQUIRED = 'Şablon seçin.';

/** Anahtar (soru biçiminde: "…Mu?") + sade Türkçe açıklaması. */
function Option({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Switch label={label} checked={checked} onChange={onChange} />
      <p className="px-2 text-sm text-ink-muted">{hint}</p>
    </div>
  );
}

/**
 * Grup ekleme/düzenleme paneli. Değerlerin görünümü TEK seçimdir (Yazı / Renk / Resim): renk ve
 * resim birlikte olmaz. Resim seçilirse "ürün resminin üzerinde göster" açılabilir ve rozet yeri/
 * boyutu Fırsat Yönetimi'ndeki seçiciyle belirlenir.
 */
export function GroupFormSheet({
  group,
  defaultTemplateId,
  templates,
  onSave,
  saveError,
  onClose,
}: GroupFormSheetProps) {
  const [draft, setDraft] = useState<GroupDraft>(() => {
    if (group) {
      const { id: _id, valueCount: _count, ...rest } = group;
      void _id;
      void _count;
      return rest;
    }
    return emptyGroupDraft(defaultTemplateId ?? '');
  });
  const [nameError, setNameError] = useState<string | undefined>();
  const [templateError, setTemplateError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const options = useMemo<SelectOption[]>(
    () => templates.map((t) => ({ value: t.id, label: t.name })),
    [templates],
  );
  const set = <K extends keyof GroupDraft>(key: K, value: GroupDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    const missingName = draft.name.trim() === '';
    const missingTemplate = draft.templateId === '';
    if (missingName) setNameError(NAME_REQUIRED);
    if (missingTemplate) setTemplateError(TEMPLATE_REQUIRED);
    if (missingName || missingTemplate) return;
    setSaving(true);
    await onSave({
      ...draft,
      name: draft.name.trim(),
      // Yalnızca resimli gruplarda anlamlıdır.
      showOnImage: draft.kind === 'image' && draft.showOnImage,
    });
    setSaving(false);
  };

  return (
    <Sheet open onClose={onClose} title={group ? 'Grubu Düzenle' : 'Grup Ekle'} size="lg">
      <div className="flex flex-col gap-5">
        {saveError ? <Alert tone="error">{saveError}</Alert> : null}
        <SelectField
          label="Şablon"
          options={options}
          value={draft.templateId}
          error={templateError}
          onChange={(v) => {
            set('templateId', v);
            setTemplateError(undefined);
          }}
        />
        <TextField
          label="Grup Adı"
          value={draft.name}
          error={nameError}
          onChange={(e) => {
            set('name', e.target.value);
            setNameError(undefined);
          }}
        />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Değerler Nasıl Görünsün?</p>
          <Segmented
            label="Değer türü"
            value={draft.kind}
            options={KIND_OPTIONS}
            onChange={(v) => set('kind', v as ValueKind)}
          />
          <p className="px-2 text-sm text-ink-muted">
            {draft.kind === 'text'
              ? 'Değerler yazı olarak görünür (ör. Free DOS, 8 GB).'
              : draft.kind === 'color'
                ? 'Her değerin bir rengi olur (ör. Siyah, Titanyum Mavi).'
                : 'Her değerin bir resmi olur (ör. kutu içeriği resimleri).'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Option
            label="Mağazada Filtre Olsun Mu?"
            hint="Müşteri ürünleri bu gruba göre süzebilir."
            checked={draft.filter}
            onChange={(v) => set('filter', v)}
          />
          <Option
            label="Birden Fazla Seçilebilsin Mi?"
            hint="Bir üründe bu gruptan birden çok değer seçilebilir."
            checked={draft.multiple}
            onChange={(v) => set('multiple', v)}
          />
          <Option
            label="Varyant Olsun Mu?"
            hint="Her seçim ayrı bir varyant (ürün çeşidi) olur, ör. renge göre."
            checked={draft.variant}
            onChange={(v) => set('variant', v)}
          />
        </div>

        {draft.kind === 'image' ? (
          <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface-muted/50 p-4 sm:p-5">
            <Option
              label="Ürün Resminin Üzerinde Gösterilsin Mi?"
              hint="Seçilen resim, ürün resminin köşesinde rozet gibi görünür."
              checked={draft.showOnImage}
              onChange={(v) => set('showOnImage', v)}
            />
            {draft.showOnImage ? (
              <DealPlacePicker
                look={{
                  iconUrl: null,
                  showOnImage: true,
                  position: draft.position,
                  size: draft.size,
                }}
                placeholderLabel="Resim"
                onPosition={(position) => set('position', position)}
                onSize={(size) => set('size', size)}
              />
            ) : null}
          </div>
        ) : null}

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
    </Sheet>
  );
}
