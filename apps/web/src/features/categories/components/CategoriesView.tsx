import { ChevronLeft, FolderTree, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SearchField } from '../../../components/ui/SearchField';
import { Segmented } from '../../../components/ui/Segmented';
import { SortableGrid } from '../../../components/ui/SortableGrid';
import { SortableList } from '../../../components/ui/SortableList';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { usePagination } from '../../../lib/usePagination';
import { useCategories } from '../hooks/useCategories';
import { pathTo } from '../tree';
import type { Category, CategoryDraft } from '../types';
import { CategoryActionsSheet } from './CategoryActionsSheet';
import { CategoryFormSheet } from './CategoryFormSheet';
import { CategoryProductsSheet } from './CategoryProductsSheet';
import { CategoryRow } from './CategoryRow';
import { CategoryTile } from './CategoryTile';

const fold = (s: string) => s.toLocaleLowerCase('tr');
const VIEW_KEY = 'gt-kategori-gorunum';
type View = 'tiles' | 'list';

const VIEW_OPTIONS = [
  { value: 'tiles', label: 'Kutucuk' },
  { value: 'list', label: 'Liste' },
];

/** Son seçilen görünüm hatırlanır (tarayıcı kapalı/engelliyse varsayılan: kutucuk). */
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'tiles';
  } catch {
    return 'tiles';
  }
}

/** Kategori penceresi: kapalı / yeni (categoryId yok, parentId = ekleneceği yer) / düzenleme. */
type FormState = { categoryId: string | null; parentId: string | null } | null;

/**
 * Kategoriler ekranı. Ağaç, klasör gibi gezilir: bir kategoriye dokununca içine girilir, üstte
 * "Tümü › Ana › Alt" yolu ve geri düğmesi görünür. İçinde bulunulan kategori adres çubuğunda
 * (?k=…) tutulur; telefonun geri hareketi bir üst kategoriye çıkar. İki görünüm vardır:
 * görsel kutucuklar (telefonda varsayılan rahatlık) ve liste. Sıra, kardeş kategorilerin
 * mağazadaki gösterim sırasıdır; basılı tutup (fareyle tutup çekerek) sürüklenir.
 */
export function CategoriesView() {
  const cats = useCategories();
  const { categories, byId, loading } = cats;
  const phone = !useMediaQuery('(min-width: 48rem)');
  const [searchParams, setSearchParams] = useSearchParams();

  // Geçersiz/silinmiş kimlik kökte açılır.
  const requested = searchParams.get('k');
  const currentId = requested && byId.has(requested) ? requested : null;
  const current = currentId ? (byId.get(currentId) ?? null) : null;
  const path = pathTo(byId, currentId);

  const goTo = (id: string | null) => {
    setQuery('');
    setSwipeOpenId(null);
    setSearchParams(id ? { k: id } : {}, { replace: false });
  };

  const [view, setView] = useState<View>(readView);
  const changeView = (next: string) => {
    const value: View = next === 'list' ? 'list' : 'tiles';
    setView(value);
    try {
      localStorage.setItem(VIEW_KEY, value);
    } catch {
      /* Hatırlanamazsa sorun değil. */
    }
  };

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [productsFor, setProductsFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
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
  const siblings = categories.filter((c) => c.parentId === currentId);
  const visible = searching
    ? categories.filter((c) => fold(c.name).includes(fold(query.trim())))
    : siblings;
  const paging = usePagination(visible, 10);
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const pathText = (c: Category) =>
    searching ? ['Tümü', ...pathTo(byId, c.parentId).map((p) => p.name)].join(' › ') : undefined;

  const editing = form?.categoryId ? (byId.get(form.categoryId) ?? null) : null;
  const productsCategory = productsFor ? (byId.get(productsFor) ?? null) : null;
  const menuCategory = menuFor ? (byId.get(menuFor) ?? null) : null;

  const saveCategory = async (draft: CategoryDraft) => {
    const wasEditing = editing;
    try {
      const saved = await cats.save(draft, wasEditing?.id);
      setForm(null);
      showNotice(wasEditing ? `${saved.name} güncellendi.` : `${saved.name} eklendi.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Kaydedilemedi.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const gone = deleting;
    setDeleting(null);
    setSwipeOpenId(null);
    // Silinen kategorinin içindeysek bir üst kategoriye çıkılır.
    const inside = path.some((p) => p.id === gone.id);
    await cats.remove(gone.id);
    if (inside) goTo(gone.parentId);
    showNotice(`${gone.name} silindi.`);
  };

  const openAdd = () => setForm({ categoryId: null, parentId: currentId });
  const addLabel = current ? 'Alt Kategori Ekle' : 'Kategori Ekle';

  const commonRowProps = (c: Category) => ({
    category: c,
    pathText: pathText(c),
    onOpen: () => goTo(c.id),
  });
  const openEdit = (c: Category) => {
    setSwipeOpenId(null);
    setForm({ categoryId: c.id, parentId: c.parentId });
  };
  const openProducts = (c: Category) => {
    setSwipeOpenId(null);
    setProductsFor(c.id);
  };

  // Sürükleme geçerli sayfa içindedir; sıra tüm kardeş listesine yansıtılır.
  const reorderPage = (nextPage: Category[]) =>
    cats.reorder(currentId, [
      ...siblings.slice(0, paging.start),
      ...nextPage,
      ...siblings.slice(paging.start + nextPage.length),
    ]);

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    );
  } else if (visible.length === 0) {
    content = searching ? (
      <EmptyState
        title="Eşleşen kategori yok"
        text={`"${query.trim()}" ile eşleşen bir kategori bulunamadı.`}
      />
    ) : (
      <EmptyState
        title={current ? `${current.name} içinde alt kategori yok` : 'Henüz kategori yok'}
        text={
          current
            ? 'İstersen buraya alt kategori ekleyebilir ya da ürünleri doğrudan bu kategoriye tanımlayabilirsin.'
            : 'İlk kategoriyi ekleyerek başla.'
        }
        action={
          <Button fullWidth={false} flow={false} onClick={openAdd}>
            {current ? 'İlk Alt Kategoriyi Ekle' : 'İlk Kategoriyi Ekle'}
          </Button>
        }
      />
    );
  } else if (view === 'tiles') {
    content = (
      <SortableGrid
        label="Kategoriler"
        items={paging.pageItems}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        onReorder={reorderPage}
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        renderItem={(c, ctx) => (
          <CategoryTile
            category={c}
            sortable={ctx}
            pathText={pathText(c)}
            onOpen={() => goTo(c.id)}
            onMenu={() => setMenuFor(c.id)}
          />
        )}
      />
    );
  } else {
    content = (
      <SortableList
        label="Kategoriler"
        items={paging.pageItems}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        onReorder={reorderPage}
        renderItem={(c, ctx) => (
          <CategoryRow
            {...commonRowProps(c)}
            phone={phone}
            sortable={ctx}
            sortingDisabled={searching}
            swipeOpen={swipeOpenId === c.id}
            onSwipeOpenChange={(open) => setSwipeOpenId(open ? c.id : null)}
            onEdit={() => openEdit(c)}
            onAssign={() => openProducts(c)}
            onDelete={() => setDeleting(c)}
            onToggle={(active) => cats.toggleActive(c.id, active)}
          />
        )}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={(text) => {
              setQuery(text);
              paging.setPage(1);
            }}
            label="Kategori ara"
            placeholder="Tüm kategorilerde ara…"
          />
        </div>
        <div className="hidden md:block">
          <Button
            fullWidth={false}
            flow={false}
            onClick={openAdd}
            leadingIcon={<Plus className="size-5" aria-hidden="true" />}
          >
            {addLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Yol: telefonda yatay kayar; her halka dokununca o seviyeye döner. */}
        <nav
          aria-label="Kategori yolu"
          className="flex w-full min-w-0 items-center gap-1.5 md:w-auto md:flex-1"
        >
          {current ? (
            <button
              type="button"
              onClick={() => goTo(current.parentId)}
              aria-label="Bir üst kategoriye çık"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-brand-50 hover:text-brand-ink"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 text-sm font-bold [scrollbar-width:none]">
            <li className="shrink-0">
              <Crumb active={!current} onClick={() => goTo(null)}>
                Tümü
              </Crumb>
            </li>
            {path.map((p, i) => (
              <li key={p.id} className="flex shrink-0 items-center gap-1.5">
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
                <Crumb active={i === path.length - 1} onClick={() => goTo(p.id)}>
                  {p.name}
                </Crumb>
              </li>
            ))}
          </ol>
        </nav>
        <div className="w-full shrink-0 md:w-44">
          <Segmented label="Görünüm" value={view} options={VIEW_OPTIONS} onChange={changeView} />
        </div>
      </div>

      {current && !searching ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-brand-ink">
            <b className="block truncate text-base">{current.name}</b>
            {current.productCount} ürün · {current.childCount} alt kategori
          </p>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <Button
              fullWidth={false}
              flow={false}
              variant="outline"
              onClick={() => openProducts(current)}
            >
              Ürünler
            </Button>
            <Button
              fullWidth={false}
              flow={false}
              variant="outline"
              onClick={() => openEdit(current)}
            >
              Düzenle
            </Button>
          </div>
        </div>
      ) : null}

      <p className="px-2 text-sm text-ink-muted">
        {searching
          ? 'Arama sırasında sıralama kapalıdır. Dokununca o kategorinin içine girilir.'
          : view === 'tiles'
            ? phone
              ? 'Dokununca içine girilir · basılı tutup sürükleyerek sırala.'
              : 'Dokununca içine girilir · sıralamak için kutucuğu tutup sürükleyin.'
            : phone
              ? 'Basılı tutup sürükleyerek sırala · sola kaydırınca işlemler çıkar.'
              : 'Sıralamak için ⠿ tutamağından sürükleyin.'}
      </p>

      <div key={`${currentId ?? 'kok'}-${view}-${searching}`} className="animate-fade-in">
        {content}
      </div>

      {!loading && visible.length > 0 ? (
        <PaginationBar
          noun="kategori"
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
        aria-label={addLabel}
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

      {menuCategory ? (
        <CategoryActionsSheet
          category={menuCategory}
          onClose={() => setMenuFor(null)}
          onEdit={() => openEdit(menuCategory)}
          onAddChild={() => setForm({ categoryId: null, parentId: menuCategory.id })}
          onAssign={() => openProducts(menuCategory)}
          onToggle={(active) => cats.toggleActive(menuCategory.id, active)}
          onDelete={() => setDeleting(menuCategory)}
        />
      ) : null}
      {form ? (
        <CategoryFormSheet
          key={form.categoryId ?? `yeni-${form.parentId ?? 'kok'}`}
          category={editing}
          defaultParentId={form.parentId}
          categories={categories}
          categoryNames={names}
          onSave={saveCategory}
          onAssign={cats.assign}
          onUnassign={cats.unassign}
          onClose={() => setForm(null)}
        />
      ) : null}
      {productsCategory ? (
        <CategoryProductsSheet
          key={productsCategory.id}
          category={productsCategory}
          categoryNames={names}
          onAssign={cats.assign}
          onUnassign={cats.unassign}
          onClose={() => setProductsFor(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={deleting ? `${deleting.name} Silinsin Mi?` : ''}
        description={
          deleting
            ? deleting.childCount > 0
              ? `${deleting.name} ve içindeki ${deleting.childCount} alt kategori (alt dalları dahil) silinecek. Bu kategorilerdeki ürünler silinmez, kategorisiz kalır.`
              : deleting.productCount > 0
                ? `${deleting.name} kategorisi ${deleting.productCount} üründe kullanılıyor. Silerseniz bu ürünler kategorisiz kalır.`
                : `${deleting.name} kategorisi kalıcı olarak silinecek.`
            : ''
        }
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function Crumb({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'inline-flex min-h-10 items-center rounded-full px-3.5 whitespace-nowrap transition-colors',
        active ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
        <FolderTree className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-md text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
