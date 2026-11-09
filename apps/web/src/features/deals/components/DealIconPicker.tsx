import { ImagePlus, X } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
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
 * hemen önizlenir. İkon varken "Değiştir/Kaldır" düğmesi yoktur: köşedeki küçük ✕ kaldırır, ikona
 * ÇİFT TIKLAYINCA dosya seçici açılıp değiştirilir (ya da yeni dosya üstüne sürüklenip bırakılır). İkon, rozetin kendisidir (kare, 400×400 önerilir); yalnızca görsel dosyaları
 * ve en çok 2 MB kabul edilir. İçerik Base64 ile gönderilir, özgün dosya sunucuda korunur.
 */
export function DealIconPicker({ value, onChange, error }: DealIconPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const take = (file: File | undefined) => {
    const current = ++sequence.current;
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      setProblem('Yalnızca görsel dosyaları (PNG, JPG, WebP, SVG) yükleyebilirsiniz.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem('İkon en çok 2 MB olabilir.');
      return;
    }
    setProblem(null);
    const reader = new FileReader();
    reader.onerror = () => {
      if (sequence.current === current) setProblem('İkon okunamadı. Tekrar seçin.');
    };
    reader.onload = () => {
      if (sequence.current === current && typeof reader.result === 'string')
        onChange(reader.result);
    };
    reader.readAsDataURL(file);
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
        <div className="relative shrink-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            onDoubleClick={value ? () => inputRef.current?.click() : undefined}
            title={value ? 'İkonu değiştirmek için çift tıklayın' : undefined}
            className={[
              'flex size-28 items-center justify-center overflow-hidden rounded-3xl border-2 transition-colors',
              value ? 'cursor-pointer border-line bg-surface-muted' : 'border-dashed',
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
          {value ? (
            <button
              type="button"
              onClick={() => {
                sequence.current++;
                onChange(null);
              }}
              aria-label="İkonu kaldır"
              title="İkonu kaldır"
              className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-ink text-surface shadow-soft"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="min-w-0 flex-1 text-sm text-ink-muted">
          {value
            ? 'Değiştirmek için ikona çift tıklayın, kaldırmak için ✕ simgesine basın.'
            : 'Rozet olarak kullanılacak görseli yükleyin. Kare, 400×400 oranı önerilir.'}
        </p>
      </div>
      {shown ? <Alert tone="error">{shown}</Alert> : null}
    </div>
  );
}
