import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Coins,
  Plus,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { useOptionList, type OptionList } from '../hooks/useOptionList';
import { stockService } from '../services/stock.service';
import {
  createEmptyDraft,
  createUnitRow,
  validateRequired,
  type DraftErrors,
} from '../stock.rules';
import type { StockCardDraft, StockLookups, UnitRow } from '../types';
import { PriceTabs } from './PriceTabs';
import { Stepper } from './Stepper';
import { CollapsedSummary } from './CollapsedSummary';
import { StockPreview } from './StockPreview';
import { UnitCard } from './UnitCard';

/** Telefonda adımlar; geniş ekranda hepsi birden görünür (sağda canlı önizleme ile). */
const STEPS = ['Temel Bilgi', 'Fiyat ve Birim', 'Özet'] as const;
const LAST_STEP = STEPS.length - 1;

/** Dar ekranda yalnızca aktif adım görünür; `xl` ve üstünde hepsi görünür. */
const showOnStep = (current: number, mine: number) => (current === mine ? '' : 'hidden xl:block');

/** Bölüm kartı görünümü (iki kartta ortak). */
const cardClass =
  'relative animate-rise-in rounded-[1.75rem] border border-line bg-surface-raised p-5 shadow-soft focus-within:z-20 tablet:p-7';

/** Seçim kutusuna "Yeni ekle" + silme davranışını bağlar (ayrı pencere yok). */
function editable(
  list: OptionList,
  noun: string,
  onCreated: (value: string) => void,
  withRate = false,
) {
  return {
    options: list.options,
    creator: {
      placeholder: `Yeni ${noun} adı…`,
      ...(withRate ? { ratePlaceholder: `${noun} oranı (%)` } : {}),
      // Oran varsa ada parantez içinde eklenir: "Gıda" + 10 → "Gıda (%10)".
      onCreate: (label: string, rate?: string) =>
        void list
          .add(withRate && rate ? `${label} (%${rate})` : label)
          .then((o) => onCreated(o.value)),
    },
    onRemove: list.remove,
  };
}

/** Veriyi yükler; hazır olunca düzenleyiciyi gösterir (listeler yüklenmeden hook'lar kurulamaz). */
export function StockCardForm() {
  const [lookups, setLookups] = useState<StockLookups | null>(null);

  useEffect(() => {
    let active = true;
    void stockService.getLookups().then((data) => active && setLookups(data));
    return () => {
      active = false;
    };
  }, []);

  if (!lookups) {
    return (
      <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-muted" aria-busy="true" />
    );
  }
  return <StockCardEditor lookups={lookups} />;
}

function StockCardEditor({ lookups }: { lookups: StockLookups }) {
  const stockTypes = useOptionList('stockTypes', lookups.stockTypes);
  const vatDepartments = useOptionList('vatDepartments', lookups.vatDepartments);
  const stockKinds = useOptionList('stockKinds', lookups.stockKinds);
  const units = useOptionList('units', lookups.units);
  const priceLists = useOptionList('priceLists', lookups.priceLists);

  const firstListId = priceLists.options[0]?.value ?? 'fiyat';
  const [draft, setDraft] = useState<StockCardDraft>(() => createEmptyDraft(firstListId));
  const [activeList, setActiveList] = useState(firstListId);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [step, setStep] = useState(0);
  // Geniş ekranda gelişmiş alanlar baştan açık (yer var); dar ekranda katlı.
  const [moreOpen, setMoreOpen] = useState(
    () => window.matchMedia?.('(min-width: 80rem)').matches ?? false,
  );
  const [saving, setSaving] = useState(false);
  // Sağdaki özet kartı geniş ekranda ok ile kapanıp açılır (kapalıyken sol alan genişler).
  const [previewOpen, setPreviewOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  // ---- Temel alanlar ---------------------------------------------------------------
  const set = <K extends keyof StockCardDraft>(key: K, value: StockCardDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const text = (
    key: 'code' | 'name' | 'lowerLimit' | 'upperLimit' | 'gtip' | 'origin',
    label: string,
    decimal = false,
  ) => (
    <TextField
      label={label}
      value={draft[key]}
      error={errors[key]}
      inputMode={decimal ? 'decimal' : undefined}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  // ---- Birim satırları (aktif fiyat listesi) -----------------------------------------
  const rows = draft.units[activeList] ?? [];
  const setRows = (listId: string, next: UnitRow[]) =>
    setDraft((d) => ({ ...d, units: { ...d.units, [listId]: next } }));

  const updateRow = (rowId: string, patch: Partial<UnitRow>) => {
    setRows(
      activeList,
      rows.map((r) => {
        if (r.id === rowId) return { ...r, ...patch };
        // Ana ve varsayılan birimden yalnızca biri olabilir.
        return {
          ...r,
          isMain: patch.isMain === true ? false : r.isMain,
          isDefault: patch.isDefault === true ? false : r.isDefault,
        };
      }),
    );
  };
  const addRow = () =>
    setRows(activeList, [...rows, createUnitRow(false, units.options[0]?.value)]);
  const removeRow = (rowId: string) => {
    const left = rows.filter((r) => r.id !== rowId);
    // Silinen satır ana/varsayılan idiyse bu işaret ilk satıra geçer.
    const needMain = !left.some((r) => r.isMain);
    const needDefault = !left.some((r) => r.isDefault);
    setRows(
      activeList,
      left.map((r, i) =>
        i === 0 ? { ...r, isMain: r.isMain || needMain, isDefault: r.isDefault || needDefault } : r,
      ),
    );
  };

  // ---- Fiyat adları --------------------------------------------------------------------
  const addPriceList = async (label: string) => {
    const created = await priceLists.add(label);
    setDraft((d) =>
      d.units[created.value]
        ? d
        : { ...d, units: { ...d.units, [created.value]: [createUnitRow(true)] } },
    );
    setActiveList(created.value);
  };
  const removePriceList = (id: string) => {
    priceLists.remove(id);
    setDraft((d) => ({
      ...d,
      units: Object.fromEntries(Object.entries(d.units).filter(([key]) => key !== id)),
    }));
    if (activeList === id) setActiveList(firstListId);
  };

  // ---- Gezinme ve kayıt ----------------------------------------------------------------
  const next = () => {
    const found = validateRequired(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((s) => Math.min(LAST_STEP, s + 1));
  };

  const save = async () => {
    const found = validateRequired(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStep(0);
      return;
    }
    setSaving(true);
    await stockService.save(draft);
    setSaving(false);
    setSaved(true);
  };

  const startOver = () => {
    setDraft(createEmptyDraft(firstListId));
    setActiveList(firstListId);
    setStep(0);
    setSaved(false);
  };

  if (saved) {
    return (
      <div className="mx-auto flex max-w-xl animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-16 text-center shadow-soft">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <p className="text-2xl font-extrabold">Stok kartı kaydedildi!</p>
        <p className="text-ink-muted">{draft.name || draft.code || 'Yeni ürün'}</p>
        <Button fullWidth={false} onClick={startOver} className="mt-2">
          Yeni Stok Kartı
        </Button>
      </div>
    );
  }

  const activeListLabel = priceLists.options.find((o) => o.value === activeList)?.label ?? '';
  const saveButton = (
    <Button onClick={save} loading={saving} loadingLabel="Kaydediliyor…">
      Kaydet
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="xl:hidden">
        <Stepper steps={STEPS} current={step} />
      </div>

      {/* Geniş ekranda (xl+) tam genişlik: solda iki kart, sağda yapışkan özet. Daha dar ekranda adımlar. */}
      <div
        className={[
          'grid items-start gap-6 transition-[grid-template-columns] duration-300',
          previewOpen
            ? 'xl:grid-cols-[minmax(0,1fr)_25rem] 2xl:grid-cols-[minmax(0,1fr)_28rem]'
            : 'xl:grid-cols-[minmax(0,1fr)_3.5rem]',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---- 1. Ürün bilgisi ---- */}
          <section aria-label="Temel Bilgi" className={`${cardClass} ${showOnStep(step, 0)}`}>
            <SectionTitle icon={Tag} title="Ürün Bilgisi" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-12">
              <div className="col-span-2 md:col-span-3 xl:col-span-3">
                <SelectField
                  label="Stok Tipi"
                  value={draft.stockType}
                  onChange={(v) => set('stockType', v)}
                  {...editable(stockTypes, 'stok tipi', (v) => set('stockType', v))}
                />
              </div>
              <div className="col-span-2 md:col-span-3 xl:col-span-4">
                {text('code', 'Stok Kodu')}
              </div>
              <div className="col-span-2 md:col-span-6 xl:col-span-5">
                {text('name', 'Stok Adı')}
              </div>
              <div className="col-span-2 md:col-span-3 xl:col-span-3">
                <SelectField
                  label="Marka"
                  options={lookups.brands}
                  value={draft.brand}
                  onChange={(v) => set('brand', v)}
                />
              </div>
              <div className="col-span-2 md:col-span-3 xl:col-span-3">
                <SelectField
                  label="KDV Departmanı"
                  value={draft.vatDepartment}
                  onChange={(v) => set('vatDepartment', v)}
                  {...editable(
                    vatDepartments,
                    'KDV departmanı',
                    (v) => set('vatDepartment', v),
                    true,
                  )}
                />
              </div>
              <div className="col-span-2 md:col-span-3 xl:col-span-3">
                <SelectField
                  label="Stok Nevi"
                  value={draft.stockKind}
                  onChange={(v) => set('stockKind', v)}
                  {...editable(stockKinds, 'stok nevi', (v) => set('stockKind', v))}
                />
              </div>
              <div className="col-span-2 md:col-span-3 xl:col-span-3">
                <SelectField
                  label="Envanter Takibi"
                  options={lookups.inventoryTracking}
                  value={draft.inventoryTracking}
                  onChange={(v) => set('inventoryTracking', v)}
                />
              </div>

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="col-span-2 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink md:col-span-6 xl:col-span-12"
              >
                Daha Fazla Alan
                <ChevronDown
                  className={`size-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {moreOpen ? (
                <>
                  <div className="col-span-1 md:col-span-3 xl:col-span-2">
                    {text('lowerLimit', 'Alt Limit', true)}
                  </div>
                  <div className="col-span-1 md:col-span-3 xl:col-span-2">
                    {text('upperLimit', 'Üst Limit', true)}
                  </div>
                  <div className="col-span-2 md:col-span-2 xl:col-span-2">
                    {text('gtip', 'GTIP Kodu')}
                  </div>
                  <div className="col-span-2 md:col-span-2 xl:col-span-3">
                    {text('origin', 'Menşei')}
                  </div>
                  <div className="col-span-2 md:col-span-2 xl:col-span-3">
                    <SelectField
                      label="Diğer Vergi Ekle"
                      options={lookups.otherTaxes}
                      value={draft.otherTax}
                      onChange={(v) => set('otherTax', v)}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>

          {/* ---- 2. Fiyat ve birimler ---- */}
          <section aria-label="Fiyat ve Birim" className={`${cardClass} ${showOnStep(step, 1)}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <SectionTitle icon={Coins} title="Fiyat ve Birimler" className="mb-0" />
              <PriceTabs
                lists={priceLists.options}
                activeId={activeList}
                onSelect={setActiveList}
                onAdd={(label) => void addPriceList(label)}
                onRemove={removePriceList}
              />
            </div>

            <div className="flex flex-col gap-4">
              {rows.map((row, index) => (
                <UnitCard
                  key={row.id}
                  row={row}
                  index={index}
                  lookups={lookups}
                  units={units}
                  onChange={(patch) => updateRow(row.id, patch)}
                  onRemove={rows.length > 1 ? () => removeRow(row.id) : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line-strong/60 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-50"
            >
              <Plus className="size-5" aria-hidden="true" />
              Birim Ekle
            </button>
          </section>
        </div>

        {/* ---- 3. Canlı özet (xl+ sağda yapışkan; daha dar ekranda son adım) ---- */}
        <div className={`xl:sticky xl:top-6 ${showOnStep(step, LAST_STEP)}`}>
          {/* Kapalıyken xl'de gizlenir; dar ekranda (son adım) her zaman görünür. */}
          <div className={previewOpen ? '' : 'xl:hidden'}>
            <StockPreview
              draft={draft}
              lookups={{
                ...lookups,
                units: units.options,
                stockTypes: stockTypes.options,
                vatDepartments: vatDepartments.options,
              }}
              rows={rows}
              priceListLabel={activeListLabel}
              footer={saveButton}
              onCollapse={() => setPreviewOpen(false)}
            />
          </div>
          {previewOpen ? null : (
            <div className="hidden xl:block">
              <CollapsedSummary
                draft={draft}
                saving={saving}
                onOpen={() => setPreviewOpen(true)}
                onSave={save}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dar ekranda adım düğmeleri (xl+ ekranda her şey tek sayfada) */}
      <div className="flex items-center justify-between gap-3 xl:hidden">
        {step > 0 ? (
          <Button
            variant="ghost"
            fullWidth={false}
            flow={false}
            onClick={() => setStep((s) => s - 1)}
            leadingIcon={<ArrowLeft className="size-5" aria-hidden="true" />}
          >
            Geri
          </Button>
        ) : (
          <span />
        )}
        {step < LAST_STEP ? (
          <Button fullWidth={false} onClick={next} className="min-w-40">
            Devam Et
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Kart başlığı: ikon rozeti + ad. Bölümleri görsel olarak ayırır. */
function SectionTitle({
  icon: Icon,
  title,
  className = 'mb-5',
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
}) {
  return (
    <h2 className={`flex items-center gap-3 text-lg font-extrabold tracking-tight ${className}`}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-ink"
      >
        <Icon className="size-5" />
      </span>
      {title}
    </h2>
  );
}
