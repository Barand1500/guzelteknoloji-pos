import { ArrowRight, Check, X } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import { NEXT_STATUS, STATUS_LABEL } from '../types';

export const IMG = (name: string) => `${import.meta.env.BASE_URL}orders/${name}.webp`;

/** Durumun animasyonlu görseli (public/orders). */
export const STATUS_IMAGE: Record<OrderStatus, string> = {
  pending: 'bekliyor',
  preparing: 'hazirlaniyor',
  shipped: 'kargoda',
  delivered: 'teslim',
  cancelled: 'iptal',
};

const STAGES: { status: OrderStatus; image: string; hint: string }[] = [
  { status: 'pending', image: 'bekliyor', hint: 'Sipariş alındı' },
  { status: 'preparing', image: 'hazirlaniyor', hint: 'Koli hazırlanıyor' },
  { status: 'shipped', image: 'kargoda', hint: 'Kargo yolda' },
  { status: 'delivered', image: 'teslim', hint: 'Müşteriye ulaştı' },
];

interface OrderTrackProps {
  order: Order;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
  onDetails: () => void;
}

/**
 * Sipariş akışı (seçili satırın altında açılır): Bekliyor → Hazırlanıyor → Kargoda → Teslim Edildi.
 * Her adımın görseli animasyonludur (bekleyen kum saati, paketlenen koli, yoldaki kamyon, konfeti).
 * Geçilen adımlar tikli ve renkli, şu anki adım büyük ve halkalı, henüz gelmeyenler SOLUK (pasif).
 * Adımların arasında oklar vardır; geçilen okların rengi dolar. İptalde son adımın yerine kırmızı
 * "İptal Edildi" (çöp kutusu) kartı gelir ve diğer adımlar pasif kalır.
 */
export function OrderTrack({ order, busy, onStatus, onDetails }: OrderTrackProps) {
  const cancelled = order.status === 'cancelled';
  const index = cancelled ? -1 : STAGES.findIndex((s) => s.status === order.status);
  const next = NEXT_STATUS[order.status];

  return (
    <div className="flex animate-rise-in flex-col gap-4">
      <ol aria-label="Sipariş akışı" className="flex items-stretch gap-1 sm:gap-3">
        {STAGES.map((s, i) => {
          const isLast = i === STAGES.length - 1;
          // İptalde son adımın yerine iptal kartı gelir.
          const showCancel = cancelled && isLast;
          const done = !cancelled && i < index;
          const current = !cancelled && i === index;
          const linkDone = !cancelled && i < index;
          return (
            <li key={s.status} className="flex min-w-0 flex-1 items-stretch gap-1 sm:gap-3">
              <div
                aria-current={current || showCancel ? 'step' : undefined}
                className={[
                  'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl border px-1.5 py-3 text-center transition-all duration-500 sm:gap-1.5 sm:px-3',
                  showCancel
                    ? 'border-danger bg-danger-soft ring-4 ring-danger/15'
                    : current
                      ? 'scale-[1.04] border-brand-600 bg-brand-50 shadow-soft ring-4 ring-brand-600/15'
                      : done
                        ? 'border-success/40 bg-success-soft/60'
                        : 'border-dashed border-line bg-surface-muted/40',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute -top-2.5 left-2 flex size-6 items-center justify-center rounded-full text-xs font-extrabold',
                    showCancel
                      ? 'bg-danger text-white'
                      : done
                        ? 'bg-success text-white'
                        : current
                          ? 'bg-brand-700 text-white'
                          : 'bg-surface-muted text-ink-muted',
                  ].join(' ')}
                >
                  {showCancel ? (
                    <X className="size-3.5" aria-hidden="true" />
                  ) : done ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </span>
                <img
                  src={IMG(showCancel ? 'iptal' : s.image)}
                  alt=""
                  loading="lazy"
                  className={[
                    'size-11 object-contain transition-all duration-500 sm:size-16',
                    current || showCancel ? '' : done ? 'saturate-75' : 'opacity-40 grayscale',
                  ].join(' ')}
                />
                <span
                  className={[
                    'w-full truncate text-xs leading-tight font-extrabold sm:text-sm',
                    current || showCancel || done ? 'text-ink' : 'text-ink-muted',
                  ].join(' ')}
                >
                  {showCancel ? STATUS_LABEL.cancelled : STATUS_LABEL[s.status]}
                </span>
                <span className="hidden w-full truncate text-xs text-ink-muted sm:block">
                  {showCancel ? 'Koli çöpe gitti' : s.hint}
                </span>
                <span className="sr-only">
                  {showCancel
                    ? 'Geçerli adım'
                    : current
                      ? 'Geçerli adım'
                      : done
                        ? 'Tamamlandı'
                        : 'Bekliyor'}
                </span>
              </div>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`flex shrink-0 items-center transition-colors duration-500 ${linkDone ? 'text-success' : 'text-line-strong/50'}`}
                >
                  <ArrowRight className="size-4 sm:size-6" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-semibold text-ink-muted">
          {cancelled ? 'Bu sipariş iptal edildi.' : `Şu an: ${STATUS_LABEL[order.status]}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {next ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(next)}
              className="inline-flex min-h-10 items-center rounded-full bg-brand-700 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              Sıradaki adım: {STATUS_LABEL[next]}
            </button>
          ) : null}
          {!cancelled && order.status !== 'delivered' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus('cancelled')}
              className="inline-flex min-h-10 items-center rounded-full bg-danger-soft px-5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-60"
            >
              İptal Et
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex min-h-10 items-center rounded-full border border-field-border px-5 text-sm font-bold text-ink transition-colors hover:border-brand-500"
          >
            Ayrıntılar
          </button>
        </div>
      </div>
    </div>
  );
}
