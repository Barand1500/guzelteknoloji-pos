import { Segmented } from '../../../components/ui/Segmented';
import { POSITIONS, SIZES, type DealDraft, type DealPosition, type DealSize } from '../types';
import { DealPreview } from './DealPreview';

const ZONE_STYLE: Record<DealPosition, string> = {
  tl: 'top-1.5 left-1.5',
  tc: 'top-1.5 left-1/2 -translate-x-1/2',
  tr: 'top-1.5 right-1.5',
  bl: 'bottom-1.5 left-1.5',
  bc: 'bottom-1.5 left-1/2 -translate-x-1/2',
  br: 'bottom-1.5 right-1.5',
};

interface DealPlacePickerProps {
  look: Pick<DealDraft, 'icon' | 'badgeText' | 'showOnImage' | 'position' | 'size'>;
  onPosition: (position: DealPosition) => void;
  onSize: (size: DealSize) => void;
}

/**
 * Rozetin ürün resmindeki yerini ve boyutunu seçtirir. Seçim kutusu YOK: örnek ürün resminin
 * köşelerindeki 6 noktadan birine dokunulur, rozet o anda orada belirir (canlı önizleme).
 * Boyut: Küçük / Orta / Büyük.
 */
export function DealPlacePicker({ look, onPosition, onSize }: DealPlacePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto aspect-square w-44 sm:mx-0">
        <DealPreview look={look} className="absolute inset-0 rounded-3xl" />
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
                title={p.label}
                onClick={() => onPosition(p.value)}
                className={[
                  'absolute size-[3.25rem] rounded-2xl border-2 transition-all duration-200',
                  ZONE_STYLE[p.value],
                  on
                    ? 'border-brand-600 shadow-soft'
                    : 'border-dashed border-ink-muted/50 hover:border-brand-500 hover:bg-brand-50/40',
                ].join(' ')}
              />
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Rozetin Boyutu</p>
        <Segmented
          label="Rozet boyutu"
          value={look.size}
          options={SIZES}
          onChange={(v) => onSize(v as DealSize)}
        />
        <p className="text-sm text-ink-muted">
          Resmin köşelerinden birine dokunarak rozetin yerini seçin. Önizleme ürünün üstünde tam
          böyle görünür.
        </p>
      </div>
    </div>
  );
}
