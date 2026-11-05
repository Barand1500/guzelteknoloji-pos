import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Alert } from '../../../components/ui/Alert';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

interface LogoPickerProps {
  value: string | null;
  /** Önizleme/alt metin için marka adı. */
  name: string;
  onChange: (url: string | null) => void;
}

/**
 * Logo seçici: dokunarak seç ya da (masaüstünde) dosyayı sürükleyip bırak. Seçilen dosya hemen
 * önizlenir. Yalnızca görsel dosyalar ve en çok 2 MB kabul edilir. Tarayıcı belleğindeki geçici
 * adresler (blob) bileşen kapanınca serbest bırakılır; gerçek yükleme API'ye bağlanınca yapılır.
 */
export function LogoPicker({ value, name, onChange }: LogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const created = useRef<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const urls = created.current;
    return () => urls.forEach((url) => URL.revokeObjectURL?.(url));
  }, []);

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Yalnızca görsel dosyaları (PNG, JPG, WebP, SVG) yükleyebilirsiniz.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Logo en çok 2 MB olabilir.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL?.(file) ?? '';
    if (url) created.current.push(url);
    onChange(url || null);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Logo dosyası seç"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={[
          // Telefonda 16:9; masaüstünde yandaki alanların (ad, aktif, ürünler) yüksekliğine kadar uzar.
          'relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-colors md:aspect-auto md:min-h-40 md:flex-1',
          over ? 'border-brand-600 bg-brand-50' : 'border-field-border bg-surface',
        ].join(' ')}
      >
        {value ? (
          // Logo zemini her zaman açık renk: siyah logolar koyu temada da okunur.
          <span className="flex size-full items-center justify-center bg-white p-4">
            <img
              src={value}
              alt={`${name || 'Marka'} logosu`}
              className="max-h-full max-w-full object-contain"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 text-ink-muted transition-colors hover:text-brand-ink"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
              <ImagePlus className="size-6" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">Logo Ekle</span>
            <span className="px-3 text-center text-xs">
              Dokun ya da buraya sürükle · 800×230 oranı önerilir
            </span>
          </button>
        )}
      </div>

      {value ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-field-border text-sm font-semibold transition-colors hover:border-brand-500"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Değiştir
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-field-border text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Kaldır
          </button>
        </div>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
