import { Check, Copy, Ruler, Scale, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Segmented } from '../../../components/ui/Segmented';
import { sanitizeNumeric } from '../../../lib/numeric';
import {
  DESI_DIVISORS,
  SHAPE_FIELDS,
  formatNumber,
  parseNumber,
  shapeVolumeCm3,
  toInputValue,
  volumeToDesi,
  type DesiRegion,
  type Shape,
} from '../stock.calc';
import type { WeightUnit } from '../types';

type Mode = 'weight' | 'volume';

interface MeasureCalculatorProps {
  mode: Mode;
  /** Hesaplanan değer forma yazılır: ağırlıkta g (1000 g ve üzeri kg), hacimde desi. */
  onApply: (value: string, unit?: WeightUnit) => void;
  onClose: () => void;
}

const SHAPES = [
  { value: 'prizma', label: 'Prizma' },
  { value: 'kup', label: 'Küp' },
  { value: 'silindir', label: 'Silindir' },
];

const REGIONS = [
  { value: 'yurtici', label: 'Yurt İçi' },
  { value: 'yurtdisi', label: 'Yurt Dışı' },
];

/**
 * Ağırlık / Desi hesaplayıcı. Pencere gibi görünür ama arka plana tıklayınca KAPANMAZ
 * (modal kuralı): yalnızca Esc, X ya da "Uygula" ile kapanır. Geniş ekranda alanın üstünde,
 * telefonda alt çubuğun üstünde açılır.
 *
 * - Ağırlık = hacim (cm³) × yoğunluk (g/cm³); 1000 g ve üzeri kg gösterilir.
 * - Desi = (En × Boy × Yükseklik) ÷ bölen. Yurt içi kargoda bölen 3000, yurt dışı
 *   (DHL/UPS/FedEx gibi uluslararası taşıyıcılar) 5000'dir.
 */
export function MeasureCalculator({ mode, onApply, onClose }: MeasureCalculatorProps) {
  const [shape, setShape] = useState<Shape>('prizma');
  const [region, setRegion] = useState<DesiRegion>('yurtici');
  const [dims, setDims] = useState({ a: '', b: '', c: '' });
  const [density, setDensity] = useState('');
  const [copied, setCopied] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Masaüstünde pencere alanın sağ kenarına hizalı açılır; soldaki alanlarda ekranın solundan taşarsa
  // sola hizalanır (ya da tersi). Konum doğrudan DOM'a yazılır, görünürken zıplama olmaz.
  useLayoutEffect(() => {
    const el = dialogRef.current;
    if (!el || !window.matchMedia?.('(min-width: 48rem)').matches) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    if (rect.left < margin) {
      el.style.left = '0';
      el.style.right = 'auto';
    } else if (rect.right > window.innerWidth - margin) {
      el.style.right = '0';
      el.style.left = 'auto';
    }
  }, []);

  useEffect(() => {
    firstRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isWeight = mode === 'weight';
  // Desi hesabında şekil yoktur: kargo kolisi her zaman prizmadır (En × Boy × Yükseklik).
  const activeShape: Shape = isWeight ? shape : 'prizma';
  const fields = SHAPE_FIELDS[activeShape];
  const volume = shapeVolumeCm3(activeShape, {
    a: parseNumber(dims.a),
    b: parseNumber(dims.b),
    c: parseNumber(dims.c),
  });

  let resultValue = 0;
  let resultUnit: WeightUnit | undefined;
  let resultText = '—';
  if (volume > 0) {
    if (!isWeight) {
      resultValue = volumeToDesi(volume, region);
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

  const formula = isWeight
    ? 'Ağırlık = Hacim (cm³) × Yoğunluk (g/cm³)'
    : `Desi = (En × Boy × Yükseklik) ÷ ${DESI_DIVISORS[region]}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano erişimi yoksa sessizce geç */
    }
  };

  const title = isWeight ? 'Ağırlık Hesapla' : 'Desi Hesapla';
  const Icon = isWeight ? Scale : Ruler;

  return (
    <>
      {/* Telefonda arka plan kararır (kapanma yalnızca Esc/X/Uygula ile; modal kuralı) */}
      <div aria-hidden="true" className="fixed inset-0 z-40 animate-fade-in bg-ink/40 md:hidden" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={title}
        className={[
          // Telefon: ALTTAN açılan sheet. Geniş ekran: alanın üstünde, sağa hizalı açılır pencere.
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] animate-sheet-in overflow-y-auto rounded-t-[1.75rem] pb-[env(safe-area-inset-bottom)]',
          'md:absolute md:inset-x-auto md:right-0 md:bottom-full md:mb-3 md:max-h-none md:w-[26rem] md:animate-rise-in md:overflow-visible md:rounded-[1.75rem] md:pb-0',
          'border border-line bg-surface-raised shadow-card',
        ].join(' ')}
      >
        {/* Üst vurgu şeridi */}
        <div
          aria-hidden="true"
          className="h-1.5 rounded-t-[1.75rem] bg-gradient-to-r from-brand-600 to-accent"
        />

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink"
            >
              <Icon className="size-6" />
            </span>
            <p className="min-w-0 flex-1 text-xl font-extrabold tracking-tight">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3.5 text-xs font-bold text-ink-muted transition-colors hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
              ESC
            </button>
          </div>

          {isWeight ? (
            <Segmented
              label="Şekil"
              value={shape}
              options={SHAPES}
              onChange={(v) => setShape(v as Shape)}
            />
          ) : (
            <Segmented
              label="Bölge"
              value={region}
              options={REGIONS}
              onChange={(v) => setRegion(v as DesiRegion)}
            />
          )}

          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))` }}
          >
            {fields.map((f, index) => (
              <label
                key={f.key}
                className="flex min-w-0 flex-col gap-1 rounded-2xl border border-field-border bg-surface px-3.5 py-2.5 transition-colors focus-within:border-brand-600 focus-within:bg-surface-raised"
              >
                <span className="text-xs font-bold text-brand-ink">{f.label} (cm)</span>
                <input
                  ref={index === 0 ? firstRef : undefined}
                  inputMode="decimal"
                  placeholder="0"
                  value={dims[f.key]}
                  onChange={(e) =>
                    setDims((d) => ({ ...d, [f.key]: sanitizeNumeric(e.target.value, 'decimal') }))
                  }
                  className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink-muted"
                />
              </label>
            ))}
          </div>

          {isWeight ? (
            <label className="flex items-center gap-3 rounded-2xl border border-field-border bg-surface px-3.5 py-2.5 transition-colors focus-within:border-brand-600 focus-within:bg-surface-raised">
              <span className="text-xs font-bold text-brand-ink">Yoğunluk</span>
              <input
                inputMode="decimal"
                placeholder="0"
                value={density}
                onChange={(e) => setDensity(sanitizeNumeric(e.target.value, 'decimal'))}
                className="min-w-0 flex-1 bg-transparent text-right text-lg font-semibold text-ink outline-none placeholder:text-ink-muted"
              />
              <span className="text-xs font-semibold text-ink-muted">g/cm³</span>
            </label>
          ) : null}

          <p className="rounded-xl bg-surface-muted px-3.5 py-2 text-center text-sm font-semibold text-ink-muted">
            {formula}
          </p>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-brand-ink uppercase">Sonuç</p>
              <p className="truncate text-2xl font-extrabold" aria-live="polite">
                {resultText}
              </p>
              {isWeight && volume > 0 ? (
                <p className="text-xs text-ink-muted">Hacim: {formatNumber(volume)} cm³</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void copy()}
                disabled={!hasResult}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-field-border bg-surface-raised px-3.5 text-sm font-semibold transition-opacity disabled:opacity-40"
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
                className="min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
