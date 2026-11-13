import { useMemo, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { dataError } from '../../../lib/catalog-data';
import { useBrands } from '../../brands/hooks/useBrands';
import { useCategories } from '../../categories/hooks/useCategories';
import { flattenTree } from '../../categories/tree';
import { WizardSteps } from '../../products/components/WizardSteps';
import {
  emptyRuleDraft,
  summarize,
  type CampaignKind,
  type CampaignRule,
  type RuleDraft,
} from '../types';
import { InlineNumber, Simulator } from './GeneralCard';
import { audienceOptions, audienceSelection, audienceLabels, type CampaignAudience } from '../campaign-audience';

/**
 * Özel kural sihirbazı: 1) Hangi ürünler (kategori/marka) · 2) Kimler ve ne zaman (cari tipi, fiyat
 * listesi, tutar) · 3) Sonuç (indirim tipi/değeri ya da özet) + deneme + aktif. Her yerde boş = hepsi.
 * Referanstaki 8 alanlı tek uzun form 3 kısa adıma bölündü; "Fiyat tanımı" ve "Fiyat" tek "Fiyat listeleri".
 */
export function RuleWizardSheet({
  kind,
  rule,
  choices,
  onSave,
  onClose,
}: {
  kind: CampaignKind;
  /** Düzenlenen kural; yoksa yeni eklenir. */
  rule: CampaignRule | null;
  choices: CampaignAudience;
  onSave: (draft: RuleDraft) => Promise<void>;
  onClose: () => void;
}) {
  const { categories } = useCategories();
  const { brands } = useBrands();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<RuleDraft>(() => {
    if (!rule) return emptyRuleDraft();
    const { id: _id, ...rest } = rule;
    void _id;
    return rest;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cart = kind === 'cart';
  const last = 3;

  const categoryOptions = useMemo(
    () =>
      flattenTree(categories).map(({ category, depth }) => ({
        id: category.id,
        name: category.name,
        depth,
        parentId: category.parentId,
      })),
    [categories],
  );
  const set = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => {
    setError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const submit = async () => {
    if (cart && draft.discountValue <= 0) return setError('İndirim değeri 0’dan büyük olmalı.');
    if (cart && draft.discountKind === 'percent' && draft.discountValue > 100)
      return setError('Yüzde en fazla 100 olabilir.');
    setSaving(true);
    try {
      await onSave(draft);
    } catch (e) {
      setError(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  const target = [
    draft.categoryIds.length ? `${draft.categoryIds.length} kategori` : 'Tüm kategoriler',
    draft.brandIds.length ? `${draft.brandIds.length} marka` : 'tüm markalar',
  ].join(' · ');

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="lg"
      title={rule ? 'Kuralı Düzenle' : 'Yeni Kural'}
    >
      <div className="flex flex-col gap-5">
        <WizardSteps
          steps={['Ürünler', 'Koşul', cart ? 'İndirim' : 'Özet']}
          current={step}
        />
        {error ? <Alert tone="error">{error}</Alert> : null}

        {step === 1 ? (
          <div className="flex animate-fade-in flex-col gap-4">
            <p className="text-ink-muted">
              Kural hangi ürünlere uygulansın? Boş bırakırsanız hepsine uygulanır.
            </p>
            <MultiSelectField
              label="Kategoriler"
              options={categoryOptions}
              value={draft.categoryIds}
              onChange={(v) => set('categoryIds', v)}
              emptyText="Hepsi"
              listText
            />
            <MultiSelectField
              label="Markalar"
              options={brands.map((b) => ({ id: b.id, name: b.name }))}
              value={draft.brandIds}
              onChange={(v) => set('brandIds', v)}
              emptyText="Hepsi"
              listText
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex animate-fade-in flex-col gap-4">
            <p className="text-ink-muted">Kimler için ve sepet kaç ₺ olunca geçerli olsun?</p>
            <MultiSelectField
              label="Cari Tipleri"
              options={audienceOptions(choices.customerTypes, draft.customerTypes)}
              value={audienceSelection(draft.customerTypes, choices.customerTypes)}
              onChange={(v) => set('customerTypes', v)}
              emptyText="Hepsi"
              listText
            />
            <MultiSelectField
              label="Fiyat Listeleri"
              options={audienceOptions(choices.priceLists, draft.priceLists)}
              value={audienceSelection(draft.priceLists, choices.priceLists)}
              onChange={(v) => set('priceLists', v)}
              emptyText="Hepsi"
              listText
            />
            <div className="flex items-baseline gap-2 text-lg font-semibold">
              Sepet
              <InlineNumber
                label="Alt sınır (₺)"
                value={draft.minTotal}
                onChange={(n) => set('minTotal', n)}
                width="min-w-0 flex-1"
                align="left"
              />
              <span className="shrink-0">
                <b className="text-2xl text-brand-ink">₺</b> ve üzerindeyse
              </span>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex animate-fade-in flex-col gap-4">
            {cart ? (
              <div className="flex items-baseline gap-3 text-lg font-semibold">
                <InlineNumber
                  label="İndirim değeri"
                  value={draft.discountValue}
                  onChange={(n) => set('discountValue', n)}
                  max={draft.discountKind === 'percent' ? 100 : undefined}
                  width="min-w-0 flex-1"
                  align="left"
                />
                <span
                  role="radiogroup"
                  aria-label="İndirim tipi"
                  className="inline-flex self-center rounded-full bg-surface-muted p-1"
                >
                  {(
                    [
                      ['percent', '%'],
                      ['amount', '₺'],
                    ] as const
                  ).map(([k, text]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={draft.discountKind === k}
                      aria-label={k === 'percent' ? 'Yüzde' : 'Tutar'}
                      onClick={() => set('discountKind', k)}
                      className={`flex size-9 items-center justify-center rounded-full font-extrabold transition-all ${draft.discountKind === k ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted'}`}
                    >
                      {text}
                    </button>
                  ))}
                </span>
                <span className="shrink-0">indirim</span>
              </div>
            ) : null}
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Özet</p>
              <p className="mt-1 font-bold">{summarize(draft, kind)}</p>
              <p className="text-sm text-ink-muted">
                {target}
                {draft.customerTypes.length ? ` · ${audienceLabels(draft.customerTypes, choices.customerTypes).join(', ')}` : ''}
                {draft.priceLists.length ? ` · ${audienceLabels(draft.priceLists, choices.priceLists).join(', ')}` : ''}
              </p>
            </div>
            <Simulator kind={kind} rule={draft} />
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted/60 p-3">
              <span className="font-semibold">Hemen aktif olsun</span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Kural aktif"
                checked={draft.active}
                onChange={(e) => set('active', e.target.checked)}
                className="size-5 accent-brand-700"
              />
            </label>
          </div>
        ) : null}

        <div className="flex gap-3 border-t border-line pt-4">
          <Button
            variant="outline"
            flow={false}
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            {step === 1 ? 'Vazgeç' : 'Geri'}
          </Button>
          {step < last ? (
            <Button flow={false} onClick={() => setStep(step + 1)}>
              İleri
            </Button>
          ) : (
            <Button
              flow={false}
              loading={saving}
              loadingLabel="Kaydediliyor…"
              onClick={() => void submit()}
            >
              Kaydet
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
