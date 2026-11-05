import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { emptyBrandDraft, type Brand, type BrandDraft } from '../types';
import { LogoPicker } from './LogoPicker';

interface BrandFormSheetProps {
  /** Düzenlenen marka; yoksa yeni marka eklenir. */
  brand: Brand | null;
  onSave: (draft: BrandDraft) => Promise<void>;
  onClose: () => void;
}

const NAME_REQUIRED = 'Marka adı gerekli.';

/**
 * Marka ekleme/düzenleme paneli (telefonda alttan açılır). Gerekli olan tek alan marka adıdır;
 * açıklama ve SEO "Gelişmiş" altında katlıdır. Her açılışta yeniden kurulur (key ile).
 */
export function BrandFormSheet({ brand, onSave, onClose }: BrandFormSheetProps) {
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
    <Sheet open onClose={onClose} title={brand ? 'Markayı Düzenle' : 'Marka Ekle'} size="lg">
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
