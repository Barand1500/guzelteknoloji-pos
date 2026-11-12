import { Fragment } from 'react';
import { FolderTree, Package, ScrollText, Search, Sparkles, Tags, type LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePublishDockTabs } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useSeo } from '../hooks/useSeo';
import { SEO_TABS, seoTab, type SeoKind } from '../types';
import { SeoStackRow, SeoTableRow, type RowActions } from './SeoRow';

const TAB_ICONS: Record<SeoKind, LucideIcon> = {
  kategori: FolderTree,
  marka: Tags,
  firsat: Sparkles,
  urun: Package,
  'sabit-sayfa': ScrollText,
};

/**
 * Ayarlar › SEO: Kategori · Marka · Fırsat · Ürün · Sabit Sayfa sekmeleri. Referanstaki tablo düzeni:
 * URL | TITLE | DESCRIPTION kolonları; yeşil "+" 301 yönlendirme ekler, 301 satırları ana satırın
 * altında kendi başlık/açıklamasıyla listelenir. Telefonda tablo yığılır. Arama ve sayfalama
 * sunucuda yapılır; sekme adreste tutulur (?sekme=marka).
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

  const wide = useMediaQuery('(min-width: 48rem)');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const size = Math.max(1, Number(sizeText) || 10);
  // Sekme değişince arama eski sekmenin süzgeciyle yeni listeyi boş göstermesin.
  useEffect(() => {
    setQuery('');
    setPage(1);
  }, [tab.id]);
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
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      <div key={tab.id} role="region" aria-label={tab.label} className="animate-fade-in flex flex-col gap-3">
        <SearchField
          value={query}
          onChange={(t) => {
            setQuery(t);
            setPage(1);
          }}
          label={`${tab.noun} ara`}
          placeholder={`${total.toLocaleString('tr-TR')} ${tab.noun} kaydında ara…`}
        />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-line-strong/50 bg-surface-raised px-6 py-12 text-center">
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
          <div className="overflow-hidden rounded-3xl border border-line bg-surface-raised">
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
          </div>
        ) : (
          <ul aria-label={listLabel} className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface-raised">
            {items.map((row) => (
              <SeoStackRow key={row.id} row={row} actions={actions} />
            ))}
          </ul>
        )}
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
    </div>
  );
}
