import { ChevronLeft, Plus, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { SortableList } from '../../../components/ui/SortableList';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePagination } from '../../../lib/usePagination';
import { useDeals } from '../hooks/useDeals';
import type { Deal, DealDraft } from '../types';
import { DealFormSheet } from './DealFormSheet';
import { DealProductsSheet } from './DealProductsSheet';
import { DealRow } from './DealRow';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Fırsat penceresi: kapalı / yeni (dealId yok) / mevcut fırsat düzenleme. */
type FormState = { dealId: string | null } | null;

/**
 * Fırsat Yönetimi ekranı. Her satırda rozetin ürün resmindeki GERÇEK yeri ve boyutu görünür
 * (DealPreview). Telefonda satırlar sola kaydırınca işlem gösterir ve basılı tutup sürükleyerek
 * sıralanır; masaüstünde satırın içinde düğmeler ve ⠿ tutamağı vardır, düzenlemek için çift
 * tıklanır. Liste sayfalıdır; arama sırasında sıralama kapalıdır.
 */
export function DealsView() {
  const { deals, loading, error, refresh, toggleActive, reorder, save, remove, assign, unassign } =
    useDeals();
  const phone = !useMediaQuery('(min-width: 48rem)');

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [productsFor, setProductsFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  };

  // Açık kaydırma satırının dışına dokunulunca satır kapanır.
  useEffect(() => {
    if (!swipeOpenId) return;
    const onPointerDown = (e: PointerEvent) => {
      const row = (e.target as HTMLElement).closest('[data-swipe-row]');
      if (row?.getAttribute('data-swipe-row') !== swipeOpenId) setSwipeOpenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [swipeOpenId]);

  const searching = query.trim() !== '';
  const visible = searching
    ? deals.filter((d) => fold(d.name).includes(fold(query.trim())))
    : deals;
  const paging = usePagination(visible, 10);

  const editing = form?.dealId ? (deals.find((d) => d.id === form.dealId) ?? null) : null;
  const productsDeal = productsFor ? (deals.find((d) => d.id === productsFor) ?? null) : null;

  const saveDeal = async (draft: DealDraft) => {
    const wasEditing = editing;
    try {
      const saved = await save(draft, wasEditing?.id);
      setForm(null);
      showNotice(wasEditing ? `${saved.name} güncellendi.` : `${saved.name} eklendi.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Kaydedilemedi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { id, name } = deleting;
    setDeleting(null);
    setSwipeOpenId(null);
    await remove(id);
    showNotice(`${name} silindi.`);
  };

  const openAdd = () => setForm({ dealId: null });

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    );
  } else if (deals.length === 0) {
    content = (
      <EmptyState
        title="Henüz fırsat yok"
        text="İlk fırsatı ekleyerek başla; ürünlerin üstünde rozet olarak görünür."
        action={
          <Button fullWidth={false} flow={false} onClick={openAdd}>
            İlk Fırsatı Ekle
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        title="Eşleşen fırsat yok"
        text={`"${query.trim()}" ile eşleşen bir fırsat bulunamadı.`}
      />
    );
  } else {
    content = (
      <SortableList
        label="Fırsatlar"
        items={paging.pageItems}
        getId={(d) => d.id}
        getLabel={(d) => d.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        // Sürükleme geçerli sayfa içindedir; sıra tüm listeye yansıtılır.
        onReorder={(nextPage) =>
          reorder([
            ...deals.slice(0, paging.start),
            ...nextPage,
            ...deals.slice(paging.start + nextPage.length),
          ])
        }
        renderItem={(deal, ctx) => (
          <DealRow
            deal={deal}
            phone={phone}
            sortable={ctx}
            sortingDisabled={searching}
            swipeOpen={swipeOpenId === deal.id}
            onSwipeOpenChange={(open) => setSwipeOpenId(open ? deal.id : null)}
            onEdit={() => {
              setSwipeOpenId(null);
              setForm({ dealId: deal.id });
            }}
            onAssign={() => {
              setSwipeOpenId(null);
              setProductsFor(deal.id);
            }}
            onDelete={() => setDeleting(deal)}
            onToggle={(active) => toggleActive(deal.id, active)}
          />
        )}
      />
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
      <nav aria-label="Sayfa yolu" className="flex items-center gap-2">
        <Link
          to={PRODUCTS_PATH}
          aria-label="Ürünler sayfasına dön"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-brand-50 hover:text-brand-ink"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <p className="text-sm font-bold text-ink-muted">
          <Link to={PRODUCTS_PATH} className="hover:text-ink">
            Ürünler
          </Link>
          <span aria-hidden="true"> › </span>
          <span className="text-ink">Fırsatlar</span>
        </p>
      </nav>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={(text) => {
              setQuery(text);
              paging.setPage(1);
            }}
            label="Fırsat ara"
            placeholder="Fırsat ara…"
          />
        </div>
        <div className="hidden md:block">
          <Button
            fullWidth={false}
            flow={false}
            onClick={openAdd}
            leadingIcon={<Plus className="size-5" aria-hidden="true" />}
          >
            Fırsat Ekle
          </Button>
        </div>
      </div>

      <p className="px-2 text-sm text-ink-muted">
        {searching
          ? 'Arama sırasında sıralama kapalıdır.'
          : phone
            ? 'Basılı tutup sürükleyerek sırala · sola kaydırınca işlemler çıkar.'
            : 'Sıralamak için ⠿ tutamağından sürükleyin · düzenlemek için fırsata çift tıklayın.'}
      </p>

      {content}

      {!loading && visible.length > 0 ? (
        <PaginationBar
          noun="fırsat"
          total={paging.total}
          from={paging.from}
          to={paging.to}
          page={paging.page}
          pageCount={paging.pageCount}
          onPageChange={(p) => {
            setSwipeOpenId(null);
            paging.setPage(p);
          }}
          sizeText={paging.sizeText}
          onSizeTextChange={paging.setSizeText}
        />
      ) : null}

      {/* Telefon: yüzen ekleme düğmesi (alt çubuğun üstünde) */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Fırsat Ekle"
        className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-card transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-7" aria-hidden="true" />
      </button>

      {notice ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-28"
        >
          <p className="pointer-events-auto animate-rise-in rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface shadow-card">
            {notice}
          </p>
        </div>
      ) : null}

      {form ? (
        <DealFormSheet
          key={form.dealId ?? 'yeni'}
          deal={editing}
          onSave={saveDeal}
          saveError={error}
          onAssign={assign}
          onUnassign={unassign}
          onClose={() => setForm(null)}
        />
      ) : null}
      {productsDeal ? (
        <DealProductsSheet
          key={productsDeal.id}
          deal={productsDeal}
          onAssign={assign}
          onUnassign={unassign}
          onClose={() => setProductsFor(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={deleting ? `${deleting.name} Silinsin Mi?` : ''}
        description={
          deleting
            ? deleting.productCount > 0
              ? `${deleting.name} fırsatı ${deleting.productCount} üründe kullanılıyor. Silerseniz bu ürünlerden kalkar; ürünler silinmez.`
              : `${deleting.name} fırsatı kalıcı olarak silinecek.`
            : ''
        }
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete().catch(() => undefined)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
        <Sparkles className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-md text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
