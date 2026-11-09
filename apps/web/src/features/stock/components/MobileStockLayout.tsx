import { Coins, type LucideIcon, Package, Plus, Ruler, ScanBarcode, Settings2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { usePublishSaveAction } from '../../app-shell/save-action';
import type { StockEditor } from '../hooks/useStockEditor';
import { blockTotals, formatMoney, getCompletion, marginPercent } from '../stock.calc';
import type { UnitRow } from '../types';
import { BasicInfoSection } from './BasicInfoSection';
import { KasaPriceEditor } from './KasaPriceEditor';
import { PriceTabs } from './PriceTabs';
import { StockSidePanel, useSidePanel, type SideBoxId } from './StockSidePanel';
import {
  UnitBarcodeField,
  UnitHeaderFields,
  UnitMeasureFields,
  type UnitPartProps,
} from './UnitCard';
import { UnitPager } from './UnitPager';

type TabId = 'urun' | 'fiyat' | 'barkod' | 'olcu';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'urun', label: 'Ürün', icon: Package },
  { id: 'fiyat', label: 'Fiyat', icon: Coins },
  { id: 'barkod', label: 'Barkod', icon: ScanBarcode },
  { id: 'olcu', label: 'Ölçü', icon: Ruler },
];

const slideClass = 'rounded-3xl border border-line bg-surface-raised p-4 shadow-soft';

/**
 * Telefon / tablet düzeni: üstte Ürün · Fiyat · Barkod · Ölçü sekmeleri, birimler yana
 * kaydırılan kartlar, Kaydet alt çubuktaki "+" düğmesidir. Seçili birim sekmeler arasında korunur.
 */
export function MobileStockLayout({
  editor,
  initialBox,
}: {
  editor: StockEditor;
  initialBox: SideBoxId | null;
}) {
  const [tab, setTab] = useState<TabId>('urun');
  const panel = useSidePanel(initialBox);
  const [activeUnit, setActiveUnit] = useState(0);
  const { rows, lists, lookups, errors } = editor;
  const unitIndex = Math.min(activeUnit, rows.length - 1);
  const activeRow = rows[unitIndex];
  // Fiyat sekmesinde birim ayarları (birim, çarpan, ana/varsayılan, silme) başta kapalıdır.
  const [unitSettingsOpen, setUnitSettingsOpen] = useState(false);

  const part = (row: UnitRow, index: number): UnitPartProps => ({
    row,
    index,
    lookups,
    units: lists.units,
    onChange: (patch) => editor.updateRow(row.id, patch),
  });

  // Alt çubuktaki "+" → "Kaydet". Eksik alan çıkarsa Ürün sekmesine dönülür ki hatalar görünsün.
  usePublishSaveAction(
    editor.saved
      ? null
      : { onSave: () => void editor.save(() => setTab('urun')), saving: editor.saving },
  );

  const addUnit = () => {
    editor.addRow();
    setActiveUnit(rows.length); // yeni birim = son sıra
  };

  const unitLabel = (row: UnitRow) =>
    lists.units.options.find((o) => o.value === row.unit)?.label ?? row.unit;

  /** Barkod/Ölçü sekmelerinde kartın başlığı: hangi birimi düzenlediğini gösterir. */
  const badge = (row: UnitRow): ReactNode => (
    <p className="mb-3 flex items-center gap-2 text-sm font-bold">
      <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-ink">
        {unitLabel(row)}
        {row.multiplier && row.multiplier !== '1' ? ` × ${row.multiplier}` : ''}
      </span>
      {row.isDefault ? <span className="text-xs text-ink-muted">Varsayılan</span> : null}
    </p>
  );

  const pager = (render: (row: UnitRow, index: number) => ReactNode, label: string) => (
    <UnitPager
      key={`${tab}-${editor.activeList}`}
      label={label}
      active={unitIndex}
      onActiveChange={setActiveUnit}
      onAdd={addUnit}
      slides={rows.map((row, index) => (
        <article key={row.id} aria-label={`${index + 1}. birim`} className={slideClass}>
          {render(row, index)}
        </article>
      ))}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Yapışkan sekme çubuğu */}
      <div
        role="tablist"
        aria-label="Stok kartı bölümleri"
        className="sticky top-0 z-20 -mx-4 flex border-b border-line bg-surface/90 px-4 backdrop-blur-md tablet:-mx-8 tablet:px-8"
      >
        {TABS.map((t) => {
          const selected = t.id === tab;
          const hasError = t.id === 'urun' && Object.values(errors).some(Boolean);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`sekme-${t.id}`}
              aria-selected={selected}
              aria-controls="sekme-icerik"
              onClick={() => setTab(t.id)}
              className={[
                'relative flex min-h-12 flex-1 items-center justify-center gap-1.5 text-sm font-bold transition-colors',
                selected ? 'text-brand-ink' : 'text-ink-muted',
              ].join(' ')}
            >
              <t.icon className="size-4" aria-hidden="true" />
              {t.label}
              {hasError ? (
                <span aria-label="Eksik alan var" className="size-2 rounded-full bg-danger" />
              ) : null}
              <span
                aria-hidden="true"
                className={[
                  'absolute inset-x-[22%] bottom-0 h-[3px] rounded-full bg-brand-600 transition-opacity',
                  selected ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>

      {tab !== 'fiyat' ? <SummaryStrip editor={editor} /> : null}

      <div
        role="tabpanel"
        id="sekme-icerik"
        aria-labelledby={`sekme-${tab}`}
        className="flex flex-col gap-4"
      >
        {tab === 'urun' ? (
          <section aria-label="Ürün Bilgisi" className={`${slideClass} animate-rise-in`}>
            <BasicInfoSection editor={editor} />
          </section>
        ) : null}

        {tab === 'fiyat' ? (
          <>
            <PriceTabs
              lists={lists.priceLists.options}
              activeId={editor.activeList}
              onSelect={(id) => {
                setActiveUnit(0);
                editor.setActiveList(id);
              }}
              onAdd={(label) => {
                setActiveUnit(0);
                void editor.addPriceList(label);
              }}
              onRemove={editor.removePriceList}
            />

            {/* Birim çipleri: dokununca o birimin fiyatı düzenlenir; dişli = birim ayarları */}
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div role="radiogroup" aria-label="Birim" className="flex gap-2">
                {rows.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    role="radio"
                    aria-checked={index === unitIndex}
                    onClick={() => setActiveUnit(index)}
                    className={[
                      'min-h-10 rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors',
                      index === unitIndex
                        ? 'border-brand-600 bg-brand-700 text-white'
                        : 'border-field-border bg-surface-raised text-ink-muted',
                    ].join(' ')}
                  >
                    {unitLabel(row)}
                    {row.multiplier && row.multiplier !== '1' ? ` × ${row.multiplier}` : ''}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addUnit}
                aria-label="Birim Ekle"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong/60 text-brand-ink"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setUnitSettingsOpen((v) => !v)}
                aria-expanded={unitSettingsOpen}
                aria-label="Birim ayarları"
                className={[
                  'ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
                  unitSettingsOpen ? 'bg-brand-50 text-brand-ink' : 'text-ink-muted',
                ].join(' ')}
              >
                <Settings2 className="size-5" aria-hidden="true" />
              </button>
            </div>

            {unitSettingsOpen && activeRow ? (
              <div className={`${slideClass} animate-fade-in`}>
                <UnitHeaderFields
                  {...part(activeRow, unitIndex)}
                  onRemove={
                    rows.length > 1
                      ? () => {
                          editor.removeRow(activeRow.id);
                          setUnitSettingsOpen(false);
                        }
                      : undefined
                  }
                />
              </div>
            ) : null}

            {activeRow ? (
              <KasaPriceEditor
                key={activeRow.id}
                row={activeRow}
                unitLabel={unitLabel(activeRow)}
                lookups={lookups}
                onChange={(patch) => editor.updateRow(activeRow.id, patch)}
              />
            ) : null}
          </>
        ) : null}

        {tab === 'barkod'
          ? pager(
              (row, index) => (
                <>
                  {badge(row)}
                  <UnitBarcodeField {...part(row, index)} />
                </>
              ),
              'Birim barkodları',
            )
          : null}

        {tab === 'olcu'
          ? pager(
              (row, index) => (
                <>
                  {badge(row)}
                  <UnitMeasureFields {...part(row, index)} />
                </>
              ),
              'Birim ölçüleri',
            )
          : null}
      </div>

      {/* Sağ kenar sekmeleri */}
      <StockSidePanel editor={editor} panel={panel} />
    </div>
  );
}

/** Sekmelerin altında ince, canlı özet: ürün adı, varsayılan birimin KDV dahil satış fiyatı, kâr, doluluk. */
function SummaryStrip({ editor }: { editor: StockEditor }) {
  const { draft, rows } = editor;
  const row = rows.find((r) => r.isDefault) ?? rows[0];
  const checks = getCompletion(draft);
  const done = checks.filter((c) => c.ok).length;
  const margin = row ? marginPercent(row) : null;

  return (
    <div
      aria-label="Kart özeti"
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-4 py-2.5"
    >
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${draft.name ? '' : 'text-ink-muted'}`}>
          {draft.name || 'Yeni ürün'}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {row ? (
            <>
              KDV Dahil{' '}
              <span className="font-bold text-ink">
                {formatMoney(blockTotals(row.sale).incl, row.sale.currency)}
              </span>
              {margin !== null ? (
                <span className="font-semibold text-success">
                  {' '}
                  · Kâr %{margin.toFixed(1).replace('.', ',')}
                </span>
              ) : null}
            </>
          ) : null}
        </p>
      </div>
      <span
        title="Kart doluluğu"
        className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-ink"
      >
        {done}/{checks.length}
      </span>
    </div>
  );
}
