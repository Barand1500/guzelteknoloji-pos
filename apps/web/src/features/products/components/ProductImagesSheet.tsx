import { CatalogImage } from '../../../components/ui/CatalogImage';
import { ImagePlus, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { dataError } from '../../../lib/catalog-data';
import { MAX_FILES, checkImageFile } from '../image-match';
import { useProductService } from '../services/product.service';
import type { ProductItem } from '../types';
import { ImageOrderStrip, type ImageTile } from './ImageOrderStrip';

interface ProductImagesSheetProps {
  product: ProductItem;
  /** Yükleme bitince (liste yenilensin diye) çağrılır; `count` yüklenen görsel sayısıdır. */
  onDone: (count: number, replaced: boolean) => void;
  onClose: () => void;
}

interface Picked {
  id: string;
  name: string;
  url: string;
  file: File;
}

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
 * Ürünün görselleri (ürün listesinde resme çift tıklayınca açılır). Mevcut görseller görünür;
 * iki yol vardır: "Daha Fazla Yükle" yeni görselleri mevcutların sonuna ekler, "Görselleri
 * Değiştir" mevcut görsellerin yerine yenilerini koyar (ilk görsel vitrin resmidir). Seçilen
 * dosyalar yüklenmeden önce burada önizlenir; istenmeyen ✕ ile çıkarılır.
 */
export function ProductImagesSheet({ product, onDone, onClose }: ProductImagesSheetProps) {
  const service = useProductService();
  const [mode, setMode] = useState<'add' | 'replace' | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(() => product.imageUrls ?? []);
  const input = useRef<HTMLInputElement>(null);
  const created = useRef(new Set<string>());

  useEffect(() => {
    const urls = created.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL?.(url);
    };
  }, []);

  const open = (next: 'add' | 'replace') => {
    setMode(next);
    input.current?.click();
  };

  const take = async (files: File[]) => {
    const refused: string[] = [];
    const accepted: Picked[] = [];
    for (const file of files) {
      const reason = checkImageFile(file);
      if (reason) {
        refused.push(`${file.name}: ${reason}`);
        continue;
      }
      if (picked.length + accepted.length >= MAX_FILES) break;
      try {
        const url = await toUrl(file);
        if (url.startsWith('blob:')) created.current.add(url);
        accepted.push({ id: `p${++seq}`, name: file.name, url, file });
      } catch {
        refused.push(`${file.name}: Dosya okunamadı.`);
      }
    }
    setPicked((current) => [...current, ...accepted]);
    setError(refused.length > 0 ? refused.slice(0, 3).join(' · ') : null);
  };

  const remove = (id: string) => setPicked((current) => current.filter((p) => p.id !== id));

  const cancel = () => {
    setPicked([]);
    setMode(null);
    setError(null);
  };

  const orderChanged = current.some((url, index) => url !== product.imageUrls?.[index]);
  const saveOrder = async () => {
    if (saving || !orderChanged) return;
    setSaving(true);
    setError(null);
    try {
      await service.applyImages([{ productId: product.id, urls: [], finalOrder: current }], false);
      onDone(0, false);
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  const upload = async () => {
    if (saving || picked.length === 0 || !mode) return;
    setSaving(true);
    setError(null);
    try {
      const count = await service.applyImages(
        [
          {
            productId: product.id,
            urls: picked.map((p) => p.url),
            files: picked.map((p) => p.file),
            ...(mode === 'add' && orderChanged
              ? { finalOrder: [...current, ...picked.map((p) => p.url)] }
              : {}),
          },
        ],
        mode === 'replace',
      );
      onDone(count, mode === 'replace');
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  const supported = service.supportsImages;

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="lg"
      title="Ürün Görselleri"
      description={`${product.name} · ${product.code}`}
    >
      <div className="flex flex-col gap-5">
        {supported ? null : <Alert tone="info">Ürün görseli sunucuda henüz desteklenmiyor.</Alert>}
        {!service.isDemo && supported && (
          <p className="text-sm text-ink-muted">
            Görseller WebP olarak kaydedilir. Şeffaf zemin açıksa arka plan kalıcı olarak temizlenir.
            Uzun kenar en fazla 2048 pikseldir.
          </p>
        )}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <section aria-label="Mevcut görseller" className="flex flex-col gap-2">
          <p className="text-sm font-bold tracking-wide text-ink-muted uppercase">
            Mevcut görseller{' '}
            <span className="rounded-full bg-surface-muted px-2 py-0.5">{current.length}</span>
          </p>
          {current.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-ink-muted">
              Bu ürünün henüz görseli yok.
            </p>
          ) : (
            <>
              <ImageOrderStrip
                productName={product.name}
                tiles={current.map((url): ImageTile => ({ key: `e:${url}`, url, name: 'Mevcut görsel', existing: true }))}
                lockExisting={!service.supportsImageOrder || saving || picked.length > 0}
                onReorder={(tiles) => setCurrent(tiles.map((tile) => tile.url))}
                onRemove={() => {}}
              />
              {current.length > 1 && service.supportsImageOrder && (
                <p className="text-sm text-ink-muted">Görselleri sürükleyerek sıralayın. İlk görsel vitrinde gösterilir.</p>
              )}
              {orderChanged && (
                <Button flow={false} disabled={picked.length > 0} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void saveOrder()}>
                  Sıralamayı Kaydet
                </Button>
              )}
            </>
          )}
        </section>

        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={!supported}
          aria-label="Görsel dosyaları seç"
          className="sr-only"
          onChange={(e) => {
            void take(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />

        {picked.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              flow={false}
              disabled={!supported}
              onClick={() => open('add')}
              leadingIcon={<ImagePlus className="size-5" aria-hidden="true" />}
            >
              Daha Fazla Yükle
            </Button>
            <Button
              variant="outline"
              flow={false}
              disabled={!supported || current.length === 0}
              onClick={() => open('replace')}
              leadingIcon={<RefreshCw className="size-5" aria-hidden="true" />}
            >
              Görselleri Değiştir
            </Button>
          </div>
        ) : (
          <section aria-label="Yüklenecek görseller" className="flex flex-col gap-3">
            <p className="text-sm font-bold">
              {mode === 'replace'
                ? `Mevcut ${current.length} görselin yerine ${picked.length} yeni görsel konacak`
                : `Mevcut görsellerin sonuna ${picked.length} yeni görsel eklenecek`}
            </p>
            <ul className="flex flex-wrap gap-2.5">
              {picked.map((p) => (
                <li key={p.id} className="relative">
                  <CatalogImage
                    page="products"
                    src={p.url}
                    alt={p.name}
                    className="size-20 rounded-2xl border border-line bg-surface-muted object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`${p.name} dosyasını çıkar`}
                    className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-surface shadow-soft"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                loading={saving}
                loadingLabel="Yükleniyor…"
                onClick={() => void upload()}
              >
                {mode === 'replace' ? 'Görselleri Değiştir' : `${picked.length} Görseli Yükle`}
              </Button>
              <Button variant="outline" flow={false} disabled={saving} onClick={cancel}>
                Vazgeç
              </Button>
              <Button
                variant="outline"
                flow={false}
                disabled={saving}
                onClick={() => input.current?.click()}
              >
                Başka Ekle
              </Button>
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
