import { CheckCircle2, ChevronLeft, ImagePlus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { Link } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { HoverZoomImage } from './HoverZoomImage';
import { ImageOrderStrip, type ImageTile } from './ImageOrderStrip';
import { ProductPickerSheet } from './ProductPickerSheet';
import { Switch } from '../../../components/ui/Switch';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { useProducts } from '../hooks/useProducts';
import {
  MAX_FILES,
  checkImageFile,
  matchImages,
  type PickedImage,
  type RejectedFile,
} from '../image-match';
import { useProductService } from '../services/product.service';
import type { ProductItem } from '../types';
import { WizardSteps } from './WizardSteps';

const STEPS = ['Dosyaları Seç', 'Eşleştir ve Onayla'] as const;

let seq = 0;

/** Önizleme adresi: tarayıcı destekliyorsa geçici adres, değilse (testler) veri adresi. */
function toUrl(file: File): Promise<string> {
  if (typeof URL.createObjectURL === 'function') return Promise.resolve(URL.createObjectURL(file));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Toplu Görsel Yükleme: birçok görsel tek seferde seçilir; dosya adı ürünün stok kodu ya da barkodu
 * ise ürüne kendiliğinden eşlenir (`KOD.jpg`, aynı ürünün diğer resimleri `KOD_2.jpg`, `KOD_3.jpg`).
 * Eşleşmeyenlere ürün elle seçilir. Onaylamadan önce hangi ürüne hangi resimlerin gideceği görülür.
 * İlk resim vitrin resmidir. Gerçek oturumda özgün dosyalar sunucuya ve ürün kayıtlarına yazılır.
 */
export function BulkImagesView() {
  const service = useProductService();
  const { products, loading, error, refresh } = useProducts();
  const createdUrls = useRef(new Set<string>());
  const saveLock = useRef(false);
  const pickLock = useRef(false);
  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL?.(url);
    };
  }, []);
  const [step, setStep] = useState<1 | 2>(1);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [manual, setManual] = useState<ReadonlyMap<string, string>>(new Map());
  const [replace, setReplace] = useState(false);
  // Ürün başına kullanıcının sürükleyerek verdiği görsel sırası (kutucuk anahtarları).
  const [orders, setOrders] = useState<ReadonlyMap<string, string[]>>(new Map());
  // Ürün seçme penceresi açık olan eşleşmeyen dosya.
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState<{ products: number; images: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const match = useMemo(() => matchImages(images, products, manual), [images, products, manual]);
  const matchedCount = match.groups.reduce((n, g) => n + g.images.length, 0);

  const addFiles = async (files: File[]) => {
    if (pickLock.current) return;
    pickLock.current = true;
    const refused: RejectedFile[] = [];
    const accepted: PickedImage[] = [];
    const taken = new Set(images.map((i) => i.name.toLocaleLowerCase('tr')));
    for (const file of files) {
      const reason =
        checkImageFile(file) ??
        (taken.has(file.name.toLocaleLowerCase('tr')) ? 'Aynı adlı dosya zaten seçildi.' : null) ??
        (images.length + accepted.length >= MAX_FILES
          ? `Bir seferde en fazla ${MAX_FILES} dosya yüklenebilir.`
          : null);
      if (reason) {
        refused.push({ name: file.name, reason });
        continue;
      }
      taken.add(file.name.toLocaleLowerCase('tr'));
      try {
        const url = await toUrl(file);
        if (url.startsWith('blob:')) createdUrls.current.add(url);
        accepted.push({ id: `g${++seq}`, name: file.name, url, file });
      } catch {
        refused.push({ name: file.name, reason: 'Dosya okunamadı. Yeniden seçin.' });
      }
    }
    setImages((current) => [...current, ...accepted]);
    setRejected(refused);
    pickLock.current = false;
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  };

  const removeImage = (id: string) => {
    if (saveLock.current) return;
    const image = images.find((i) => i.id === id);
    if (image && createdUrls.current.delete(image.url)) URL.revokeObjectURL?.(image.url);
    setImages((current) => current.filter((i) => i.id !== id));
    setManual((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  };

  const assign = (imageId: string, productId: string) => {
    if (!saveLock.current) setManual((current) => new Map(current).set(imageId, productId));
  };

  /** Bir ürünün şeridi: (silinmiyorsa) mevcut görseller + yeni görseller, kullanıcının sırasıyla. */
  const tilesFor = (product: ProductItem, group: PickedImage[]): ImageTile[] => {
    const base: ImageTile[] = [
      ...(replace
        ? []
        : (product.imageUrls ?? []).map((url) => ({
            key: `e:${url}`,
            url,
            name: 'Mevcut görsel',
            existing: true,
          }))),
      ...group.map((i) => ({ key: `n:${i.id}`, url: i.url, name: i.name, existing: false })),
    ];
    const saved = orders.get(product.id);
    if (!saved) return base;
    const rank = new Map(saved.map((key, i) => [key, i]));
    return [...base].sort((x, y) => (rank.get(x.key) ?? 1e9) - (rank.get(y.key) ?? 1e9));
  };
  const reorderTiles = (productId: string, tiles: ImageTile[]) =>
    setOrders((current) =>
      new Map(current).set(
        productId,
        tiles.map((t) => t.key),
      ),
    );

  const reset = () => {
    for (const url of createdUrls.current) URL.revokeObjectURL?.(url);
    createdUrls.current.clear();
    setImages([]);
    setRejected([]);
    setManual(new Map());
    setDone(null);
    setStep(1);
    setSaveError(null);
  };

  const save = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    const entries = match.groups.map((g) => {
      const tiles = tilesFor(g.product, g.images);
      const byId = new Map(g.images.map((i) => [`n:${i.id}`, i]));
      // Yeni görseller kullanıcının sırasıyla; mevcutlarla birlikte son sıra (destekleniyorsa) ayrıca gider.
      const ordered = tiles.flatMap((t) => (byId.has(t.key) ? [byId.get(t.key)!] : []));
      return {
        productId: g.product.id,
        urls: ordered.map((i) => i.url),
        files: ordered.map((i) => i.file),
        ...(service.supportsImageOrder && orders.has(g.product.id)
          ? { finalOrder: tiles.map((t) => t.url) }
          : {}),
      };
    });
    try {
      const count = await service.applyImages(entries, replace);
      setDone({ products: entries.length, images: count });
    } catch (e) {
      setSaveError(dataError(e));
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error ? (
        <Alert tone="error">
          {error}{' '}
          <button type="button" onClick={() => void refresh()} className="ml-2 underline">
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
          <span className="text-ink">Toplu Görsel</span>
        </p>
      </nav>

      {done ? (
        <div className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-12 text-center shadow-soft">
          <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
          <p className="text-2xl font-extrabold">Görseller yüklendi!</p>
          <p className="text-ink-muted">
            {done.products} ürüne {done.images} görsel eklendi.
          </p>
          {service.isDemo ? (
            <p className="text-sm text-ink-muted">
              Deneme verisi: görseller veritabanına kaydedilmedi.
            </p>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
            <Link
              to={PRODUCTS_PATH}
              className="inline-flex min-h-13 flex-1 items-center justify-center rounded-full bg-brand-700 px-6 font-bold text-white"
            >
              Ürünlere Dön
            </Link>
            <Button variant="outline" flow={false} onClick={reset}>
              Yeni Yükleme
            </Button>
          </div>
        </div>
      ) : (
        <>
          {service.supportsImages ? null : (
            <Alert tone="info">
              Ürün görseli sunucuda henüz desteklenmiyor; bu ekran şimdilik yalnızca deneme
              hesabında çalışır. Görsel seçemezsiniz.
            </Alert>
          )}
          <WizardSteps steps={STEPS} current={step} />

          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface-raised p-4">
                <p className="font-bold">Dosya adı, ürünün stok kodu ya da barkodu olsun</p>
                <p className="text-sm text-ink-muted">
                  Örnek: <b>FLEXYPOS.FP-503.jpg</b>. Aynı ürünün diğer resimleri için sonuna{' '}
                  <b>_2</b>, <b>_3</b> ekleyin: <b>FLEXYPOS.FP-503_2.jpg</b>. İlk resim vitrin
                  resmidir. JPG, PNG veya WebP; her biri en fazla 5 MB.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={service.supportsImages ? onDrop : (e) => e.preventDefault()}
                className={[
                  'flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors',
                  dragging
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-field-border bg-surface-raised hover:border-brand-500',
                ].join(' ')}
              >
                <ImagePlus className="size-9 text-brand-ink" aria-hidden="true" />
                <p className="font-bold">
                  {images.length > 0
                    ? `${images.length} görsel seçildi`
                    : 'Görselleri buraya bırak'}
                </p>
                <p className="text-sm text-ink-muted">ya da bilgisayardan seç</p>
                <Button
                  variant="outline"
                  fullWidth={false}
                  flow={false}
                  disabled={!service.supportsImages}
                  onClick={() => input.current?.click()}
                >
                  {images.length > 0 ? 'Daha Fazla Ekle' : 'Görsel Seç'}
                </Button>
                <input
                  ref={input}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!service.supportsImages}
                  aria-label="Görsel dosyaları seç"
                  className="sr-only"
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files ?? []));
                    e.target.value = ''; // aynı dosyalar yeniden seçilebilsin
                  }}
                />
              </div>

              {rejected.length > 0 ? (
                <Alert tone="error">
                  <p className="font-bold">{rejected.length} dosya alınmadı:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {rejected.slice(0, 8).map((r) => (
                      <li key={r.name}>
                        {r.name}: {r.reason}
                      </li>
                    ))}
                    {rejected.length > 8 ? <li>+{rejected.length - 8} dosya daha</li> : null}
                  </ul>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  flow={false}
                  disabled={images.length === 0 || loading || !!error}
                  onClick={() => setStep(2)}
                >
                  Eşleştir
                </Button>
                {images.length > 0 ? (
                  <Button variant="outline" flow={false} onClick={reset}>
                    Seçimi Temizle
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="flex flex-wrap gap-2 text-sm font-bold" aria-label="Özet">
                <span className="rounded-full bg-success-soft px-3 py-1 text-success">
                  {match.groups.length} ürün eşleşti
                </span>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-ink">
                  {matchedCount} görsel
                </span>
                {match.unmatched.length > 0 ? (
                  <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">
                    {match.unmatched.length} eşleşmeyen
                  </span>
                ) : null}
              </p>

              {match.groups.length > 0 ? (
                <ul aria-label="Eşleşen ürünler" className="flex flex-col gap-2.5">
                  {match.groups.map(({ product, images: group }) => (
                    <li
                      key={product.id}
                      className="flex flex-col gap-2 rounded-3xl border border-line bg-surface-raised p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{product.name}</span>
                          <span className="block text-xs text-ink-muted">{product.code}</span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-muted">
                          {replace
                            ? `${product.imageUrls.length} görsel silinecek`
                            : `Şu an ${product.imageUrls.length} görsel`}
                        </span>
                      </div>
                      <ImageOrderStrip
                        productName={product.name}
                        tiles={tilesFor(product, group)}
                        lockExisting={!service.supportsImageOrder}
                        onReorder={(next) => reorderTiles(product.id, next)}
                        onRemove={(tile) => removeImage(tile.key.slice(2))}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {match.unmatched.length > 0 ? (
                <section aria-label="Eşleşmeyen dosyalar" className="flex flex-col gap-2.5">
                  <p className="px-1 text-sm font-bold text-ink-muted">
                    Eşleşmeyen dosyalar: ürünü seç ya da kaldır
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {match.unmatched.map((image) => (
                      <li
                        key={image.id}
                        className="flex flex-col gap-3 rounded-3xl border border-danger/30 bg-danger-soft p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <HoverZoomImage
                            src={image.url}
                            alt=""
                            className="size-14 shrink-0 rounded-2xl border border-line bg-surface-muted object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">
                            {image.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            aria-label={`${image.name} dosyasını kaldır`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="sm:w-56">
                          <Button
                            variant="outline"
                            flow={false}
                            onClick={() => setPickFor(image.id)}
                            leadingIcon={<Search className="size-5" aria-hidden="true" />}
                          >
                            Ürün Seç
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <fieldset disabled={saving} className="contents">
                <Switch
                  label="Mevcut görselleri değiştir"
                  checked={replace}
                  onChange={setReplace}
                />
              </fieldset>
              <p className="-mt-2 px-2 text-sm text-ink-muted">
                Kapalıyken yeni görseller ürünün mevcut görsellerinin sonuna eklenir.
              </p>

              {saveError ? <Alert tone="error">{saveError}</Alert> : null}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  flow={false}
                  disabled={matchedCount === 0}
                  loading={saving}
                  loadingLabel="Yükleniyor…"
                  onClick={() => void save()}
                >
                  {matchedCount} Görseli Yükle
                </Button>
                <Button variant="outline" flow={false} disabled={saving} onClick={() => setStep(1)}>
                  Geri
                </Button>
              </div>
              {match.unmatched.length > 0 ? (
                <p className="text-sm text-ink-muted">
                  Eşleşmeyen dosyalar yüklenmez. İstersen ürün seçerek eşle ya da kaldır.
                </p>
              ) : null}
            </>
          )}
        </>
      )}

      {pickFor ? (
        <ProductPickerSheet
          products={products}
          description={images.find((i) => i.id === pickFor)?.name ?? ''}
          onPick={(productId) => {
            assign(pickFor, productId);
            setPickFor(null);
          }}
          onClose={() => setPickFor(null)}
        />
      ) : null}
    </div>
  );
}
