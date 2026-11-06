import { LayoutList, Sparkles, FolderTree } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { StockEditor } from '../hooks/useStockEditor';
import { getCompletion } from '../stock.calc';
import { CategoryBox } from './CategoryBox';
import { DealBox } from './DealBox';
import { SideBox } from './SideBox';
import { StockPreview } from './StockPreview';

/** Yan paneldeki kutuların kimlikleri (adres çubuğundaki `?ac=` değeriyle de açılır). */
export type SideBoxId = 'ozet' | 'kategori' | 'firsat';

export const SIDE_BOX_IDS: readonly SideBoxId[] = ['ozet', 'kategori', 'firsat'];

interface StockSidePanelProps {
  editor: StockEditor;
  /** Başlangıçta hangi kutu açık gelsin (yok = hepsi kapalı). */
  initialBox: SideBoxId | null;
  /** Telefonda Özet ayrı bir şerittir; orada burada tekrar edilmez. */
  showSummary: boolean;
  /** Kutuların altına konan eylem (masaüstünde Kaydet). */
  footer?: ReactNode;
}

const LOCKED = 'Sunucuya bağlanınca açılır';

/**
 * Stok kartının yan kutuları: Özet, Kategori, Fırsat Yönetimi. Kapalıyken ince yatay dikdörtgenlerdir;
 * birine tıklayınca olduğu yerde açılır, tekrar tıklayınca kapanır; birini açmak diğerini kapatır.
 * Kategori ve fırsat seçenekleri sunucudan gelmiyorsa (henüz bağlı değil) bu kutular kilitli görünür
 * ve seçim kaydedilmiş gibi davranılmaz.
 */
export function StockSidePanel({ editor, initialBox, showSummary, footer }: StockSidePanelProps) {
  const [openId, setOpenId] = useState<SideBoxId | null>(initialBox);
  const toggle = (id: SideBoxId) => setOpenId((current) => (current === id ? null : id));

  const { draft, lists, lookups, rows, extras, extraOptions } = editor;
  const checks = getCompletion(draft);
  const done = checks.filter((c) => c.ok).length;

  const categoryName = (id: string) =>
    extraOptions?.categories.find((c) => c.id === id)?.name ?? id;
  const categorySummary =
    extras.categoryIds.length === 0
      ? 'Seçilmedi'
      : extras.categoryIds.length === 1
        ? categoryName(extras.categoryIds[0] ?? '')
        : `${categoryName(extras.categoryIds[0] ?? '')} +${extras.categoryIds.length - 1}`;
  const dealSummary = extras.dealIds.length === 0 ? 'Seçilmedi' : `${extras.dealIds.length} seçili`;

  return (
    <aside aria-label="Yan kutular" className="flex flex-col gap-2.5">
      {showSummary ? (
        <SideBox
          icon={LayoutList}
          title="Özet"
          summary={`${draft.name || 'Ürün adı'} · ${done}/${checks.length}`}
          open={openId === 'ozet'}
          onToggle={() => toggle('ozet')}
        >
          <StockPreview
            draft={draft}
            lookups={{
              ...lookups,
              units: lists.units.options,
              stockTypes: lists.stockTypes.options,
              vatDepartments: lists.vatDepartments.options,
            }}
            rows={rows}
            priceListLabel={editor.activeListLabel}
          />
        </SideBox>
      ) : null}

      <SideBox
        icon={FolderTree}
        title="Kategori"
        summary={extraOptions ? categorySummary : ''}
        open={openId === 'kategori'}
        onToggle={() => toggle('kategori')}
        {...(extraOptions ? {} : { lockedReason: LOCKED })}
      >
        {extraOptions ? (
          <CategoryBox
            categories={extraOptions.categories}
            selectedIds={extras.categoryIds}
            onToggle={editor.toggleCategory}
          />
        ) : null}
      </SideBox>

      <SideBox
        icon={Sparkles}
        title="Fırsat Yönetimi"
        summary={extraOptions ? dealSummary : ''}
        open={openId === 'firsat'}
        onToggle={() => toggle('firsat')}
        {...(extraOptions ? {} : { lockedReason: LOCKED })}
      >
        {extraOptions ? (
          <DealBox
            deals={extraOptions.deals}
            selectedIds={extras.dealIds}
            onToggle={editor.toggleDeal}
          />
        ) : null}
      </SideBox>

      {footer}
    </aside>
  );
}
