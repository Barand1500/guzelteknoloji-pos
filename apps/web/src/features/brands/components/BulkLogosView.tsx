import { CheckCircle2, ChevronLeft, ImagePlus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { BRANDS_PATH } from '../../../config/navigation';
import { dataError } from '../../../lib/catalog-data';
import { HoverZoomImage } from '../../products/components/HoverZoomImage';
import { ImageOrderStrip, type ImageTile } from '../../products/components/ImageOrderStrip';
import { WizardSteps } from '../../products/components/WizardSteps';
import { fileOrder, matchBrandByFile } from '../brand-name';
import { useBrands } from '../hooks/useBrands';
import type { Brand } from '../types';
import { BrandPickerSheet } from './BrandPickerSheet';

const STEPS = ['Dosyaları Seç', 'Eşleştir ve Onayla'] as const;
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 300;

interface Picked {
  id: string;
  name: string;
  url: string;
  file: File;
}

let seq = 0;

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });

/**
 * Toplu Logo Yükleme (Ürünler → Toplu Görsel ile aynı ekran düzeni): dosya adı marka adıyla aynıysa
 * logo markaya kendiliğinden eşlenir (`APPLE.png`; aynı markanın diğer dosyaları `APPLE_2.png`).
 * Eşleşmeyenlere marka elle seçilir. Bir markanın logosu tektir: şeridin ilk görseli kullanılır.
 */
export function BulkLogosView() {
  const { brands, loading, error, reload, save } = useBrands();
  const saveLock = useRef(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [images, setImages] = useState<Picked[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [manual, setManual] = useState<ReadonlyMap<string, string>>(new Map());
  const [orders, setOrders] = useState<ReadonlyMap<string, string[]>>(new Map());
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const created = urls.current;
    return () => {
      for (const url of created) URL.revokeObjectURL?.(url);
    };
  }, []);

  const match = useMemo(() => {
    const byBrand = new Map<string, Picked[]>();
    const unmatched: Picked[] = [];
    const byId = new Map(brands.map((b) => [b.id, b]));
    for (const image of images) {
      const chosen = manual.get(image.id);
      const brand = (chosen ? byId.get(chosen) : undefined) ?? matchBrandByFile(image.name, brands);
      if (!brand) unmatched.push(image);
      else byBrand.set(brand.id, [...(byBrand.get(brand.id) ?? []), image]);
    }
    const groups = brands
      .filter((b) => byBrand.has(b.id))
      .map((brand) => ({
        brand,
        images: [...byBrand.get(brand.id)!].sort((a, b) => fileOrder(a.name) - fileOrder(b.name)),
      }));
    return { groups, unmatched };
  }, [images, brands, manual]);

  const addFiles = (files: File[]) => {
    const refused: { name: string; reason: string }[] = [];
    const accepted: Picked[] = [];
    const taken = new Set(images.map((i) => i.name.toLocaleLowerCase('tr')));
    for (const file of files) {
      const reason = !TYPES.includes(file.type)
        ? 'Yalnızca PNG, JPG, WebP ya da SVG.'
        : file.size > MAX_BYTES
          ? 'En fazla 2 MB olabilir.'
          : taken.has(file.name.toLocaleLowerCase('tr'))
            ? 'Aynı adlı dosya zaten seçildi.'
            : images.length + accepted.length >= MAX_FILES
              ? `Bir seferde en fazla ${MAX_FILES} dosya yüklenebilir.`
              : null;
      if (reason) {
        refused.push({ name: file.name, reason });
        continue;
      }
      taken.add(file.name.toLocaleLowerCase('tr'));
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      accepted.push({ id: `l${++seq}`, name: file.name, url, file });
    }
    setImages((current) => [...current, ...accepted]);
    setRejected(refused);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeImage = (id: string) => {
    if (saveLock.current) return;
    const image = images.find((i) => i.id === id);
    if (image && urls.current.delete(image.url)) URL.revokeObjectURL?.(image.url);
    setImages((current) => current.filter((i) => i.id !== id));
    setManual((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  };

  const tilesFor = (brandId: string, group: Picked[]): ImageTile[] => {
    const base = group.map((i) => ({
      key: `n:${i.id}`,
      url: i.url,
      name: i.name,
      existing: false,
    }));
    const saved = orders.get(brandId);
    if (!saved) return base;
    const rank = new Map(saved.map((key, i) => [key, i]));
    return [...base].sort((x, y) => (rank.get(x.key) ?? 1e9) - (rank.get(y.key) ?? 1e9));
  };

  const reset = () => {
    for (const url of urls.current) URL.revokeObjectURL?.(url);
    urls.current.clear();
    setImages([]);
    setRejected([]);
    setManual(new Map());
    setOrders(new Map());
    setDone(null);
    setStep(1);
    setSaveError(null);
  };

  const apply = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    let count = 0;
    try {
      for (const { brand, images: group } of match.groups) {
        const first = tilesFor(brand.id, group)[0];
        const picked = group.find((i) => `n:${i.id}` === first?.key);
        if (!picked) continue;
        const logoUrl = await readDataUrl(picked.file);
        await save(
          {
            name: brand.name,
            description: brand.description,
            logoUrl,
            active: brand.active,
            seoTitle: brand.seoTitle,
            seoDescription: brand.seoDescription,
          },
          brand.id,
        );
        count++;
      }
      setDone(count);
    } catch (e) {
      setSaveError(`${count} logo yüklendi, sonra hata oluştu: ${dataError(e)}`);
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  const brandOf = (b: Brand) => b.name;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error ? (
        <Alert tone="error">
          {error}{' '}
          <button type="button" onClick={() => void reload()} className="ml-2 underline">
            Tekrar Dene
          </button>
        </Alert>
      ) : null}
      <nav aria-label="Sayfa yolu" className="flex items-center gap-2">
        <Link
          to={BRANDS_PATH}
          aria-label="Markalar sayfasına dön"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-brand-50 hover:text-brand-ink"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <p className="text-sm font-bold text-ink-muted">
          <Link to={BRANDS_PATH} className="hover:text-ink">
            Markalar
          </Link>
          <span aria-hidden="true"> › </span>
          <span className="text-ink">Toplu Logo</span>
        </p>
      </nav>

      {done !== null ? (
        <div className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-4 rounded-[1.75rem] bg-surface-raised px-6 py-12 text-center shadow-soft">
          <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
          <p className="text-2xl font-extrabold">Logolar yüklendi!</p>
          <p className="text-ink-muted">{done} markanın logosu güncellendi.</p>
          <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
            <Link
              to={BRANDS_PATH}
              className="inline-flex min-h-13 flex-1 items-center justify-center rounded-full bg-brand-700 px-6 font-bold text-white"
            >
              Markalara Dön
            </Link>
            <Button variant="outline" flow={false} onClick={reset}>
              Yeni Yükleme
            </Button>
          </div>
        </div>
      ) : (
        <>
          <WizardSteps steps={STEPS} current={step} />

          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface-raised p-4">
                <p className="font-bold">Dosya adı, marka adı olsun</p>
                <p className="text-sm text-ink-muted">
                  Örnek: <b>APPLE.png</b>. Aynı markanın başka dosyaları için sonuna <b>_2</b>,{' '}
                  <b>_3</b> ekleyin: <b>APPLE_2.png</b>. İlk görsel logo olur. PNG, JPG, WebP veya
                  SVG; her biri en fazla 2 MB.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                  'flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors',
                  dragging
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-field-border bg-surface-raised hover:border-brand-500',
                ].join(' ')}
              >
                <ImagePlus className="size-9 text-brand-ink" aria-hidden="true" />
                <p className="font-bold">
                  {images.length > 0 ? `${images.length} logo seçildi` : 'Logoları buraya bırak'}
                </p>
                <p className="text-sm text-ink-muted">ya da bilgisayardan seç</p>
                <Button
                  variant="outline"
                  fullWidth={false}
                  flow={false}
                  onClick={() => input.current?.click()}
                >
                  {images.length > 0 ? 'Daha Fazla Ekle' : 'Görsel Seç'}
                </Button>
                <input
                  ref={input}
                  type="file"
                  multiple
                  accept={TYPES.join(',')}
                  aria-label="Logo dosyaları seç"
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.target.value = '';
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
                  {match.groups.length} marka eşleşti
                </span>
                {match.unmatched.length > 0 ? (
                  <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">
                    {match.unmatched.length} eşleşmeyen
                  </span>
                ) : null}
              </p>

              {match.groups.length > 0 ? (
                <ul aria-label="Eşleşen markalar" className="flex flex-col gap-2.5">
                  {match.groups.map(({ brand, images: group }) => (
                    <li
                      key={brand.id}
                      className="flex flex-col gap-2 rounded-3xl border border-line bg-surface-raised p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="block min-w-0 truncate font-bold">{brandOf(brand)}</span>
                        <span className="shrink-0 text-xs text-ink-muted">
                          {brand.logoUrl ? 'Şu an logosu var' : 'Şu an logosu yok'}
                        </span>
                      </div>
                      <ImageOrderStrip
                        productName={brand.name}
                        tiles={tilesFor(brand.id, group)}
                        lockExisting={false}
                        onReorder={(next) =>
                          setOrders((current) =>
                            new Map(current).set(
                              brand.id,
                              next.map((t) => t.key),
                            ),
                          )
                        }
                        onRemove={(tile) => removeImage(tile.key.slice(2))}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {match.unmatched.length > 0 ? (
                <section aria-label="Eşleşmeyen dosyalar" className="flex flex-col gap-2.5">
                  <p className="px-1 text-sm font-bold text-ink-muted">
                    Eşleşmeyen dosyalar: markayı seç ya da kaldır
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {match.unmatched.map((image) => (
                      <li
                        key={image.id}
                        className="relative flex flex-col gap-3 rounded-3xl border border-danger/30 bg-danger-soft p-3 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 pr-10 sm:pr-0">
                          <HoverZoomImage
                            src={image.url}
                            alt=""
                            className="size-14 shrink-0 rounded-2xl border border-line bg-surface-muted object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">
                            {image.name}
                          </span>
                        </div>
                        <div className="sm:w-56">
                          <Button
                            variant="outline"
                            flow={false}
                            onClick={() => setPickFor(image.id)}
                            leadingIcon={<Search className="size-5" aria-hidden="true" />}
                          >
                            Marka Seç
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          aria-label={`${image.name} dosyasını kaldır`}
                          title="Kaldır"
                          className="absolute top-3 right-3 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted hover:text-danger sm:static"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {saveError ? <Alert tone="error">{saveError}</Alert> : null}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  flow={false}
                  disabled={match.groups.length === 0}
                  loading={saving}
                  loadingLabel="Yükleniyor…"
                  onClick={() => void apply()}
                >
                  {match.groups.length} Logoyu Yükle
                </Button>
                <Button variant="outline" flow={false} disabled={saving} onClick={() => setStep(1)}>
                  Geri
                </Button>
              </div>
              {match.unmatched.length > 0 ? (
                <p className="text-sm text-ink-muted">
                  Eşleşmeyen dosyalar yüklenmez. İstersen marka seçerek eşle ya da kaldır.
                </p>
              ) : null}
            </>
          )}
        </>
      )}

      {pickFor ? (
        <BrandPickerSheet
          brands={brands}
          description={images.find((i) => i.id === pickFor)?.name ?? ''}
          onPick={(brandId) => {
            setManual((current) => new Map(current).set(pickFor, brandId));
            setPickFor(null);
          }}
          onClose={() => setPickFor(null)}
        />
      ) : null}
    </div>
  );
}
