import { Fragment, useState } from 'react';
import { FolderTree, Package, ScrollText, Search, Sparkles, Tags, type LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePublishDockTabs } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useSeo } from '../hooks/useSeo';
import { SEO_TABS, seoTab, type SeoKind, type SeoTab } from '../types';
import { SeoStackRow, SeoTableRow, type RowActions } from './SeoRow';

const TAB_ICONS: Record<SeoKind, LucideIcon> = {
  kategori: FolderTree,
  marka: Tags,
  firsat: Sparkles,
  urun: Package,
  'sabit-sayfa': ScrollText,
};

const tabChipStyle = (active: boolean) =>
  `flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
    active ? 'bg-brand-50 text-brand-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
  }`;

/**
 * Ayarlar › SEO: Kategori · Marka · Fırsat · Ürün · Sabit Sayfa sekmeleri. Referanstaki tablo düzeni:
 * URL | TITLE | DESCRIPTION kolonları; yeşil "+" 301 yönlendirme ekler, 301 satırları ana satırın
 * altında kendi başlık/açıklamasıyla listelenir. Sekmeler sayfanın üstünde hap biçimlidir ve alt
 * çubukta da görünür; arama kartın içinde sağda durur. Arama ve sayfalama sunucuda yapılır; sekme
 * adreste tutulur (?sekme=marka).
 */
export function SeoPage() {
  const [params, setParams] = useSearchParams();
  const tab = seoTab(params.get('sekme'));
  usePublishDockTabs({
    items: SEO_TABS.map((t) => ({ id: t.id, label: t.label, icon: TAB_ICONS[t.id] })),
    value: tab.id,
    split: 2,
    onChange: (id) => setParams(id === 'kategori' ? {} : { sekme: id }, { replace: true }),
  });

  const selectTab = (id: SeoKind) => setParams(id === 'kategori' ? {} : { sekme: id }, { replace: true });

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      <div
        role="tablist"
        aria-label="SEO kayıt türleri"
        className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SEO_TABS.map((t) => {
          const Icon = TAB_ICONS[t.id];
          const active = t.id === tab.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              className={tabChipStyle(active)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>
      {/* key: sekme değişince arama/sayfa taze başlar (eski sekmenin süzgeci taşmaz). */}
      <SeoTabPanel key={tab.id} tab={tab} />
    </div>
  );
}

/** Bir sekmenin içeriği: arama, tablo ve sayfalama. Durum sekmeyle sınırlıdır. */
function SeoTabPanel({ tab }: { tab: SeoTab }) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const size = Math.max(1, Number(sizeText) || 10);
  const store = useSeo(tab.id, query, page, size);

  if (store.error && !store.data) return <Alert tone="error">{store.error}</Alert>;
  if (!store.data) return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  const { items, total } = store.data;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  const listLabel = `${tab.label} SEO kayıtları`;
  const actions: RowActions = {
    onSave: store.save,
    onAddRedirect: store.addRedirect,
    onUpdateRedirect: store.updateRedirect,
    onRemoveRedirect: store.removeRedirect,
  };

  return (
    <div role="region" aria-label={tab.label} className="animate-fade-in flex flex-col gap-3">
      {store.sample ? <SampleNote /> : null}
      <div className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
        <div className="border-b border-line px-3 py-2.5">
          <div className="w-full sm:ml-auto sm:w-80">
            <SearchField
              value={query}
              onChange={(t) => {
                setQuery(t);
                setPage(1);
              }}
              label={`${tab.noun} ara`}
              placeholder={`${total.toLocaleString('tr-TR')} ${tab.noun} kaydında ara…`}
            />
          </div>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Search className="size-8 text-brand-600/60" aria-hidden="true" />
            {tab.id === 'sabit-sayfa' && !query.trim() ? (
              <>
                <p className="font-bold">Henüz sabit sayfa eklenmemiş</p>
                <p className="text-sm text-ink-muted">Sabit sayfalar hazır olduğunda SEO ayarları burada listelenir.</p>
              </>
            ) : (
              <p className="font-bold">Aramaya uyan {tab.noun} yok</p>
            )}
          </div>
        ) : wide ? (
          <table aria-label={listLabel} className="w-full border-collapse text-sm">
            <thead className="border-b border-line bg-surface-muted/50 text-left text-xs font-extrabold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">URL</th>
                <th className="w-72 px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="w-16 px-2 py-2.5">
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((row) => (
                <Fragment key={row.id}>
                  <SeoTableRow row={row} actions={actions} />
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <ul aria-label={listLabel} className="divide-y divide-line">
            {items.map((row) => (
              <SeoStackRow key={row.id} row={row} actions={actions} />
            ))}
          </ul>
        )}
      </div>
      <PaginationBar
        total={total}
        from={total === 0 ? 0 : (current - 1) * size + 1}
        to={Math.min(total, current * size)}
        page={current}
        pageCount={pageCount}
        onPageChange={setPage}
        sizeText={sizeText}
        onSizeTextChange={(t) => {
          setSizeText(t);
          setPage(1);
        }}
        noun={tab.noun}
      />
    </div>
  );
}
