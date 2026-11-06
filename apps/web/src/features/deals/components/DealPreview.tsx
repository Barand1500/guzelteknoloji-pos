import { Package } from 'lucide-react';
import type { Deal, DealPosition, DealSize } from '../types';
import { DealBadge } from './DealBadge';

/** Boyut = ürün resminin genişliğinin yüzdesi (resim büyüyünce rozet de orantılı büyür). */
export const SIZE_PERCENT: Record<DealSize, number> = { small: 24, medium: 34, large: 46 };

export const POSITION_STYLE: Record<DealPosition, string> = {
  tl: 'top-[5%] left-[5%]',
  tc: 'top-[5%] left-1/2 -translate-x-1/2',
  tr: 'top-[5%] right-[5%]',
  bl: 'bottom-[5%] left-[5%]',
  bc: 'bottom-[5%] left-1/2 -translate-x-1/2',
  br: 'bottom-[5%] right-[5%]',
};

type Look = Pick<Deal, 'iconUrl' | 'showOnImage' | 'position' | 'size'>;

interface DealPreviewProps {
  look: Look;
  /** Konum ve boyut (kare; "relative" ya da "absolute" dahil). */
  className: string;
  /** İkon henüz yüklenmediyse rozetin yerinde noktalı bir yer tutucu çizer (yalnızca formda). */
  placeholder?: boolean;
  /** Rozetin etrafına seçili çerçevesi çizer (yer seçicide). */
  highlight?: boolean;
}

/**
 * Örnek ürün resmi ve rozetin GERÇEK yeri ve boyutu. Listede ve formdaki canlı önizlemede aynı
 * bileşen kullanılır; böylece ne ayarlandıysa ürünün üstünde tam öyle görünür.
 */
export function DealPreview({
  look,
  className,
  placeholder = false,
  highlight = false,
}: DealPreviewProps) {
  const showBadge = look.showOnImage && (look.iconUrl || placeholder);
  return (
    <div
      className={`overflow-hidden bg-gradient-to-br from-surface-muted to-surface ring-1 ring-line ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center text-ink-muted/60">
        <Package className="size-1/3" />
      </span>
      {showBadge ? (
        <span
          className={[
            'absolute aspect-square transition-all duration-300',
            POSITION_STYLE[look.position],
            highlight ? 'rounded-xl outline-2 outline-offset-2 outline-brand-600' : '',
          ].join(' ')}
          style={{ width: `${SIZE_PERCENT[look.size]}%` }}
        >
          {look.iconUrl ? (
            <DealBadge url={look.iconUrl} className="size-full" />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full border-2 border-dashed border-ink-muted/60 text-[0.625rem] font-bold text-ink-muted">
              İkon
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}
