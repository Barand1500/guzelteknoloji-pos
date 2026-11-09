import { ChevronLeft, FolderTree, Plus } from 'lucide-react';
import { usePublishAddAction } from '../../app-shell/save-action';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { SortableList } from '../../../components/ui/SortableList';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useCategories } from '../hooks/useCategories';
import { pathTo } from '../tree';
import type { Category, CategoryDraft } from '../types';
import { CategoryFormSheet } from './CategoryFormSheet';
import { CategoryMoveSheet } from './CategoryMoveSheet';
import { CategoryProductsSheet } from './CategoryProductsSheet';
import { CategoryRow } from './CategoryRow';

const fold = (s: string) => s.toLocaleLowerCase('tr');
/** Kategori penceresi: kapalı / yeni (categoryId yok, parentId = ekleneceği yer) / düzenleme. */
type FormState = {
  categoryId: string | null;
  parentId: string | null;
  /** true: açılışta görsel seçici hemen açılır. */
  pickImage?: boolean;
} | null;

/**
 * Kategoriler ekranı. Ağaç, klasör gibi gezilir: bir kategoriye dokununca içine girilir, üstte
 * "Tümü › Ana › Alt" yolu ve geri düğmesi görünür. İçinde bulunulan kategori adres çubuğunda
 * (?k=…) tutulur; telefonun geri hareketi bir üst kategoriye çıkar. Görünüm yalnızca listedir
 * (kutucuk görünümü ve sayfalama yoktur). Sıra, kardeş kategorilerin mağazadaki gösterim
 * sırasıdır; basılı tutup (fareyle tutup çekerek) sürüklenir.
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

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [productsFor, setProductsFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
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
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const pathText = (c: Category) =>
    searching ? ['Tümü', ...pathTo(byId, c.parentId).map((p) => p.name)].join(' › ') : undefined;

  const editing = form?.categoryId ? (byId.get(form.categoryId) ?? null) : null;
  const productsCategory = productsFor ? (byId.get(productsFor) ?? null) : null;
  const moveCategory = moveFor ? (byId.get(moveFor) ?? null) : null;

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
  usePublishAddAction(addLabel, openAdd);

  const commonRowProps = (c: Category) => ({
    category: c,
    pathText: pathText(c),
    onOpen: () => goTo(c.id),
  });
  const openEdit = (c: Category, pickImage = false) => {
    setSwipeOpenId(null);
    setForm({ categoryId: c.id, parentId: c.parentId, pickImage });
  };
  const openMove = (c: Category) => {
    setSwipeOpenId(null);
    setMoveFor(c.id);
  };
  const moveTo = async (c: Category, parentId: string | null) => {
    try {
      await cats.move(c.id, parentId);
      setMoveFor(null);
      const target = parentId ? (byId.get(parentId)?.name ?? '') : 'Ana Kategoriler';
      showNotice(`${c.name}, ${target} içine taşındı.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Taşınamadı.');
      throw error;
    }
  };
  const openProducts = (c: Category) => {
    setSwipeOpenId(null);
    setProductsFor(c.id);
  };

  const reorderList = (next: Category[]) => cats.reorder(currentId, next);

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
  } else {
    content = (
      <SortableList
        label="Kategoriler"
        items={visible}
        getId={(c) => c.id}
        getLabel={(c) => c.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        onReorder={reorderList}
        renderItem={(c, ctx) => (
          <CategoryRow
            {...commonRowProps(c)}
            phone={phone}
            sortable={ctx}
            sortingDisabled={searching}
            swipeOpen={swipeOpenId === c.id}
            onSwipeOpenChange={(open) => setSwipeOpenId(open ? c.id : null)}
            onEdit={() => openEdit(c)}
            onEditImage={() => openEdit(c, true)}
            onAssign={() => openProducts(c)}
            onMove={() => openMove(c)}
            onDelete={() => setDeleting(c)}
            onToggle={(active) => cats.toggleActive(c.id, active)}
          />
        )}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {cats.error ? (
        <Alert tone="error">
          {cats.error}
          <button type="button" className="ml-3 underline" onClick={() => void cats.refresh()}>
            Tekrar Dene
          </button>
        </Alert>
      ) : null}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={setQuery}
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
      </div>

      {current && !searching ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-brand-ink">
            <b className="block truncate text-base">{current.name}</b>
          </p>
          <div className="grid shrink-0 grid-cols-3 gap-2">
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
              onClick={() => openMove(current)}
            >
              Taşı
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
          : phone
            ? 'Basılı tutup sürükleyerek sırala · sola kaydırınca işlemler çıkar.'
            : 'Sıralamak için ⠿ tutamağından sürükleyin · görsele çift tıklayınca görsel yüklenir.'}
      </p>

      <div key={`${currentId ?? 'kok'}-${searching}`} className="animate-fade-in">
        {content}
      </div>

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
        <CategoryFormSheet
          key={form.categoryId ?? `yeni-${form.parentId ?? 'kok'}`}
          category={editing}
          defaultParentId={form.parentId}
          categories={categories}
          categoryNames={names}
          onSave={saveCategory}
          saveError={cats.error}
          onMove={(id, parentId) => cats.move(id, parentId)}
          onClose={() => setForm(null)}
          pickImage={form.pickImage === true}
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
      {moveCategory ? (
        <CategoryMoveSheet
          key={moveCategory.id}
          category={moveCategory}
          categories={categories}
          onMove={(parentId) => moveTo(moveCategory, parentId)}
          onClose={() => setMoveFor(null)}
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
        onConfirm={() => void confirmDelete().catch(() => undefined)}
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
  const ref = useRef<HTMLButtonElement>(null);
  // Uzun yolda aktif halka telefonda görünür alana kayar.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  }, [active]);
  return (
    <button
      ref={ref}
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
