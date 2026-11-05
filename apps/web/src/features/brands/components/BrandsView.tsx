import { Plus, Tag } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { SortableList } from '../../../components/ui/SortableList';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useBrands } from '../hooks/useBrands';
import type { Brand, BrandDraft } from '../types';
import { AssignProductsSheet } from './AssignProductsSheet';
import { BrandFormSheet } from './BrandFormSheet';
import { BrandRow } from './BrandRow';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Form paneli durumu: kapalı / yeni marka / mevcut marka düzenleme. */
type FormState = { brand: Brand | null } | null;

/**
 * Markalar ekranı. Telefonda satırlar sola kaydırınca işlem gösterir ve basılı tutup sürükleyerek
 * sıralanır; masaüstünde satırın içinde düğmeler ve ⠿ tutamağı vardır, sağda özet kartı durur.
 * Sıra, mağazada markaların gösterim sırasıdır (arama sırasında sıralama kapalıdır).
 */
export function BrandsView() {
  const { brands, loading, toggleActive, reorder, save, remove, assign } = useBrands();
  const phone = !useMediaQuery('(min-width: 48rem)');

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [assigning, setAssigning] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
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
    ? brands.filter((b) => fold(b.name).includes(fold(query.trim())))
    : brands;
  const activeCount = brands.filter((b) => b.active).length;
  const brandNames = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const saveBrand = async (draft: BrandDraft) => {
    const editing = form?.brand ?? null;
    const saved = await save(draft, editing?.id);
    setForm(null);
    showNotice(editing ? `${saved.name} güncellendi.` : `${saved.name} eklendi.`);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { id, name } = deleting;
    setDeleting(null);
    setSwipeOpenId(null);
    await remove(id);
    showNotice(`${name} silindi.`);
  };

  const assignProducts = async (ids: string[]) => {
    if (!assigning) return;
    const { id, name } = assigning;
    await assign(id, ids);
    setAssigning(null);
    showNotice(`${ids.length} ürün ${name} markasına atandı.`);
  };

  const openAdd = () => setForm({ brand: null });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Marka ara"
              placeholder="Marka ara…"
            />
          </div>
          {/* Düğme kendi display sınıfını taşıdığı için gizleme bir kapla yapılır */}
          <div className="hidden md:block">
            <Button
              fullWidth={false}
              flow={false}
              onClick={openAdd}

              leadingIcon={<Plus className="size-5" aria-hidden="true" />}
            >
              Marka Ekle
            </Button>
          </div>
        </div>

        <p className="px-2 text-sm text-ink-muted">
          {searching
            ? 'Arama sırasında sıralama kapalıdır.'
            : phone
              ? 'Basılı tutup sürükleyerek sırala · sola kaydırınca işlemler çıkar.'
              : 'Sırayı değiştirmek için soldaki ⠿ tutamağından sürükleyin.'}
        </p>

        {loading ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[4.25rem] animate-pulse rounded-3xl bg-surface-muted" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <EmptyState
            title="Henüz marka yok"
            text="İlk markanı ekleyerek başla."
            action={
              <Button fullWidth={false} flow={false} onClick={openAdd}>
                İlk Markayı Ekle
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="Eşleşen marka yok"
            text={`"${query.trim()}" ile eşleşen bir marka bulunamadı.`}
          />
        ) : (
          <SortableList
            label="Markalar"
            items={visible}
            getId={(b) => b.id}
            getLabel={(b) => b.name}
            disabled={searching}
            onDragStart={() => setSwipeOpenId(null)}
            onReorder={reorder}
            renderItem={(brand, ctx) => (
              <BrandRow
                brand={brand}
                phone={phone}
                sortable={ctx}
                sortingDisabled={searching}
                swipeOpen={swipeOpenId === brand.id}
                onSwipeOpenChange={(open) => setSwipeOpenId(open ? brand.id : null)}
                onEdit={() => {
                  setSwipeOpenId(null);
                  setForm({ brand });
                }}
                onAssign={() => {
                  setSwipeOpenId(null);
                  setAssigning(brand);
                }}
                onDelete={() => setDeleting(brand)}
                onToggle={(active) => toggleActive(brand.id, active)}
              />
            )}
          />
        )}
      </div>

      {/* Masaüstü: özet kartı */}
      <aside
        aria-label="Marka özeti"
        className="hidden flex-col gap-4 rounded-[1.75rem] border border-line bg-surface-raised p-6 shadow-soft xl:sticky xl:top-6 xl:flex"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
            <Tag className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl leading-none font-extrabold">{brands.length}</p>
            <p className="text-sm text-ink-muted">marka</p>
          </div>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
              style={{ width: `${brands.length ? (activeCount / brands.length) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            <b className="text-ink">{activeCount}</b> aktif ·{' '}
            <b className="text-ink">{brands.length - activeCount}</b> pasif
          </p>
        </div>
        <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-ink-muted">
          Buradaki sıra, markaların mağazada görüneceği sıradır. Pasif markalar mağazada ve stok
          kartındaki marka listesinde görünmez.
        </p>
      </aside>

      {/* Telefon: yüzen ekleme düğmesi (alt çubuğun üstünde) */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Marka Ekle"
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
        <BrandFormSheet
          key={form.brand?.id ?? 'yeni'}
          brand={form.brand}
          onSave={saveBrand}
          onClose={() => setForm(null)}
        />
      ) : null}
      {assigning ? (
        <AssignProductsSheet
          key={assigning.id}
          brand={assigning}
          brandNames={brandNames}
          onAssign={assignProducts}
          onClose={() => setAssigning(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={deleting ? `${deleting.name} Silinsin Mi?` : ''}
        description={
          deleting
            ? deleting.productCount > 0
              ? `${deleting.name} markası ${deleting.productCount} üründe kullanılıyor. Silerseniz bu ürünlerin markası boş kalır.`
              : `${deleting.name} markası kalıcı olarak silinecek.`
            : ''
        }
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
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
        <Tag className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
