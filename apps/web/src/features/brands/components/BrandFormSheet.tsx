import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { stockErrorMessage } from '../../stock/services/stock.service';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { findSimilarBrand } from '../brand-name';
import { emptyBrandDraft, type Brand, type BrandDraft } from '../types';
import { LogoPicker } from './LogoPicker';

interface BrandFormSheetProps {
  /** Düzenlenen marka (güncel ürün sayısıyla); yoksa yeni marka eklenir. */
  brand: Brand | null;
  onSave: (draft: BrandDraft) => Promise<void>;
  onClose: () => void;
  /** Benzer ad uyarısı için mevcut markalar. */
  brands?: Brand[];
  /** true: pencere açılınca logo dosya seçici hemen açılır (listede logoya çift tıklanınca). */
  pickLogo?: boolean;
}

const NAME_REQUIRED = 'Marka adı gerekli.';

/**
 * Marka ekleme/düzenleme paneli (telefonda alttan açılır). Gerekli olan tek alan marka adıdır;
 * adın altında açıklama durur, SEO "Gelişmiş" altında katlıdır. Aktif/pasif anahtarı ve ürünler
 * burada yoktur: aktiflik listedeki anahtardan, ürünler satırdaki "Ürünler" işleminden yönetilir.
 * Her açılışta yeniden kurulur (key ile).
 */
export function BrandFormSheet({
  brand,
  onSave,
  onClose,
  brands = [],
  pickLogo = false,
}: BrandFormSheetProps) {
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const similar = findSimilarBrand(draft.name, brands, brand?.id);

  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (saving) return;
    if (draft.name.trim() === '') {
      setNameError(NAME_REQUIRED);
      return;
    }
    if (similar) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim() });
    } catch (error) {
      setSaveError(stockErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      title={brand ? 'Markayı Düzenle' : 'Marka Ekle'}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {saveError ? <Alert tone="error">{saveError}</Alert> : null}
        <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
          <LogoPicker
            value={draft.logoUrl}
            name={draft.name}
            onChange={(url) => set('logoUrl', url)}
            autoPick={pickLogo}
          />
          <div className="flex flex-col gap-4">
            <TextField
              label="Marka Adı"
              maxLength={120}
              value={draft.name}
              error={
                nameError ??
                (similar
                  ? `${similar.name} zaten var. Aynı markayı ikinci kez eklemeyin.`
                  : undefined)
              }
              onChange={(e) => {
                set('name', e.target.value);
                setNameError(undefined);
              }}
            />
            <TextAreaField
              label="Açıklama"
              maxLength={10000}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink"
        >
          Gelişmiş: SEO
          <ChevronDown
            className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {advancedOpen ? (
          <div className="flex animate-fade-in flex-col gap-4">
            <TextField
              label="SEO Başlığı"
              maxLength={250}
              value={draft.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
            />
            <TextAreaField
              label="SEO Açıklaması"
              maxLength={1000}
              value={draft.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            onClick={() => void submit()}
            loading={saving}
            disabled={similar !== null}
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
