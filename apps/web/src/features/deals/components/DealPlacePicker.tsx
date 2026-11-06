import {
  positionLabel,
  POSITIONS,
  SIZES,
  sizeLabel,
  type DealDraft,
  type DealPosition,
  type DealSize,
} from '../types';
import { DealPreview } from './DealPreview';

/** Dokunma alanı 3,5 rem (rahat basılsın); görünen nokta küçüktür. */
const ZONE_STYLE: Record<DealPosition, string> = {
  tl: 'top-1 left-1',
  tc: 'top-1 left-1/2 -translate-x-1/2',
  tr: 'top-1 right-1',
  bl: 'bottom-1 left-1',
  bc: 'bottom-1 left-1/2 -translate-x-1/2',
  br: 'bottom-1 right-1',
};

/** Boyut düğmelerindeki daire, rozetin göreli büyüklüğünü anlatır. */
const SIZE_GLYPH: Record<DealSize, string> = {
  small: 'size-3.5',
  medium: 'size-5',
  large: 'size-7',
};

interface DealPlacePickerProps {
  look: Pick<DealDraft, 'iconUrl' | 'showOnImage' | 'position' | 'size'>;
  onPosition: (position: DealPosition) => void;
  onSize: (size: DealSize) => void;
}

/**
 * Rozetin ürün resmindeki yerini ve boyutunu seçtirir. Seçim kutusu YOK: örnek ürün resminin
 * üzerindeki 6 noktadan birine dokunulur, rozet o anda orada belirir (canlı önizleme). Boyut için
 * üç büyüklük düğmesi vardır. Seçilen yer ve boyut yazıyla da özetlenir.
 */
export function DealPlacePicker({ look, onPosition, onSize }: DealPlacePickerProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto aspect-square w-full max-w-56 sm:mx-0">
        <DealPreview
          look={look}
          placeholder
          highlight
          className="absolute inset-0 rounded-3xl shadow-soft"
        />
        <div role="radiogroup" aria-label="Rozetin yeri" className="absolute inset-0">
          {POSITIONS.map((p) => {
            const on = look.position === p.value;
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={p.label}
                onClick={() => onPosition(p.value)}
                className={`group absolute flex size-14 items-center justify-center ${ZONE_STYLE[p.value]}`}
              >
                {on ? null : (
                  <span className="size-3 rounded-full bg-ink-muted/45 ring-4 ring-surface/70 transition-all duration-200 group-hover:size-5 group-hover:bg-brand-600 group-focus-visible:size-5 group-focus-visible:bg-brand-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand-ink">
            {positionLabel(look.position)}
          </span>
          <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand-ink">
            {sizeLabel(look.size)} Boy
          </span>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Boyut</p>
          <div role="radiogroup" aria-label="Rozet boyutu" className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => {
              const on = look.size === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSize(s.value)}
                  className={[
                    'flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition-all duration-200',
                    on
                      ? 'border-brand-600 bg-brand-50 text-brand-ink shadow-soft'
                      : 'border-line bg-surface text-ink-muted hover:border-brand-500',
                  ].join(' ')}
                >
                  <span className="flex size-8 items-center justify-center">
                    <span
                      className={`${SIZE_GLYPH[s.value]} rounded-full ${on ? 'bg-brand-600' : 'bg-ink-muted/50'} transition-colors`}
                    />
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-sm text-ink-muted">
          Resmin üzerindeki noktalardan birine dokunarak yeri seçin. Önizleme, ürünün üstünde tam
          böyle görünür.
        </p>
      </div>
    </div>
  );
}
