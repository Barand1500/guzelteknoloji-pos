import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { PRESETS, type DealIcon, type DealIconKey } from '../types';
import { DealBadge } from './DealBadge';

const MAX_BYTES = 2 * 1024 * 1024;

interface DealIconPickerProps {
  icon: DealIcon;
  /** Hazır şekil seçilince; rozet yazısı o şeklin varsayılanına döner. */
  onPreset: (key: DealIconKey) => void;
  onImage: (url: string) => void;
}

/**
 * Rozet seçici: hazır renkli şekillerden biri ya da kendi görselin. Seçili olan çerçeveli görünür.
 * Kendi görselin kare (400×400) olmalı; yalnızca görsel dosyaları ve en çok 2 MB kabul edilir.
 */
export function DealIconPicker({ icon, onPreset, onImage }: DealIconPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const created = useRef<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setError('Görsel en çok 2 MB olabilir.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL?.(file) ?? '';
    if (url) {
      created.current.push(url);
      onImage(url);
    }
  };

  const tile = (on: boolean) =>
    [
      'flex size-16 items-center justify-center rounded-2xl border-2 transition-all duration-200',
      on
        ? 'border-brand-600 bg-brand-50 shadow-soft'
        : 'border-line bg-surface hover:border-brand-500',
    ].join(' ');

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        aria-label="Rozet görseli seç"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div role="radiogroup" aria-label="Rozet şekli" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const on = icon.type === 'preset' && icon.key === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.label}
              title={p.label}
              onClick={() => onPreset(p.key)}
              className={tile(on)}
            >
              <DealBadge icon={{ type: 'preset', key: p.key }} text={p.text} className="size-11" />
            </button>
          );
        })}
        {icon.type === 'image' ? (
          <span className="relative">
            <span className={tile(true)}>
              <DealBadge icon={icon} text="" className="size-11" />
            </span>
            <button
              type="button"
              onClick={() => onPreset('yeni')}
              aria-label="Yüklenen görseli kaldır"
              title="Kaldır"
              className="absolute -top-1.5 -right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-danger text-surface shadow-soft"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Kendi görselimi yükle"
            title="Kendi görselimi yükle"
            className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed border-field-border text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink"
          >
            <ImagePlus className="size-5" aria-hidden="true" />
            <span className="text-[0.625rem] font-bold">Yükle</span>
          </button>
        )}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
