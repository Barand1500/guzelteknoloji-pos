import { CatalogImage } from '../../../components/ui/CatalogImage';
import { FileSpreadsheet, Images, ListChecks, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import {
  BULK_IMAGES_PATH,
  DEALS_PATH,
  STOCK_CREATE_PATH,
  stockCopyPath,
  stockEditPath,
} from '../../../config/navigation';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useProductPage } from '../hooks/useProductPage';
import { dataError } from '../../../lib/catalog-data';
import {
  activeFilterCount,
  emptyFilters,
  COST_VIEW,
  type PriceView,
  type ProductFilters,
  type ProductItem,
} from '../types';
import { ProductFilterSheet } from './ProductFilterSheet';
import { ProductImagesSheet } from './ProductImagesSheet';
import { ProductImportSheet } from './ProductImportSheet';
import { ProductMenuSheet } from './ProductMenuSheet';
import { BulkActionsSheet } from './BulkActionsSheet';
import { UndoToast } from '../../../components/ui/UndoToast';
import { ProductRow } from './ProductRow';
import { ProductTable } from './ProductTable';

/** Dar ekranda üçten fazla fiyat listesi açılır kutuda gösterilir. */
const MAX_SEGMENTS = 3;

/**
 * Ürün Liste ekranı. Telefonda sıkı satırlar: dokununca satır açılıp tüm fiyat listeleri, stok/satış
 * anahtarları ve işlemler görünür; üstteki seçici satırda hangi fiyat listesinin (ya da Alış'ın)
 * görüneceğini belirler. Seçim modunda kutucuklar çıkar ve alttan toplu işlem çubuğu açılır.
 * Masaüstünde tablodur: sütunlar kullanıcının KENDİ fiyat listeleridir ve kendi adlarını taşır
 * (sabit "Fiyat 1/2/3" yok); dörtten fazla liste varsa hangilerinin görüneceği seçilir.
 * "Ekle" mevcut stok kartı oluşturma ekranını açar.
 */
/** Geniş ekranda üst çubuktaki simgeli araç düğmesi (süzgeç düğmesiyle aynı ölçü). */
const TOOL =
  'flex size-12 shrink-0 items-center justify-center rounded-full border border-field-border text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink';

const SMALL_TOOL =
  'flex size-11 shrink-0 items-center justify-center rounded-full border border-field-border text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink';

export function ProductsView() {
  const desktop = useMediaQuery('(min-width: 64rem)');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [sizeText, setSizeText] = useState('10');
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(sizeText, 10) || 10));
  const {
    products: allProducts,
    total: allTotal,
    page: currentPage,
    priceLists,
    filterOptions,
    loading,
    error,
    refresh,
    setStockTracking,
    setSales,
    remove,
    bulk,
    selectIds,
  } = useProductPage({ search: query, filters, page, pageSize });
  const [selectionBusy, setSelectionBusy] = useState(false);
  const selectionRevision = useRef(0);
  const [priceView, setPriceView] = useState<PriceView>('');
  const [searchParams] = useSearchParams();
  const [priceDirection, setPriceDirection] = useState('satis');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Resme çift tıklanan ürün (görselleri değiştir / daha fazla yükle penceresi).
  const [imagesFor, setImagesFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [zoomFor, setZoomFor] = useState<string | null>(null);
  // Silme "geri alınabilir": ürünler hemen listeden gizlenir, süre dolunca gerçekten silinir.
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    label: string;
    key: number;
  } | null>(null);
  const pendingRef = useRef(pendingDelete);
  useEffect(() => {
    pendingRef.current = pendingDelete;
  });
  const hiddenIds = useMemo(() => new Set(pendingDelete?.ids ?? []), [pendingDelete]);
  const products = useMemo(
    () => allProducts.filter((p) => !hiddenIds.has(p.id)),
    [allProducts, hiddenIds],
  );
  const total = Math.max(0, allTotal - hiddenIds.size);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  };

  const viewOptions = useMemo(
    () => [...priceLists.map((l) => ({ value: l.id, label: l.name }))],
    [priceLists],
  );
  // Adreste ?liste=AD varsa (Fiyat Listeleri sayfasındaki "Ürünleri gör") o liste açılır.
  const wanted = (searchParams.get('liste') ?? '').toLocaleLowerCase('tr');
  const wantedList = wanted
    ? viewOptions.find((o) => o.label.toLocaleLowerCase('tr') === wanted)?.value
    : undefined;
  // Seçili görünüm artık yoksa (liste silindi) ilk listeye dönülür.
  const activeList = viewOptions.some((o) => o.value === priceView)
    ? priceView
    : (wantedList ?? viewOptions[0]?.value ?? COST_VIEW);
  const activeView = priceDirection === 'alis' ? `cost:${activeList}` : activeList;
  const filterCount = activeFilterCount(filters);
  const visible = products;
  const paging = {
    pageItems: products,
    total,
    page: currentPage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    from: total === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    to: total === 0 ? 0 : (currentPage - 1) * pageSize + products.length,
    setPage,
    sizeText,
  };
  const changePageSize = (text: string) => {
    setSizeText(text);
    setPage(1);
    setSelected(new Set());
    selectionRevision.current++;
  };

  const byId = (id: string | null) => products.find((p) => p.id === id) ?? null;
  const menuProduct = byId(menuFor);
  const zoomProduct = byId(zoomFor);
  const imagesForProduct = byId(imagesFor);
  // Seçimler sayfa değişince korunur; arama ve süzgeç değişince temizlenir.
  const selectedIds = [...selected];
  const anySelected = selectedIds.length > 0;

  // Düzenle ve Kopya, stok kartı ekranını açar (dolu gelir); ayrı bir ürün düzenle ekranı yoktur.
  const edit = (p: ProductItem) => navigate(stockEditPath(p.id));
  const copy = (p: ProductItem) => navigate(stockCopyPath(p.id));
  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id) && next.size < 1000) next.add(id);
      return next;
    });
  const stopSelecting = () => {
    selectionRevision.current++;
    setSelecting(false);
    setSelected(new Set());
  };
  const applyFilters = (next: ProductFilters) => {
    selectionRevision.current++;
    setFilters(next);
    setPage(1);
    setSelected(new Set());
    setExpandedId(null);
  };
  const selectAll = async () => {
    const request = ++selectionRevision.current;
    setSelectionBusy(true);
    try {
      const ids = await selectIds();
      if (request === selectionRevision.current) setSelected(new Set(ids));
    } catch (e) {
      showNotice(dataError(e));
    } finally {
      setSelectionBusy(false);
    }
  };
  /** Bekleyen silmeyi kalıcı yapar (süre doldu, başka silme başladı ya da sayfadan çıkıldı). */
  const commitDelete = (pending: { ids: string[] } | null) => {
    if (!pending) return;
    setPendingDelete((current) => (current && current.ids === pending.ids ? null : current));
    void remove(pending.ids);
  };
  const requestDelete = (ids: string[], label: string) => {
    commitDelete(pendingRef.current); // önceki bekleyen silme kalıcı olur
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    setPendingDelete({ ids, label, key: Date.now() });
  };
  // Sayfadan çıkılırken bekleyen silme kaybolmasın.
  const commitRef = useRef(commitDelete);
  useEffect(() => {
    commitRef.current = commitDelete;
  });
  useEffect(() => () => commitRef.current(pendingRef.current), []);

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    );
  } else if (error && total === 0) {
    content = null;
  } else if (total === 0 && !query.trim() && filterCount === 0) {
    content = (
      <EmptyState
        title="Henüz ürün yok"
        text="İlk stok kartını ekleyerek başla ya da Excel ile toplu ürün yükle."
        action={
          <Button fullWidth={false} flow={false} onClick={() => navigate(STOCK_CREATE_PATH)}>
            İlk Ürünü Ekle
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        title="Eşleşen ürün yok"
        text="Aramaya ya da süzgeçlere uyan ürün bulunamadı."
        action={
          filterCount > 0 ? (
            <Button
              fullWidth={false}
              flow={false}
              variant="outline"
              onClick={() => applyFilters(emptyFilters())}
            >
              Süzgeçleri Sıfırla
            </Button>
          ) : undefined
        }
      />
    );
  } else if (desktop) {
    content = (
      <ProductTable
        products={paging.pageItems}
        priceOptions={viewOptions.map((o) => ({ id: o.value, name: o.label }))}
        priceView={activeView}
        onPriceView={setPriceView}
        priceDirection={priceDirection}
        onPriceDirection={setPriceDirection}
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleAll={(on) =>
          setSelected((s) => {
            const next = new Set(s);
            for (const p of paging.pageItems) {
              if (on && next.size < 1000) next.add(p.id);
              else if (!on) next.delete(p.id);
            }
            return next;
          })
        }
        onEdit={edit}
        onCopy={copy}
        onDelete={(p) => requestDelete([p.id], p.name)}
        onEditImages={(p) => setImagesFor(p.id)}
        onStockTracking={(id, on) => setStockTracking([id], on)}
        onSales={(id, on) => setSales([id], on)}
      />
    );
  } else {
    content = (
      <ul aria-label="Ürünler" className="flex flex-col gap-2.5">
        {paging.pageItems.map((p) => (
          <li key={p.id}>
            <ProductRow
              product={p}
              priceView={activeView}
              viewName={`${viewOptions.find((o) => o.value === activeList)?.label ?? ''} · ${priceDirection === 'alis' ? 'Alış' : 'Satış'}`}
              expanded={!selecting && expandedId === p.id}
              selecting={selecting}
              selected={selected.has(p.id)}
              onPress={() =>
                selecting ? toggleSelect(p.id) : setExpandedId(expandedId === p.id ? null : p.id)
              }
              onEdit={() => edit(p)}
              onDuplicate={() => copy(p)}
              onMore={() => setMenuFor(p.id)}
              onZoom={() => setZoomFor(p.id)}
              onStockTracking={(on) => setStockTracking([p.id], on)}
              onSales={(on) => setSales([p.id], on)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error ? (
        <Alert tone="error">
          {error}
          <button type="button" className="ml-3 underline" onClick={() => void refresh()}>
            Tekrar Dene
          </button>
        </Alert>
      ) : null}
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={(text) => {
              setQuery(text);
              paging.setPage(1);
              setSelected(new Set());
              selectionRevision.current++;
            }}
            label="Ürün ara"
            placeholder="Ürün adı, kod veya marka ara…"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label={filterCount > 0 ? `Süzgeçler, ${filterCount} açık` : 'Süzgeçler'}
          className={[
            'relative flex size-12 shrink-0 items-center justify-center rounded-full border transition-colors',
            filterCount > 0
              ? 'border-brand-600 bg-brand-50 text-brand-ink'
              : 'border-field-border text-ink-muted hover:border-brand-500',
          ].join(' ')}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {filterCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white"
            >
              {filterCount}
            </span>
          ) : null}
        </button>
        {/* Geniş ekranda süzgeç düğmesiyle aynı boyutta, yalnızca simgeli üç yuvarlak düğme (adı üzerine gelince çıkar). */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            aria-label="Excel ile Yükle"
            title="Excel ile Yükle"
            className={TOOL}
          >
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </button>
          <Link
            to={DEALS_PATH}
            aria-label="Fırsat Yönetimi"
            title="Fırsat Yönetimi"
            className={TOOL}
          >
            <Sparkles className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to={BULK_IMAGES_PATH}
            aria-label="Toplu Görsel"
            title="Toplu Görsel"
            className={TOOL}
          >
            <Images className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Telefon/tablet: web'deki gibi yalnızca simgeli yuvarlak düğmeler yan yana. */}
        {desktop ? null : (
          <>
            <button
              type="button"
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              aria-pressed={selecting}
              aria-label="Seç"
              title={selecting ? 'Seçimi Bitir' : 'Seç'}
              className={[
                SMALL_TOOL,
                selecting ? 'border-brand-600 bg-brand-50 text-brand-ink' : '',
              ].join(' ')}
            >
              <ListChecks className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              aria-label="Excel ile Yükle"
              title="Excel ile Yükle"
              className={SMALL_TOOL}
            >
              <FileSpreadsheet className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
        <Link
          to={DEALS_PATH}
          aria-label="Fırsat Yönetimi"
          title="Fırsat Yönetimi"
          className={`${SMALL_TOOL} lg:hidden`}
        >
          <Sparkles className="size-5" aria-hidden="true" />
        </Link>
        <Link
          to={BULK_IMAGES_PATH}
          aria-label="Toplu Görsel"
          title="Toplu Görsel"
          className={`${SMALL_TOOL} lg:hidden`}
        >
          <Images className="size-5" aria-hidden="true" />
        </Link>
        {filterCount > 0 ? (
          <button
            type="button"
            onClick={() => applyFilters(emptyFilters())}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-ink"
          >
            {filterCount} süzgeç açık
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Süzgeçleri kaldır</span>
          </button>
        ) : null}
      </div>

      {desktop ? null : viewOptions.length <= MAX_SEGMENTS ? (
        <Segmented
          label="Listede gösterilecek fiyat"
          value={activeList}
          options={viewOptions}
          onChange={setPriceView}
        />
      ) : (
        <SelectField
          label="Listede gösterilecek fiyat"
          options={viewOptions}
          value={activeList}
          onChange={setPriceView}
        />
      )}

      {!desktop && (
        <Segmented
          label="Fiyat yönü"
          value={priceDirection}
          onChange={setPriceDirection}
          options={[
            { value: 'alis', label: 'Alış' },
            { value: 'satis', label: 'Satış' },
          ]}
        />
      )}
      {content}

      {!loading && visible.length > 0 ? (
        <PaginationBar
          noun="ürün"
          total={paging.total}
          from={paging.from}
          to={paging.to}
          page={paging.page}
          pageCount={paging.pageCount}
          onPageChange={(p) => {
            setExpandedId(null);
            paging.setPage(p);
          }}
          sizeText={paging.sizeText}
          onSizeTextChange={changePageSize}
        />
      ) : null}

      {anySelected ? (
        <div
          role="toolbar"
          aria-label="Toplu işlemler"
          className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-surface-raised p-3 text-ink shadow-card lg:inset-x-auto lg:right-8 lg:bottom-8 lg:left-auto lg:min-w-96"
        >
          <span className="px-2 text-sm font-bold">{selectedIds.length} seçili</span>
          {selectedIds.length < total ? (
            <button
              type="button"
              onClick={() => void selectAll()}
              disabled={selectionBusy || loading}
              className="rounded-full bg-surface-muted px-3 py-2 text-sm font-semibold"
            >
              {selectionBusy ? 'Seçiliyor…' : `Tümünü seç (${total})`}
            </button>
          ) : null}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white"
          >
            İşlemler
          </button>
          <button
            type="button"
            onClick={stopSelecting}
            aria-label="Seçimi bırak"
            className="flex size-9 items-center justify-center rounded-full bg-surface-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-28"
        >
          <p className="pointer-events-auto animate-rise-in rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface shadow-card">
            {notice}
          </p>
        </div>
      ) : null}

      {filterOpen ? (
        <ProductFilterSheet
          products={products}
          options={filterOptions}
          search={query}
          value={filters}
          firstListName={priceLists[0]?.name}
          onApply={(f) => {
            applyFilters(f);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      {imagesForProduct ? (
        <ProductImagesSheet
          key={imagesForProduct.id}
          product={imagesForProduct}
          onClose={() => setImagesFor(null)}
          onDone={(count, replaced) => {
            setImagesFor(null);
            void refresh();
            showNotice(
              count === 0
                ? `${imagesForProduct.name} görsel sırası kaydedildi.`
                : replaced
                ? `${imagesForProduct.name} görselleri değiştirildi.`
                : `${imagesForProduct.name} için ${count} görsel eklendi.`,
            );
          }}
        />
      ) : null}
      {importOpen ? (
        <ProductImportSheet
          onDone={(r) => {
            if (!r.errors?.length) setImportOpen(false);
            void refresh();
            showNotice(
              `${r.created} ürün eklendi, ${r.updated} ürün güncellendi.${r.errors?.length ? ` ${r.errors.length} satır kaydedilemedi.` : ''}`,
            );
          }}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
      {menuProduct ? (
        <ProductMenuSheet
          name={menuProduct.name}
          onEdit={() => edit(menuProduct)}
          onDuplicate={() => copy(menuProduct)}
          onDelete={() => requestDelete([menuProduct.id], menuProduct.name)}
          onClose={() => setMenuFor(null)}
        />
      ) : null}
      {bulkOpen ? (
        <BulkActionsSheet
          count={selectedIds.length}
          priceLists={priceLists}
          items={products.filter((p) => selected.has(p.id))}
          onApply={(request) => bulk(selectedIds, request)}
          onStock={(on) => setStockTracking(selectedIds, on)}
          onSales={(on) => setSales(selectedIds, on)}
          onDelete={() =>
            requestDelete(
              selectedIds,
              selectedIds.length === 1 ? 'Ürün' : `${selectedIds.length} ürün`,
            )
          }
          onDone={showNotice}
          onClose={() => setBulkOpen(false)}
        />
      ) : null}
      {zoomProduct ? (
        <Sheet open onClose={() => setZoomFor(null)} title={zoomProduct.name} size="md">
          {zoomProduct.imageUrl ? (
            <CatalogImage
              page="products"
              src={zoomProduct.imageUrl}
              alt={zoomProduct.name}
              className="mx-auto aspect-square w-full max-w-sm rounded-3xl object-cover"
            />
          ) : null}
        </Sheet>
      ) : null}
      {pendingDelete ? (
        <UndoToast
          key={pendingDelete.key}
          message={`${pendingDelete.label} silindi.`}
          onUndo={() => setPendingDelete(null)}
          onTimeout={() => commitDelete(pendingDelete)}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-md text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
