import { Package } from 'lucide-react';
import type { Deal, DealPosition, DealSize } from '../types';
import { DealBadge } from './DealBadge';

/** Boyut = ürün resminin genişliğinin yüzdesi (resim büyüyünce rozet de orantılı büyür). */
const SIZE_PERCENT: Record<DealSize, number> = { small: 24, medium: 34, large: 46 };

const POSITION_STYLE: Record<DealPosition, string> = {
  tl: 'top-[5%] left-[5%]',
  tc: 'top-[5%] left-1/2 -translate-x-1/2',
  tr: 'top-[5%] right-[5%]',
  bl: 'bottom-[5%] left-[5%]',
  bc: 'bottom-[5%] left-1/2 -translate-x-1/2',
  br: 'bottom-[5%] right-[5%]',
};

type Look = Pick<Deal, 'icon' | 'badgeText' | 'showOnImage' | 'position' | 'size'>;

/**
 * Örnek ürün resmi ve rozetin GERÇEK yeri ve boyutu. Listede ve formdaki canlı önizlemede aynı
 * bileşen kullanılır; böylece ne ayarlandıysa ürünün üstünde tam öyle görünür.
 * Konum ve boyut className ile verilir (kare; "relative" ya da "absolute" dahil).
 */
export function DealPreview({ look, className }: { look: Look; className: string }) {
  return (
    <div
      className={`overflow-hidden bg-gradient-to-br from-surface-muted to-surface ring-1 ring-line ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 flex items-center justify-center text-ink-muted/60">
        <Package className="size-1/3" />
      </span>
      {look.showOnImage ? (
        <span
          className={`absolute aspect-square ${POSITION_STYLE[look.position]}`}
          style={{ width: `${SIZE_PERCENT[look.size]}%` }}
        >
          <DealBadge icon={look.icon} text={look.badgeText} className="size-full" />
        </span>
      ) : null}
    </div>
  );
}
