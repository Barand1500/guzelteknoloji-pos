import type { Order, OrderStatus } from '../types';
import { NEXT_STATUS, STATUS_LABEL } from '../types';
import { IMG, JourneyBar, type JourneyStep } from './JourneyBar';

export { IMG };

/** Durumun animasyonlu görseli (public/orders). */
export const STATUS_IMAGE: Record<OrderStatus, string> = {
  pending: 'bekliyor',
  preparing: 'hazirlaniyor',
  shipped: 'kargoda',
  delivered: 'teslim',
  cancelled: 'iptal',
};

const STEPS: (JourneyStep & { status: OrderStatus })[] = [
  {
    id: 'pending',
    status: 'pending',
    label: 'Bekliyor',
    short: 'Bekliyor',
    hint: 'Sipariş alındı',
    image: 'bekliyor',
  },
  {
    id: 'preparing',
    status: 'preparing',
    label: 'Hazırlanıyor',
    short: 'Hazırlık',
    hint: 'Koli hazırlanıyor',
    image: 'hazirlaniyor',
  },
  {
    id: 'shipped',
    status: 'shipped',
    label: 'Kargoda',
    short: 'Kargoda',
    hint: 'Kargo yolda',
    image: 'kargoda',
  },
  {
    id: 'delivered',
    status: 'delivered',
    label: 'Teslim Edildi',
    short: 'Teslim',
    hint: 'Müşteriye ulaştı',
    image: 'teslim',
  },
];

interface OrderTrackProps {
  order: Order;
  busy: boolean;
  onStatus: (status: OrderStatus) => void;
  /** true (web): işlem düğmeleri şeridin üzerinde (ok ve ✕); false (telefon): altta metin düğmeleri. */
  inline?: boolean;
}

/**
 * Sipariş yolculuk şeridi: Bekliyor → Hazırlanıyor → Kargoda → Teslim (bkz. JourneyBar). İptalde son
 * adım kırmızı çöp kutusu kartına döner ve öncekiler pasifleşir. Altta durumu ilerleten düğmeler.
 */
export function OrderTrack({ order, busy, onStatus, inline = false }: OrderTrackProps) {
  const cancelled = order.status === 'cancelled';
  const index = cancelled ? -1 : STEPS.findIndex((s) => s.status === order.status);
  const next = NEXT_STATUS[order.status];

  return (
    <div className="flex flex-col gap-3">
      <JourneyBar
        ariaLabel="Sipariş akışı"
        steps={STEPS}
        done={cancelled ? 0 : index}
        current={cancelled ? null : index}
        failedAt={cancelled ? STEPS.length - 1 : undefined}
        failure={{
          label: STATUS_LABEL.cancelled,
          short: 'İptal',
          hint: 'Koli çöpe gitti',
          image: 'iptal',
        }}
        advance={
          inline && next
            ? {
                label: `Sıradaki adım: ${STATUS_LABEL[next]}`,
                text: 'İlerlet',
                onClick: () => onStatus(next),
                disabled: busy,
              }
            : undefined
        }
        dismiss={
          inline && !cancelled && order.status !== 'delivered'
            ? { label: 'İptal Et', onClick: () => onStatus('cancelled'), disabled: busy }
            : undefined
        }
      />

      <p className="sr-only" aria-live="polite">
        {cancelled ? 'Bu sipariş iptal edildi.' : `Şu an: ${STATUS_LABEL[order.status]}`}
      </p>
      {!inline && (next || (!cancelled && order.status !== 'delivered')) ? (
        <div className="flex flex-wrap justify-end gap-2">
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
        </div>
      ) : null}
    </div>
  );
}
