import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { DealBadge } from './DealBadge';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

interface DealIconPickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  error?: string | undefined;
}

/**
 * İkon yükleme alanı: dokunarak seç ya da (masaüstünde) dosyayı sürükleyip bırak. Seçilen dosya
 * hemen önizlenir. İkon, rozetin kendisidir (kare, 400×400 önerilir); yalnızca görsel dosyaları
 * ve en çok 2 MB kabul edilir. Gerçek yükleme API'ye bağlanınca sunucuda yapılır.
 */
export function DealIconPicker({ value, onChange, error }: DealIconPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const created = useRef<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const urls = created.current;
    return () => urls.forEach((url) => URL.revokeObjectURL?.(url));
  }, []);

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProblem('Yalnızca görsel dosyaları (PNG, JPG, WebP, SVG) yükleyebilirsiniz.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem('İkon en çok 2 MB olabilir.');
      return;
    }
    setProblem(null);
    const url = URL.createObjectURL?.(file) ?? '';
    if (url) {
      created.current.push(url);
      onChange(url);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0]);
  };

  const shown = problem ?? error;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="İkon dosyası seç"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={[
            'flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 transition-colors',
            value ? 'border-line bg-surface-muted' : 'border-dashed',
            over ? 'border-brand-600 bg-brand-50' : value ? '' : 'border-field-border bg-surface',
          ].join(' ')}
        >
          {value ? (
            <DealBadge url={value} className="size-20" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-1.5 text-ink-muted transition-colors hover:text-brand-ink"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
                <ImagePlus className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">İkon Ekle</span>
            </button>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {value ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-field-border px-4 text-sm font-semibold transition-colors hover:border-brand-500"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Değiştir
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-field-border px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Kaldır
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Rozet olarak kullanılacak görseli yükleyin. Kare, 400×400 oranı önerilir.
            </p>
          )}
        </div>
      </div>
      {shown ? <Alert tone="error">{shown}</Alert> : null}
    </div>
  );
}
