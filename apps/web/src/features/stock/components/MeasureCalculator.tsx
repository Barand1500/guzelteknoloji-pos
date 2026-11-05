import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WeightUnit } from '../types';
import {
  SHAPE_FIELDS,
  formatNumber,
  parseNumber,
  shapeVolumeCm3,
  toInputValue,
  volumeToDesi,
  type Shape,
} from '../stock.calc';

type Mode = 'weight' | 'volume';

interface MeasureCalculatorProps {
  mode: Mode;
  /** Hesaplanan değer forma yazılır: ağırlıkta g (1000 g ve üzeri kg), hacimde desi. */
  onApply: (value: string, unit?: WeightUnit) => void;
  onClose: () => void;
}

const SHAPES: { value: Shape; label: string }[] = [
  { value: 'prizma', label: 'Prizma' },
  { value: 'kup', label: 'Küp' },
  { value: 'silindir', label: 'Silindir' },
];

const inputClass =
  'w-full bg-transparent text-right text-base text-ink outline-none placeholder:text-ink-muted';

/**
 * Ağırlık / hacim hesaplayıcı. Ayrı pencere değil, alanın üstünde açılan küçük panel:
 * Esc, dışarı tıklama ya da X ile kapanır. Ağırlık = hacim (cm³) × yoğunluk (g/cm³);
 * 1000 g ve üzeri otomatik kg gösterilir. Hacim (desi) = hacim (cm³) / 3000.
 */
export function MeasureCalculator({ mode, onApply, onClose }: MeasureCalculatorProps) {
  const [shape, setShape] = useState<Shape>('prizma');
  const [dims, setDims] = useState({ a: '', b: '', c: '' });
  const [density, setDensity] = useState('');
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const fields = SHAPE_FIELDS[shape];
  const volume = shapeVolumeCm3(shape, {
    a: parseNumber(dims.a),
    b: parseNumber(dims.b),
    c: parseNumber(dims.c),
  });

  // Sonuç: ağırlıkta gram (1000'den büyükse kg gösterilir), hacimde desi.
  let resultValue = 0;
  let resultUnit: WeightUnit | undefined;
  let resultText = '—';
  if (volume > 0) {
    if (mode === 'volume') {
      resultValue = volumeToDesi(volume);
      resultText = `${formatNumber(resultValue)} desi`;
    } else {
      const grams = volume * parseNumber(density);
      if (grams > 0) {
        // 1000 g ve üzeri kg, altı g olarak gösterilir ve forma aynı birimle yazılır.
        resultUnit = grams >= 1000 ? 'kg' : 'g';
        resultValue = resultUnit === 'kg' ? grams / 1000 : grams;
        resultText = `${formatNumber(resultValue)} ${resultUnit}`;
      }
    }
  }
  const hasResult = resultValue > 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano erişimi yoksa sessizce geç */
    }
  };

  const title = mode === 'weight' ? 'Ağırlık Hesapla' : 'Hacim Hesapla';

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={title}
      className="absolute right-0 bottom-full z-40 mb-2 w-[min(24rem,calc(100vw-2rem))] animate-fade-in rounded-3xl border border-line bg-surface-raised p-4 shadow-card"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 text-xs font-bold text-ink-muted"
        >
          <X className="size-4" aria-hidden="true" />
          ESC
        </button>
      </div>

      <div role="radiogroup" aria-label="Şekil" className="mb-3 flex gap-2">
        {SHAPES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={shape === s.value}
            onClick={() => setShape(s.value)}
            className={[
              'min-h-10 rounded-xl border px-4 text-sm font-bold transition-colors',
              shape === s.value
                ? 'border-brand-600 bg-brand-50 text-brand-ink'
                : 'border-field-border text-ink-muted hover:border-brand-500',
            ].join(' ')}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))` }}
        >
          {fields.map((f, index) => (
            <label
              key={f.key}
              className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-field-border px-3 py-2 focus-within:border-brand-600"
            >
              <span className="text-xs font-bold text-brand-ink">{f.label} (cm)</span>
              <input
                ref={index === 0 ? firstRef : undefined}
                inputMode="decimal"
                placeholder="0"
                value={dims[f.key]}
                onChange={(e) => setDims((d) => ({ ...d, [f.key]: e.target.value }))}
                className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
              />
            </label>
          ))}
        </div>

        {mode === 'weight' ? (
          <label className="flex items-center gap-2 rounded-xl border border-field-border px-3 py-2 focus-within:border-brand-600">
            <span className="text-sm font-bold text-brand-ink">Yoğunluk</span>
            <input
              inputMode="decimal"
              placeholder="0"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-ink-muted">g/cm³</span>
          </label>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        {mode === 'weight'
          ? 'Ağırlık = hacim (cm³) × yoğunluk — 1000 g ve üzeri otomatik kg.'
          : 'Hacim (desi) = hacim (cm³) ÷ 3000.'}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">Sonuç</p>
          <p className="truncate text-xl font-extrabold" aria-live="polite">
            {resultText}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!hasResult}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-field-border px-3 text-sm font-semibold disabled:opacity-40"
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
          <button
            type="button"
            disabled={!hasResult}
            onClick={() => {
              onApply(toInputValue(resultValue), resultUnit);
              onClose();
            }}
            className="min-h-10 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
