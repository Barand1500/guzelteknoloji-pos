import { Coins, Plus, Tag, type LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { StockEditor } from '../hooks/useStockEditor';
import { BasicInfoSection } from './BasicInfoSection';
import { PriceTabs } from './PriceTabs';
import { StockSidePanel, useSidePanel, type SideBoxId } from './StockSidePanel';
import { UnitCard } from './UnitCard';

/** Bölüm kartı görünümü (iki kartta ortak). */
const cardClass =
  'relative animate-rise-in rounded-[1.75rem] border border-line bg-surface-raised p-5 shadow-soft focus-within:z-20 tablet:p-7';

/**
 * Geniş ekran düzeni (xl+): "Ürün Bilgisi" ve "Fiyat ve Birimler" kartları tam genişlikte; sağ
 * kenarda dikey sekmeler (Özet, Kategori, Fırsat) tıklanınca sola doğru panel açar. Kaydet formun
 * altındadır (panel açıkken panelin içindedir). Telefon/tablet düzeni: MobileStockLayout.
 */
export function DesktopStockLayout({
  editor,
  initialBox,
}: {
  editor: StockEditor;
  initialBox: SideBoxId | null;
}) {
  const { rows, lists, lookups, saving } = editor;
  const panel = useSidePanel(initialBox);

  const saveButton = (
    <Button onClick={() => void editor.save()} loading={saving} loadingLabel="Kaydediliyor…">
      Kaydet
    </Button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* ---- 1. Ürün bilgisi ---- */}
      <section aria-label="Temel Bilgi" className={cardClass}>
        <SectionTitle icon={Tag} title="Ürün Bilgisi" />
        <BasicInfoSection editor={editor} />
      </section>

      {/* ---- 2. Fiyat ve birimler ---- */}
      <section aria-label="Fiyat ve Birim" className={cardClass}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <SectionTitle icon={Coins} title="Fiyat ve Birimler" className="mb-0" />
          <PriceTabs
            lists={lists.priceLists.options}
            activeId={editor.activeList}
            onSelect={editor.setActiveList}
            onAdd={(label) => void editor.addPriceList(label)}
            onRemove={editor.removePriceList}
          />
        </div>

        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <UnitCard
              key={row.id}
              row={row}
              index={index}
              lookups={lookups}
              units={lists.units}
              onChange={(patch) => editor.updateRow(row.id, patch)}
              onRemove={rows.length > 1 ? () => editor.removeRow(row.id) : undefined}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={editor.addRow}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-dashed border-line-strong/60 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-50"
        >
          <Plus className="size-5" aria-hidden="true" />
          Birim Ekle
        </button>
      </section>

      {/* ---- 3. Kaydet (panel açıkken Kaydet panelin içindedir) ---- */}
      {panel.openId === null ? <div className="flex justify-end">{saveButton}</div> : null}

      <StockSidePanel editor={editor} panel={panel} />
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
