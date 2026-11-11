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

const STAGES: { status: OrderStatus; short: string; hint: string }[] = [
  { status: 'pending', short: 'Bekliyor', hint: 'Sipariş alındı' },
  { status: 'preparing', short: 'Hazırlık', hint: 'Koli hazırlanıyor' },
  { status: 'shipped', short: 'Kargoda', hint: 'Kargo yolda' },
  { status: 'delivered', short: 'Teslim', hint: 'Müşteriye ulaştı' },
];

interface OrderTrackProps {
  order: Order;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
  onDetails: () => void;
}

/**
 * Sipariş yolculuk şeridi: Bekliyor → Hazırlanıyor → Kargoda → Teslim. Dört yuvarlak "baloncuk"
 * (içinde animasyonlu görsel) oklu çizgilerle bağlanır. Geçilen baloncuklar yeşil çerçeveli ve tikli,
 * çizgileri yeşile dolar; şu anki baloncuk büyük ve halkalı; henüz gelmeyenler soluk/gri (pasif).
 * İptalde son baloncuk kırmızı çöp kutusuna döner ve öncekiler pasifleşir. Telefonda kısa etiketler
 * ve küçük baloncuklar kullanılır; şerit hiçbir genişlikte taşmaz.
 */
export function OrderTrack({ order, busy, onStatus, onDetails }: OrderTrackProps) {
  const cancelled = order.status === 'cancelled';
  const index = cancelled ? -1 : STAGES.findIndex((s) => s.status === order.status);
  const next = NEXT_STATUS[order.status];

  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Sipariş akışı" className="flex max-w-2xl items-start">
        {STAGES.map((s, i) => {
          const isLast = i === STAGES.length - 1;
          const showCancel = cancelled && isLast;
          const done = !cancelled && i < index;
          const current = !cancelled && i === index;
          const lineDone = !cancelled && i < index;
          const full = showCancel ? STATUS_LABEL.cancelled : STATUS_LABEL[s.status];
          return (
            <li key={s.status} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 sm:w-28">
                <span
                  aria-current={current || showCancel ? 'step' : undefined}
                  className={[
                    'relative flex size-12 items-center justify-center rounded-full ring-2 transition-all duration-500 sm:size-16',
                    showCancel
                      ? 'scale-110 bg-danger-soft ring-danger ring-offset-2 ring-offset-surface-raised'
                      : current
                        ? 'scale-110 bg-brand-50 ring-brand-600 ring-offset-2 ring-offset-surface-raised'
                        : done
                          ? 'bg-success-soft ring-success/50'
                          : 'bg-surface-muted ring-line',
                  ].join(' ')}
                >
                  <img
                    src={IMG(showCancel ? 'iptal' : STATUS_IMAGE[s.status])}
                    alt=""
                    loading="lazy"
                    className={[
                      'size-8 object-contain transition-all duration-500 sm:size-11',
                      current || showCancel || done ? '' : 'opacity-40 grayscale',
                    ].join(' ')}
                  />
                  {done || showCancel ? (
                    <span
                      className={`absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-white ${showCancel ? 'bg-danger' : 'bg-success'}`}
                    >
                      {showCancel ? (
                        <X className="size-3" aria-hidden="true" />
                      ) : (
                        <Check className="size-3" aria-hidden="true" />
                      )}
                    </span>
                  ) : null}
                </span>
                <span
                  className={[
                    'text-center text-[0.6875rem] leading-tight font-extrabold sm:text-sm',
                    current || showCancel || done ? 'text-ink' : 'text-ink-muted',
                  ].join(' ')}
                >
                  <span className="sm:hidden" aria-hidden="true">
                    {showCancel ? 'İptal' : s.short}
                  </span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    {full}
                  </span>
                  <span className="sr-only">{full}</span>
                </span>
                <span className="sr-only">
                  {showCancel || current ? 'Geçerli adım' : done ? 'Tamamlandı' : 'Bekliyor'}
                </span>
                <span className="hidden text-center text-xs text-ink-muted sm:block">
                  {showCancel ? 'Koli çöpe gitti' : s.hint}
                </span>
              </div>

              {/* Oklu bağlantı çizgisi */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="mt-[1.4rem] flex min-w-3 flex-1 items-center sm:mt-[1.85rem]"
                >
                  <span
                    className={`h-1 flex-1 rounded-full transition-colors duration-700 ${lineDone ? 'bg-success' : 'bg-line'}`}
                  />
                  <ArrowRight
                    className={`-mx-1 size-4 shrink-0 transition-colors duration-700 sm:size-5 ${lineDone ? 'text-success' : 'text-line-strong/50'}`}
                  />
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
              className="inline-flex min-h-10 items-center rounded-full bg-brand-700 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              Sıradaki adım: {STATUS_LABEL[next]}
            </button>
          ) : null}
          {!cancelled && order.status !== 'delivered' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus('cancelled')}
              className="inline-flex min-h-10 items-center rounded-full bg-danger-soft px-4 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-60"
            >
              İptal Et
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex min-h-10 items-center rounded-full border border-field-border px-4 text-sm font-bold text-ink transition-colors hover:border-brand-500"
          >
            Ayrıntılar
          </button>
        </div>
      </div>
    </div>
  );
}
