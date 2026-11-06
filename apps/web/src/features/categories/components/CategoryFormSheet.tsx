import { Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { LogoPicker } from '../../brands/components/LogoPicker';
import { branchOf, flattenTree } from '../tree';
import { emptyCategoryDraft, type Category, type CategoryDraft } from '../types';
import { CategoryProductsPanel } from './CategoryProductsPanel';

interface CategoryFormSheetProps {
  /** Düzenlenen kategori (güncel sayılarla); yoksa yeni kategori eklenir. */
  category: Category | null;
  /** Yeni kategori eklerken başlangıçtaki üst kategori (içinde bulunulan kategori). */
  defaultParentId: string | null;
  categories: Category[];
  categoryNames: Record<string, string>;
  onSave: (draft: CategoryDraft) => Promise<void>;
  onAssign: (categoryId: string, productIds: string[]) => Promise<void>;
  onUnassign: (categoryId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

const ROOT = '';
const NAME_REQUIRED = 'Kategori adı gerekli.';

/**
 * Kategori ekleme/düzenleme paneli (telefonda alttan açılır). Gerekli tek alan ad; açıklama ve
 * SEO "Gelişmiş" altında katlıdır. Üst kategori listesi ağaç şeklinde girintilidir ve kategorinin
 * kendi dalını içermez. Her açılışta yeniden kurulur (key ile).
 */
export function CategoryFormSheet({
  category,
  defaultParentId,
  categories,
  categoryNames,
  onSave,
  onAssign,
  onUnassign,
  onClose,
}: CategoryFormSheetProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const productsButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<CategoryDraft>(() =>
    category
      ? {
          parentId: category.parentId,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          active: category.active,
          hidden: category.hidden,
          seoTitle: category.seoTitle,
          seoDescription: category.seoDescription,
        }
      : emptyCategoryDraft(defaultParentId),
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const parentOptions = useMemo<SelectOption[]>(() => {
    const blocked = category ? branchOf(categories, category.id) : new Set<string>();
    return [
      { value: ROOT, label: 'Ana Kategori (üst yok)' },
      ...flattenTree(categories)
        .filter(({ category: c }) => !blocked.has(c.id))
        .map(({ category: c, depth }) => ({
          value: c.id,
          label: `${'   '.repeat(depth)}${depth > 0 ? '↳ ' : ''}${c.name}`,
        })),
    ];
  }, [categories, category]);

  const set = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (draft.name.trim() === '') {
      setNameError(NAME_REQUIRED);
      return;
    }
    setSaving(true);
    await onSave({ ...draft, name: draft.name.trim() });
    setSaving(false);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={category ? 'Kategoriyi Düzenle' : 'Kategori Ekle'}
      size="lg"
      aside={
        category
          ? {
              title: `${category.name} · Ürünler`,
              subtitle: `${category.productCount} ürün bu kategoride`,
              open: panelOpen,
              side: 'right',
              onClose: () => {
                setPanelOpen(false);
                productsButton.current?.focus();
              },
              children: (
                <CategoryProductsPanel
                  category={category}
                  categoryNames={categoryNames}
                  onAssign={onAssign}
                  onUnassign={onUnassign}
                />
              ),
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
          <LogoPicker
            value={draft.imageUrl}
            name={draft.name}
            onChange={(url) => set('imageUrl', url)}
            noun="Görsel"
            hint="800×800 oranı önerilir"
          />
          <div className="flex flex-col gap-4">
            <TextField
              label="Kategori Adı"
              value={draft.name}
              error={nameError}
              onChange={(e) => {
                set('name', e.target.value);
                setNameError(undefined);
              }}
            />
            <SelectField
              label="Üst Kategori"
              options={parentOptions}
              value={draft.parentId ?? ROOT}
              onChange={(v) => set('parentId', v === ROOT ? null : v)}
            />
            <Switch label="Aktif" checked={draft.active} onChange={(v) => set('active', v)} />
            <Switch
              label="Mağazada Gizle"
              checked={draft.hidden}
              onChange={(v) => set('hidden', v)}
            />
            {category ? (
              <button
                ref={productsButton}
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                aria-expanded={panelOpen}
                className={[
                  'flex min-h-14 items-center gap-3 rounded-control border px-4 text-left transition-colors',
                  panelOpen
                    ? 'border-brand-600 bg-brand-50 text-brand-ink'
                    : 'border-field-border hover:border-brand-500',
                ].join(' ')}
              >
                <Boxes className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1 font-semibold">
                  Ürünler
                  <span className="ml-2 rounded-full bg-surface-muted px-2.5 py-0.5 text-sm text-ink-muted">
                    {category.productCount}
                  </span>
                </span>
                <ChevronRight
                  className={`size-5 shrink-0 transition-transform ${panelOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink"
        >
          Gelişmiş: Açıklama ve SEO
          <ChevronDown
            className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {advancedOpen ? (
          <div className="flex animate-fade-in flex-col gap-4">
            <TextAreaField
              label="Açıklama"
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />
            <TextField
              label="SEO Başlığı"
              value={draft.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
            />
            <TextAreaField
              label="SEO Açıklaması"
              value={draft.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
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
