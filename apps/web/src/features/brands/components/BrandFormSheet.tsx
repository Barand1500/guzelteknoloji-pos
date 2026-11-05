import { Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { emptyBrandDraft, type Brand, type BrandDraft } from '../types';
import { BrandProductsPanel } from './BrandProductsPanel';
import { LogoPicker } from './LogoPicker';

interface BrandFormSheetProps {
  /** Düzenlenen marka (güncel ürün sayısıyla); yoksa yeni marka eklenir. */
  brand: Brand | null;
  brandNames: Record<string, string>;
  onSave: (draft: BrandDraft) => Promise<void>;
  onAssign: (brandId: string, productIds: string[]) => Promise<void>;
  onUnassign: (brandId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

const NAME_REQUIRED = 'Marka adı gerekli.';

/**
 * Marka ekleme/düzenleme paneli (telefonda alttan açılır). Gerekli olan tek alan marka adıdır;
 * açıklama ve SEO "Gelişmiş" altında katlıdır. Her açılışta yeniden kurulur (key ile).
 */
export function BrandFormSheet({
  brand,
  brandNames,
  onSave,
  onAssign,
  onUnassign,
  onClose,
}: BrandFormSheetProps) {
  // Yan panel (markanın ürünleri): yalnızca kayıtlı markalarda vardır; açılıp kapanır.
  const [panelOpen, setPanelOpen] = useState(false);
  const productsButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<BrandDraft>(() =>
    brand
      ? {
          name: brand.name,
          description: brand.description,
          logoUrl: brand.logoUrl,
          active: brand.active,
          seoTitle: brand.seoTitle,
          seoDescription: brand.seoDescription,
        }
      : emptyBrandDraft,
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) =>
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
      title={brand ? 'Markayı Düzenle' : 'Marka Ekle'}
      size="lg"
      aside={
        brand
          ? {
              title: `${brand.name} · Ürünler`,
              subtitle: `${brand.productCount} ürün bu markada`,
              open: panelOpen,
              side: 'right',
              onClose: () => {
                setPanelOpen(false);
                productsButton.current?.focus();
              },
              children: (
                <BrandProductsPanel
                  brand={brand}
                  brandNames={brandNames}
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
            value={draft.logoUrl}
            name={draft.name}
            onChange={(url) => set('logoUrl', url)}
          />
          <div className="flex flex-col gap-4">
            <TextField
              label="Marka Adı"
              value={draft.name}
              error={nameError}
              onChange={(e) => {
                set('name', e.target.value);
                setNameError(undefined);
              }}
            />
            <Switch label="Aktif" checked={draft.active} onChange={(v) => set('active', v)} />
            {brand ? (
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
                    {brand.productCount}
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
