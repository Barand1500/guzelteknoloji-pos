import {
  FolderTree,
  LayoutList,
  Sparkles,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { StockEditor } from '../hooks/useStockEditor';
import { CategoryBox } from './CategoryBox';
import { AttributeGroupFold } from './AttributeGroupFold';
import { DealBox } from './DealBox';
import { StockPreview } from './StockPreview';

/** Yan sekmelerin kimlikleri (adres çubuğundaki `?ac=` değeriyle de açılır). */
export type SideBoxId = 'ozet' | 'kategori' | 'firsat' | 'ozellik';

export const SIDE_BOX_IDS: readonly SideBoxId[] = ['ozet', 'kategori', 'firsat', 'ozellik'];

interface SideTab {
  id: SideBoxId;
  /** Sekmede harfler alt alta yazılan kısa ad. */
  label: string;
  /** Panelin başlığı. */
  title: string;
  icon: LucideIcon;
}

const TABS: readonly SideTab[] = [
  { id: 'ozet', label: 'Özet', title: 'Özet', icon: LayoutList },
  { id: 'kategori', label: 'Kategori', title: 'Kategori', icon: FolderTree },
  { id: 'firsat', label: 'Fırsat', title: 'Fırsat Yönetimi', icon: Sparkles },
  { id: 'ozellik', label: 'Özellik', title: 'Ürün Özellikleri', icon: SlidersHorizontal },
];

const LOCKED = 'Sunucuya bağlanınca açılır';
const PANEL_ID = 'yan-panel';

/** Hangi yan panelin açık olduğu (hiçbiri = kapalı). Düzenler, panel açıkken sayfa düğmelerini gizlemek için kullanır. */
export function useSidePanel(initialBox: SideBoxId | null) {
  const [openId, setOpenId] = useState<SideBoxId | null>(initialBox);
  return {
    openId,
    /** Aynı sekmeye tekrar basılırsa panel kapanır. */
    toggle: (id: SideBoxId) => setOpenId((current) => (current === id ? null : id)),
    close: () => setOpenId(null),
  };
}

export type SidePanelState = ReturnType<typeof useSidePanel>;

interface StockSidePanelProps {
  editor: StockEditor;
  panel: SidePanelState;
}

/**
 * Sağ kenardaki dikey sekmeler (Özet, Kategori, Fırsat) ve sola doğru açılan panel. Sekmeye
 * tıklayınca panel açılır, aynı sekmeye (ya da ✕ / Esc ile) kapanır; başka sekmeye basınca panelin
 * içeriği o sekmeye döner. Kapalıyken yalnızca ince sekmeler görünür, form tam genişliktedir.
 * Kategori ve fırsat seçenekleri sunucudan gelmiyorsa (henüz bağlı değil) o sekmeler kilitlidir
 * ve seçim kaydedilmiş gibi davranılmaz.
 */
export function StockSidePanel({ editor, panel }: StockSidePanelProps) {
  const { openId, toggle, close } = panel;
  const { draft, lists, lookups, rows, extras, extraOptions } = editor;
  const active = TABS.find((t) => t.id === openId) ?? null;

  // Esc paneli kapatır (açık bir pencere Esc'yi kendisi karşılamışsa karışmaz).
  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openId, close]);

  const counts: Record<SideBoxId, number> = {
    ozet: 0,
    kategori: extras.categoryIds.length,
    firsat: extras.dealIds.length,
    ozellik: extras.attributeValueIds?.length ?? 0,
  };
  const pill: Record<SideBoxId, string> = {
    ozet: '', // Özet içeriğinde doluluk zaten yazılı
    kategori: counts.kategori > 0 ? `${counts.kategori} seçili` : '',
    firsat: counts.firsat > 0 ? `${counts.firsat} açık` : '',
    ozellik: counts.ozellik > 0 ? `${counts.ozellik} seçili` : '',
  };

  return (
    <>
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Yan sekmeler"
        className="fixed top-24 right-2 z-30 flex flex-col gap-2"
      >
        {TABS.map((tab) => {
          const locked = tab.id !== 'ozet' && extraOptions === null;
          const open = openId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`yan-sekme-${tab.id}`}
              aria-selected={open}
              aria-controls={PANEL_ID}
              disabled={locked}
              title={locked ? LOCKED : undefined}
              onClick={() => toggle(tab.id)}
              className={[
                'relative flex w-10 flex-col items-center gap-2 rounded-2xl border py-3 shadow-soft transition-colors sm:w-11',
                open
                  ? 'border-brand-600 bg-brand-50 text-brand-ink'
                  : 'border-line bg-surface-raised text-ink-muted hover:border-brand-500 hover:text-ink',
                locked ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              <tab.icon className="size-4 sm:size-5" aria-hidden="true" />
              <span
                lang="tr"
                className="text-[0.6875rem] font-extrabold tracking-wider uppercase [text-orientation:upright] [writing-mode:vertical-rl] sm:text-xs"
              >
                {tab.label}
              </span>
              {counts[tab.id] > 0 ? (
                <span
                  aria-hidden="true"
                  className={[
                    'flex min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[0.625rem] font-bold text-white',
                  ].join(' ')}
                >
                  {counts[tab.id]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {active ? (
        <section
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={`yan-sekme-${active.id}`}
          className="fixed top-24 right-14 z-30 flex max-h-[calc(100dvh-13rem)] w-[min(22rem,calc(100vw-4.5rem))] origin-top-right animate-slide-in-right flex-col gap-4 rounded-[1.75rem] border border-line bg-surface-raised p-5 shadow-card sm:right-16 md:max-h-[calc(100dvh-8rem)]"
        >
          <header className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink"
            >
              <active.icon className="size-5" />
            </span>
            <h2 className="min-w-0 flex-1 truncate text-base font-extrabold">{active.title}</h2>
            {pill[active.id] ? (
              <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-success">
                {pill[active.id]}
              </span>
            ) : null}
            <button
              type="button"
              onClick={close}
              aria-label="Paneli kapat"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted transition-colors hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div key={active.id} className="min-h-0 flex-1 animate-fade-in overflow-y-auto">
            {active.id === 'ozet' ? (
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
            ) : null}
            {active.id === 'kategori' && extraOptions ? (
              <CategoryBox
                categories={extraOptions.categories}
                selectedIds={extras.categoryIds}
                onToggle={editor.toggleCategory}
              />
            ) : null}
            {active.id === 'firsat' && extraOptions ? (
              <DealBox
                deals={extraOptions.deals}
                selectedIds={extras.dealIds}
                onToggle={editor.toggleDeal}
              />
            ) : null}
            {active.id === 'ozellik' && extraOptions?.attributes ? (
              <div className="flex flex-col gap-4">
                {extraOptions.attributes.templates
                  .filter(
                    (t) =>
                      t.allProducts ||
                      t.categoryIds.some((id) => extras.categoryIds.includes(id)) ||
                      extraOptions.attributes!.groups.some(
                        (g) =>
                          g.templateId === t.id &&
                          extraOptions.attributes!.values.some(
                            (v) =>
                              v.groupId === g.id && (extras.attributeValueIds ?? []).includes(v.id),
                          ),
                      ),
                  )
                  .map((template) => (
                    <section key={template.id}>
                      <h3 className="font-bold">{template.name}</h3>
                      {extraOptions
                        .attributes!.groups.filter((g) => g.templateId === template.id)
                        .map((group) => (
                          <AttributeGroupFold
                            key={group.id}
                            name={group.name}
                            selected={
                              extraOptions.attributes!.values.filter(
                                (v) =>
                                  v.groupId === group.id &&
                                  (extras.attributeValueIds ?? []).includes(v.id),
                              ).length
                            }
                          >
                            {extraOptions
                              .attributes!.values.filter((v) => v.groupId === group.id)
                              .map((value) => (
                                <label
                                  key={value.id}
                                  className="flex items-center gap-2 py-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(extras.attributeValueIds ?? []).includes(value.id)}
                                    onChange={() =>
                                      editor.toggleAttribute(
                                        value.id,
                                        group.id,
                                        group.multiple || group.variant,
                                      )
                                    }
                                  />
                                  {value.name}
                                </label>
                              ))}
                          </AttributeGroupFold>
                        ))}
                    </section>
                  ))}
                <p className="text-xs text-ink-muted">
                  Kategoriye uygun şablonlar ve tüm ürünlere açık şablonlar gösterilir.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
