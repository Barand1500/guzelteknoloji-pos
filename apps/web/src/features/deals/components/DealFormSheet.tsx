import { Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { Switch } from '../../../components/ui/Switch';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { emptyDealDraft, type Deal, type DealDraft } from '../types';
import { DealIconPicker } from './DealIconPicker';
import { DealPlacePicker } from './DealPlacePicker';
import { DealProductsPanel } from './DealProductsPanel';

interface DealFormSheetProps {
  /** Düzenlenen fırsat (güncel ürün sayısıyla); yoksa yeni fırsat eklenir. */
  deal: Deal | null;
  onSave: (draft: DealDraft) => Promise<void>;
  onAssign: (dealId: string, productIds: string[]) => Promise<void>;
  onUnassign: (dealId: string, productIds: string[]) => Promise<void>;
  onClose: () => void;
}

const NAME_REQUIRED = 'Fırsat adı gerekli.';
const ICON_REQUIRED = 'Rozet olarak kullanılacak bir ikon yükleyin.';

/**
 * Fırsat ekleme/düzenleme paneli (telefonda alttan açılır). Gerekli tek alan ad. Rozet şekli,
 * yazısı ve ürün resmindeki yeri tek yerde ayarlanır; yer ve boyut ÖRNEK ÜRÜN RESMİ üzerinde
 * canlı görünür. SEO "Gelişmiş" altında katlıdır. Her açılışta yeniden kurulur (key ile).
 */
export function DealFormSheet({ deal, onSave, onAssign, onUnassign, onClose }: DealFormSheetProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const productsButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<DealDraft>(() => {
    if (!deal) return emptyDealDraft();
    const { id: _id, productCount: _count, ...rest } = deal;
    void _id;
    void _count;
    return rest;
  });
  const [nameError, setNameError] = useState<string | undefined>();
  const [iconError, setIconError] = useState<string | undefined>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof DealDraft>(key: K, value: DealDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    const missingName = draft.name.trim() === '';
    // Ürün resminde gösterilecekse rozetin görseli (ikon) şarttır.
    const missingIcon = draft.showOnImage && !draft.iconUrl;
    if (missingName) setNameError(NAME_REQUIRED);
    if (missingIcon) setIconError(ICON_REQUIRED);
    if (missingName || missingIcon) return;
    setSaving(true);
    await onSave({ ...draft, name: draft.name.trim() });
    setSaving(false);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={deal ? 'Fırsatı Düzenle' : 'Fırsat Ekle'}
      size="lg"
      aside={
        deal
          ? {
              title: `${deal.name} · Ürünler`,
              subtitle: `${deal.productCount} üründe kullanılıyor`,
              open: panelOpen,
              side: 'right',
              onClose: () => {
                setPanelOpen(false);
                productsButton.current?.focus();
              },
              children: (
                <DealProductsPanel deal={deal} onAssign={onAssign} onUnassign={onUnassign} />
              ),
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <TextField
          label="Fırsat Adı"
          value={draft.name}
          error={nameError}
          onChange={(e) => {
            set('name', e.target.value);
            setNameError(undefined);
          }}
        />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">İkon</p>
          <DealIconPicker
            value={draft.iconUrl}
            error={iconError}
            onChange={(url) => {
              set('iconUrl', url);
              setIconError(undefined);
            }}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface-muted/50 p-4 sm:p-5">
          <Switch
            label="Ürün Resminin Üzerinde Göster"
            checked={draft.showOnImage}
            onChange={(v) => set('showOnImage', v)}
          />
          {draft.showOnImage ? (
            <DealPlacePicker
              look={draft}
              onPosition={(position) => set('position', position)}
              onSize={(size) => set('size', size)}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              Kapalıyken fırsat yalnızca etiket olarak kullanılır; ürün resminde rozet çıkmaz.
            </p>
          )}
        </div>

        <Switch label="Aktif" checked={draft.active} onChange={(v) => set('active', v)} />

        {deal ? (
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
                {deal.productCount}
              </span>
            </span>
            <ChevronRight
              className={`size-5 shrink-0 transition-transform ${panelOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : null}

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
