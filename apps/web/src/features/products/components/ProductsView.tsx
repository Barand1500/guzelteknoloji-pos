import { FileSpreadsheet, ListChecks, Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Segmented } from '../../../components/ui/Segmented';
import { Sheet } from '../../../components/ui/Sheet';
import { DEALS_PATH, PRODUCTS_PATH, STOCK_CREATE_PATH } from '../../../config/navigation';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePagination } from '../../../lib/usePagination';
import { useProducts } from '../hooks/useProducts';
import {
  activeFilterCount,
  emptyFilters,
  matchesFilters,
  type PriceView,
  type ProductFilters,
  type ProductItem,
} from '../types';
import { ProductFilterSheet } from './ProductFilterSheet';
import { ProductImportSheet } from './ProductImportSheet';
import { BulkMenuSheet, ProductMenuSheet } from './ProductMenuSheet';
import { ProductRow } from './ProductRow';
import { ProductTable } from './ProductTable';

const fold = (s: string) => s.toLocaleLowerCase('tr');

const PRICE_OPTIONS = [
  { value: 'p1', label: 'Fiyat 1' },
  { value: 'p2', label: 'Fiyat 2' },
  { value: 'p3', label: 'Fiyat 3' },
  { value: 'cost', label: 'Alış' },
] as const;

/**
 * Ürün Liste ekranı. Telefonda sıkı satırlar: dokununca satır açılıp üç fiyat, stok/satış
 * anahtarları ve işlemler görünür; üstteki seçici satırda hangi fiyatın görüneceğini belirler.
 * Seçim modunda kutucuklar çıkar ve alttan toplu işlem çubuğu açılır. Masaüstünde tablodur
 * (üç fiyat yan yana). "Ekle" mevcut stok kartı oluşturma ekranını açar.
 */
export function ProductsView() {
  const { products, loading, refresh, setStockTracking, setSales, remove, duplicate } =
    useProducts();
  const desktop = useMediaQuery('(min-width: 64rem)');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters);
  const [priceView, setPriceView] = useState<PriceView>('p1');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [zoomFor, setZoomFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ ids: string[]; label: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  };

  const filterCount = activeFilterCount(filters);
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return products.filter(
      (p) =>
        matchesFilters(p, filters) &&
        (q === '' ||
          fold(p.name).includes(q) ||
          fold(p.code).includes(q) ||
          fold(p.brandName).includes(q)),
    );
  }, [products, filters, query]);
  const paging = usePagination(visible, 10);

  const byId = (id: string | null) => products.find((p) => p.id === id) ?? null;
  const menuProduct = byId(menuFor);
  const zoomProduct = byId(zoomFor);
  // Silinen/süzülen ürünler seçimden düşer.
  const selectedIds = [...selected].filter((id) => products.some((p) => p.id === id));
  const anySelected = selectedIds.length > 0;

  const edit = (p: ProductItem) => navigate(`${PRODUCTS_PATH}/${p.id}`);
  const copy = async (p: ProductItem) => {
    const made = await duplicate(p.id);
    showNotice(`${made.name} oluşturuldu (satışa kapalı).`);
  };
  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    const { ids, label } = deleting;
    setDeleting(null);
    await remove(ids);
    setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
    showNotice(`${label} silindi.`);
  };

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    );
  } else if (products.length === 0) {
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
              onClick={() => setFilters(emptyFilters())}
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
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleAll={(on) =>
          setSelected((s) => {
            const next = new Set(s);
            for (const p of paging.pageItems) {
              if (on) next.add(p.id);
              else next.delete(p.id);
            }
            return next;
          })
        }
        onEdit={edit}
        onMore={(p) => setMenuFor(p.id)}
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
              priceView={priceView}
              expanded={!selecting && expandedId === p.id}
              selecting={selecting}
              selected={selected.has(p.id)}
              onPress={() =>
                selecting ? toggleSelect(p.id) : setExpandedId(expandedId === p.id ? null : p.id)
              }
              onEdit={() => edit(p)}
              onDuplicate={() => void copy(p)}
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
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={(text) => {
              setQuery(text);
              paging.setPage(1);
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
        <div className="hidden items-center gap-2.5 lg:flex">
          <Button
            fullWidth={false}
            flow={false}
            variant="outline"
            onClick={() => setImportOpen(true)}
            leadingIcon={<FileSpreadsheet className="size-5" aria-hidden="true" />}
          >
            Excel ile Yükle
          </Button>
          <Button
            fullWidth={false}
            flow={false}
            onClick={() => navigate(STOCK_CREATE_PATH)}
            leadingIcon={<Plus className="size-5" aria-hidden="true" />}
          >
            Ürün Ekle
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {desktop ? null : (
          <>
            <button
              type="button"
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              aria-pressed={selecting}
              className={[
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
                selecting
                  ? 'border-brand-600 bg-brand-50 text-brand-ink'
                  : 'border-field-border text-ink-muted',
              ].join(' ')}
            >
              <ListChecks className="size-4" aria-hidden="true" />
              {selecting ? 'Seçimi Bitir' : 'Seç'}
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-field-border px-3.5 text-sm font-semibold text-ink-muted"
            >
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Excel
            </button>
          </>
        )}
        <Link
          to={DEALS_PATH}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-field-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:border-brand-500 hover:text-ink"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Fırsatlar
        </Link>
        {filterCount > 0 ? (
          <button
            type="button"
            onClick={() => setFilters(emptyFilters())}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-ink"
          >
            {filterCount} süzgeç açık
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Süzgeçleri kaldır</span>
          </button>
        ) : null}
      </div>

      {desktop ? null : (
        <Segmented
          label="Listede gösterilecek fiyat"
          value={priceView}
          options={PRICE_OPTIONS}
          onChange={(v) => setPriceView(v as PriceView)}
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
          onSizeTextChange={paging.setSizeText}
        />
      ) : null}

      {anySelected ? (
        <div
          role="toolbar"
          aria-label="Toplu işlemler"
          className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-surface-raised p-3 text-ink shadow-card lg:inset-x-auto lg:right-8 lg:bottom-8 lg:left-auto lg:min-w-96"
        >
          <span className="px-2 text-sm font-bold">{selectedIds.length} seçili</span>
          {selectedIds.length < visible.length ? (
            <button
              type="button"
              onClick={() => setSelected(new Set(visible.map((p) => p.id)))}
              className="rounded-full bg-surface-muted px-3 py-2 text-sm font-semibold"
            >
              Tümünü seç ({visible.length})
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
          value={filters}
          onApply={(f) => {
            setFilters(f);
            paging.setPage(1);
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
      {importOpen ? (
        <ProductImportSheet
          onDone={(r) => {
            setImportOpen(false);
            void refresh();
            showNotice(`${r.created} ürün eklendi, ${r.updated} ürün güncellendi.`);
          }}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
      {menuProduct ? (
        <ProductMenuSheet
          name={menuProduct.name}
          onEdit={() => edit(menuProduct)}
          onDuplicate={() => void copy(menuProduct)}
          onMarketplace={(m) => showNotice(`${m} bağlantısı henüz kurulmadı; ürün gönderilmedi.`)}
          onDelete={() => setDeleting({ ids: [menuProduct.id], label: menuProduct.name })}
          onClose={() => setMenuFor(null)}
        />
      ) : null}
      {bulkOpen ? (
        <BulkMenuSheet
          count={selectedIds.length}
          onStock={(on) => {
            setStockTracking(selectedIds, on);
            showNotice(`${selectedIds.length} üründe stok takibi ${on ? 'açıldı' : 'kapatıldı'}.`);
          }}
          onSales={(on) => {
            setSales(selectedIds, on);
            showNotice(`${selectedIds.length} ürün satışa ${on ? 'açıldı' : 'kapatıldı'}.`);
          }}
          onDelete={() => setDeleting({ ids: selectedIds, label: `${selectedIds.length} ürün` })}
          onClose={() => setBulkOpen(false)}
        />
      ) : null}
      {zoomProduct ? (
        <Sheet open onClose={() => setZoomFor(null)} title={zoomProduct.name} size="md">
          {zoomProduct.imageUrl ? (
            <img
              src={zoomProduct.imageUrl}
              alt={zoomProduct.name}
              className="mx-auto aspect-square w-full max-w-sm rounded-3xl object-cover"
            />
          ) : null}
        </Sheet>
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={deleting ? `${deleting.label} Silinsin Mi?` : ''}
        description="Silinen ürünler geri getirilemez. Geçmiş satış kayıtları korunur."
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
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
