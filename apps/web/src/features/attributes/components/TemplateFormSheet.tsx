import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextField } from '../../../components/ui/TextField';
import { flattenTree } from '../../categories/tree';
import type { Category } from '../../categories/types';
import { emptyTemplateDraft, type AttrTemplate, type TemplateDraft } from '../types';

interface TemplateFormSheetProps {
  /** Düzenlenen şablon; yoksa yeni şablon eklenir. */
  template: AttrTemplate | null;
  categories: Category[];
  onSave: (draft: TemplateDraft) => Promise<void>;
  onClose: () => void;
}

const NAME_REQUIRED = 'Şablon adı gerekli.';
const CATEGORY_REQUIRED = 'En az bir kategori seçin ya da "Tüm Ürünlerde Kullan"ı açın.';

/**
 * Şablon ekleme/düzenleme paneli. Şablon, seçilen kategorilerdeki ürünlerde görünür; kategoriye
 * bağlı olmayan ortak şablon için "Tüm Ürünlerde Kullan" açılır. Kategoriler ağaç şeklinde tek
 * tek işaretlenir (üst kategoriyi işaretlemek alt kategorileri kendiliğinden işaretlemez).
 */
export function TemplateFormSheet({
  template,
  categories,
  onSave,
  onClose,
}: TemplateFormSheetProps) {
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    template
      ? {
          name: template.name,
          allProducts: template.allProducts,
          categoryIds: [...template.categoryIds],
        }
      : emptyTemplateDraft(),
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => flattenTree(categories), [categories]);

  const toggleCategory = (id: string) => {
    setCategoryError(undefined);
    setDraft((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter((c) => c !== id)
        : [...d.categoryIds, id],
    }));
  };

  const submit = async () => {
    const missingName = draft.name.trim() === '';
    const missingCategory = !draft.allProducts && draft.categoryIds.length === 0;
    if (missingName) setNameError(NAME_REQUIRED);
    if (missingCategory) setCategoryError(CATEGORY_REQUIRED);
    if (missingName || missingCategory) return;
    setSaving(true);
    await onSave({ ...draft, name: draft.name.trim() });
    setSaving(false);
  };

  return (
    <Sheet open onClose={onClose} title={template ? 'Şablonu Düzenle' : 'Şablon Ekle'} size="lg">
      <div className="flex flex-col gap-5">
        <TextField
          label="Şablon Adı"
          value={draft.name}
          error={nameError}
          onChange={(e) => {
            setDraft((d) => ({ ...d, name: e.target.value }));
            setNameError(undefined);
          }}
        />

        <div className="flex flex-col gap-2">
          <Switch
            label="Tüm Ürünlerde Kullan"
            checked={draft.allProducts}
            onChange={(v) => {
              setDraft((d) => ({ ...d, allProducts: v }));
              setCategoryError(undefined);
            }}
          />
          <p className="px-2 text-sm text-ink-muted">
            Açıksa şablon her üründe görünür; kategori seçmeye gerek kalmaz (ör. Fiziksel
            Özellikler).
          </p>
        </div>

        {draft.allProducts ? null : (
          <div className="flex flex-col gap-2">
            <p className="flex items-center justify-between text-sm font-semibold">
              Hangi kategorilerde kullanılsın?
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-ink">
                {draft.categoryIds.length} seçili
              </span>
            </p>
            <ul
              aria-label="Kategoriler"
              className="max-h-64 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5"
            >
              {rows.map(({ category, depth }) => {
                const on = draft.categoryIds.includes(category.id);
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${category.name} kategorisini seç`}
                      onClick={() => toggleCategory(category.id)}
                      style={{ paddingLeft: `${0.625 + depth * 1.25}rem` }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl pr-3 text-left text-sm font-semibold transition-colors hover:bg-brand-50"
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-field-border',
                        ].join(' ')}
                      >
                        {on ? <Check className="size-3.5" /> : null}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {categoryError ? <Alert tone="error">{categoryError}</Alert> : null}
          </div>
        )}

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
