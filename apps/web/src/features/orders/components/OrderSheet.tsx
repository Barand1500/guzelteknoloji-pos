import { Check, MapPin, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { formatMoney } from '../../home/components/parts';
import { NEXT_STATUS, SOURCE_LABEL, STATUS_LABEL, type Order, type OrderStatus } from '../types';
import { StatusPill, formatDateTime } from './parts';

const FLOW: OrderStatus[] = ['pending', 'preparing', 'shipped', 'delivered'];

interface OrderSheetProps {
  order: Order;
  onStatus: (status: OrderStatus) => Promise<void>;
  onClose: () => void;
}

/**
 * Sipariş ayrıntısı: üstte akış çubuğu (Bekliyor → Hazırlanıyor → Kargoda → Teslim), altında müşteri,
 * ürünler ve tutarlar. "Sıradaki adıma geç" siparişi bir adım ilerletir; iptal onay ister.
 */
export function OrderSheet({ order, onStatus, onClose }: OrderSheetProps) {
  const [busy, setBusy] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  const next = NEXT_STATUS[order.status];
  const done = FLOW.indexOf(order.status);
  const vat = order.totalWithVat - order.total;

  const change = async (status: OrderStatus) => {
    setBusy(true);
    try {
      await onStatus(status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`Sipariş #${order.no}`}
      description={`${formatDateTime(order.date)} · ${SOURCE_LABEL[order.source]}`}
    >
      <div className="flex flex-col gap-5">
        {order.status === 'cancelled' ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-danger-soft px-4 py-3">
            <StatusPill status="cancelled" />
            <span className="text-sm text-danger">Bu sipariş iptal edildi.</span>
          </div>
        ) : (
          <ol aria-label="Sipariş akışı" className="grid grid-cols-4 gap-2">
            {FLOW.map((s, i) => {
              const reached = i <= done;
              return (
                <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={[
                      'flex size-9 items-center justify-center rounded-full text-sm font-extrabold transition-colors',
                      reached ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted',
                    ].join(' ')}
                  >
                    {i < done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                  </span>
                  <span
                    aria-current={i === done ? 'step' : undefined}
                    className={`text-xs font-bold ${reached ? 'text-ink' : 'text-ink-muted'}`}
                  >
                    {STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted/70 p-4">
            <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">
              Müşteri
            </p>
            <p className="mt-1 font-bold">{order.customer}</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-ink-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {order.address}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-muted/70 p-4">
            <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Ödeme</p>
            <p className="mt-1 flex items-center gap-2 font-bold">
              <Wallet className="size-4 text-ink-muted" aria-hidden="true" />
              {order.paymentMethod}
            </p>
            <p
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${order.paid ? 'bg-success-soft text-success' : 'bg-accent-soft text-brand-800'}`}
            >
              {order.paid ? 'Ödendi' : 'Ödeme bekleniyor'}
            </p>
          </div>
        </div>

        <ul aria-label="Siparişteki ürünler" className="flex flex-col gap-2">
          {order.lines.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-ink">
                {l.qty}×
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{l.name}</span>
                <span className="block truncate text-xs text-ink-muted">{l.code}</span>
              </span>
              <b className="shrink-0 text-sm">{formatMoney(l.qty * l.unitPrice)}</b>
            </li>
          ))}
        </ul>

        <dl className="ml-auto grid w-full max-w-xs gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Ara toplam</dt>
            <dd>{formatMoney(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">KDV</dt>
            <dd>{formatMoney(vat)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
            <dt>Toplam</dt>
            <dd>{formatMoney(order.totalWithVat)}</dd>
          </div>
        </dl>

        {next || order.status !== 'cancelled' ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row-reverse">
            {next ? (
              <Button
                flow={false}
                loading={busy}
                loadingLabel="Güncelleniyor…"
                onClick={() => void change(next)}
              >
                Sıradaki adıma geç: {STATUS_LABEL[next]}
              </Button>
            ) : null}
            {order.status !== 'cancelled' && order.status !== 'delivered' ? (
              <Button
                variant="outline"
                flow={false}
                disabled={busy}
                onClick={() => setCancelAsk(true)}
              >
                Siparişi İptal Et
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmSheet
        open={cancelAsk}
        danger
        title="Sipariş İptal Edilsin Mi?"
        description={`#${order.no} numaralı sipariş iptal edilecek.`}
        confirmLabel="İptal Et"
        cancelLabel="Vazgeç"
        onConfirm={() => {
          setCancelAsk(false);
          void change('cancelled');
        }}
        onClose={() => setCancelAsk(false)}
      />
    </Sheet>
  );
}
