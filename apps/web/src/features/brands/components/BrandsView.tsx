import { Plus, Tag } from 'lucide-react';
import { usePublishAddAction } from '../../app-shell/save-action';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { stockErrorMessage } from '../../stock/services/stock.service';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { SortableList } from '../../../components/ui/SortableList';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { useBrands } from '../hooks/useBrands';
import type { Brand, BrandDraft } from '../types';
import { BrandFormSheet } from './BrandFormSheet';
import { BrandProductsSheet } from './BrandProductsSheet';
import { BrandRow } from './BrandRow';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * Marka penceresi durumu: kapalı / yeni marka (brandId yok) / mevcut marka düzenleme. Marka her
 * zaman güncel listeden okunur (ürün ekleyip çıkarınca sayısı canlı değişsin diye).
 */
type FormState = { brandId: string | null } | null;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Markalar ekranı. Telefonda satırlar sola kaydırınca işlem gösterir ve basılı tutup sürükleyerek
 * sıralanır; masaüstünde satırın içinde düğmeler ve ⠿ tutamağı vardır. Liste sayfalı DEĞİLDİR (tüm markalar tek listede).
 * Sıra, mağazada markaların gösterim sırasıdır (arama sırasında sıralama kapalıdır).
 */
export function BrandsView() {
  const {
    brands,
    loading,
    error,
    busy,
    reload,
    toggleActive,
    reorder,
    save,
    remove,
    assign,
    unassign,
  } = useBrands();
  const phone = !useMediaQuery('(min-width: 48rem)');

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  // Satırdaki "Ürünler" işlemi: yalnızca ürünler penceresi (düzenleme formu açılmaz).
  const [productsFor, setProductsFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const brandNames = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const editingBrand = form?.brandId ? (brands.find((b) => b.id === form.brandId) ?? null) : null;
  const productsBrand = productsFor ? (brands.find((b) => b.id === productsFor) ?? null) : null;

  const saveBrand = async (draft: BrandDraft) => {
    const editing = editingBrand;
    const saved = await save(draft, editing?.id);
    setForm(null);
    showNotice(editing ? `${saved.name} güncellendi.` : `${saved.name} eklendi.`);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { id, name } = deleting;
    setSwipeOpenId(null);
    try {
      await remove(id);
      setDeleting(null);
      showNotice(`${name} silindi.`);
    } catch (error) {
      setDeleteError(stockErrorMessage(error));
    }
  };

  // Logoya çift tıklama: pencere açılmadan doğrudan dosya seçici açılır, seçilen görsel kaydedilir.
  const logoInput = useRef<HTMLInputElement>(null);
  const logoTarget = useRef<Brand | null>(null);
  const pickLogoFor = (brand: Brand) => {
    setSwipeOpenId(null);
    logoTarget.current = brand;
    logoInput.current?.click();
  };
  const takeLogo = (file: File | undefined) => {
    const brand = logoTarget.current;
    logoTarget.current = null;
    if (!file || !brand) return;
    if (!LOGO_TYPES.includes(file.type)) {
      showNotice('Yalnızca görsel dosyaları (PNG, JPG, WebP, SVG) yükleyebilirsiniz.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      showNotice('Logo en çok 2 MB olabilir.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showNotice('Logo okunamadı. Tekrar seçin.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      save(
        {
          name: brand.name,
          description: brand.description,
          logoUrl: reader.result,
          active: brand.active,
          seoTitle: brand.seoTitle,
          seoDescription: brand.seoDescription,
        },
        brand.id,
      )
        .then(() => showNotice(`${brand.name} logosu güncellendi.`))
        .catch((e: unknown) => showNotice(stockErrorMessage(e)));
    };
    reader.readAsDataURL(file);
  };

  const openAdd = () => setForm({ brandId: null });
  usePublishAddAction('Marka Ekle', openAdd);

  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy={busy}>
      <input
        ref={logoInput}
        type="file"
        accept={LOGO_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Logo dosyası seç"
        onChange={(e) => {
          takeLogo(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? (
        <>
          <Alert tone="error">{error}</Alert>
          <Button fullWidth={false} onClick={() => void reload()}>
            Yeniden Yükle
          </Button>
        </>
      ) : null}
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
              : 'Sıralamak için ⠿ tutamağından sürükleyin · düzenlemek için markaya çift tıklayın.'}
        </p>

        {loading ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[4.25rem] animate-pulse rounded-3xl bg-surface-muted" />
            ))}
          </div>
        ) : brands.length === 0 && error ? null : brands.length === 0 ? (
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
            disabled={searching || busy}
            onDragStart={() => setSwipeOpenId(null)}
            onReorder={reorder}
            renderItem={(brand, ctx) => (
              <BrandRow
                brand={brand}
                phone={phone}
                sortable={ctx}
                sortingDisabled={searching || busy}
                swipeOpen={swipeOpenId === brand.id}
                onSwipeOpenChange={(open) => setSwipeOpenId(open ? brand.id : null)}
                onEdit={() => {
                  setSwipeOpenId(null);
                  setForm({ brandId: brand.id });
                }}
                onEditLogo={() => pickLogoFor(brand)}
                onAssign={() => {
                  setSwipeOpenId(null);
                  setProductsFor(brand.id);
                }}
                onDelete={() => {
                  setDeleteError(null);
                  setDeleting(brand);
                }}
                onToggle={(active) => toggleActive(brand.id, active)}
              />
            )}
          />
        )}
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
        <BrandFormSheet
          key={form.brandId ?? 'yeni'}
          brand={editingBrand}
          onSave={saveBrand}
          onClose={() => setForm(null)}
        />
      ) : null}
      {productsBrand ? (
        <BrandProductsSheet
          key={productsBrand.id}
          brand={productsBrand}
          brandNames={brandNames}
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
          deleteError ??
          (deleting
            ? deleting.productCount > 0
              ? `${deleting.name} markası ${deleting.productCount} üründe kullanılıyor. Silerseniz bu ürünlerin markası boş kalır.`
              : `${deleting.name} markası kalıcı olarak silinecek.`
            : '')
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
