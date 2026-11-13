import { Check, MapPin, Wallet } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { formatMoney } from '../../home/components/parts';
import { NEXT_STATUS, SOURCE_LABEL, STATUS_LABEL, type Order, type OrderStatus } from '../types';
import { IMG, STATUS_IMAGE } from './OrderTrack';
import { StatusPill, formatDateTime } from './parts';

const FLOW: OrderStatus[] = ['pending', 'preparing', 'shipped', 'delivered'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toLocaleUpperCase('tr');

interface OrderSheetProps {
  order: Order;
  onStatus: (status: OrderStatus) => Promise<void>;
  onClose: () => void;
  operations?: ReactNode;
}

/**
 * Sipariş ayrıntısı, iki parçalı "fiş" düzeni. Solda DURUM KARTI: durumun animasyonlu görseli, dikey
 * zaman çizgisi (geçilenler tikli, şu an nabız atar, gelmeyenler soluk), müşteri ve ödeme. Sağda
 * perforeli bir SİPARİŞ FİŞİ: ürün satırları noktalı çizgiyle fiyata bağlanır, altında ara toplam /
 * KDV / toplam ve köşede eğik bir "ÖDENDİ" ya da "ÖDEME BEKLİYOR" damgası. Altta durum düğmeleri.
 */
export function OrderSheet({ order, onStatus, onClose, operations }: OrderSheetProps) {
  const [busy, setBusy] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATUS[order.status];
  const cancelled = order.status === 'cancelled';
  const done = FLOW.indexOf(order.status);
  const vat = order.totalWithVat - order.total;

  const change = async (status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      await onStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Durum değiştirilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title={`Sipariş #${order.no}`}
      description={`${formatDateTime(order.date)} · ${SOURCE_LABEL[order.source]}`}
    >
      <div className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Durum kartı */}
          <section
            aria-label="Sipariş durumu"
            className="flex min-w-0 flex-col gap-5 rounded-3xl bg-gradient-to-b from-brand-50 to-surface-muted/60 p-4 sm:p-5"
          >
            <div className="flex items-center gap-4">
              <img
                key={order.status}
                src={IMG(STATUS_IMAGE[order.status])}
                alt=""
                className="size-24 shrink-0 animate-pop object-contain"
              />
              <div className="min-w-0">
                <StatusPill status={order.status} />
                <p className="mt-2 text-sm text-ink-muted">
                  {cancelled
                    ? 'Bu sipariş iptal edildi.'
                    : order.status === 'delivered'
                      ? 'Sipariş müşteriye ulaştı.'
                      : 'Sipariş yolculuğuna devam ediyor.'}
                </p>
              </div>
            </div>

            {cancelled ? null : (
              <ol aria-label="Sipariş akışı" className="flex flex-col">
                {FLOW.map((s, i) => {
                  const passed = i < done;
                  const now = i === done;
                  return (
                    <li key={s} className="flex items-stretch gap-3">
                      <span className="flex flex-col items-center">
                        <span
                          className={[
                            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-colors',
                            passed
                              ? 'bg-success text-white'
                              : now
                                ? 'animate-pulse bg-brand-700 text-white ring-4 ring-brand-600/20'
                                : 'bg-surface-raised text-ink-muted ring-1 ring-line',
                          ].join(' ')}
                        >
                          {passed ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                        </span>
                        {i < FLOW.length - 1 ? (
                          <span
                            aria-hidden="true"
                            className={`my-0.5 w-0.5 flex-1 rounded-full ${passed ? 'bg-success' : 'bg-line'}`}
                          />
                        ) : null}
                      </span>
                      <span
                        aria-current={now ? 'step' : undefined}
                        className={`pb-3 text-sm font-bold ${passed || now ? 'text-ink' : 'text-ink-muted/70'}`}
                      >
                        {STATUS_LABEL[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex items-start gap-3 rounded-2xl bg-surface-raised p-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-sm font-extrabold text-white">
                {initials(order.customer)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-extrabold">{order.customer}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {order.address}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Wallet className="size-4 text-ink-muted" aria-hidden="true" />
                  {order.paymentMethod}
                </p>
              </div>
            </div>
          </section>

          {/* Fiş */}
          <section
            aria-label="Sipariş fişi"
            className="relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface p-4 sm:p-5"
          >
            <span
              aria-hidden="true"
              className={[
                'pointer-events-none absolute top-4 right-4 rotate-[-10deg] rounded-lg border-[3px] px-3 py-1 text-sm font-black tracking-widest opacity-80',
                order.paid ? 'border-success text-success' : 'border-brand-700 text-brand-700',
              ].join(' ')}
            >
              {order.paid ? 'ÖDENDİ' : 'ÖDEME BEKLİYOR'}
            </span>
            <p className="text-xs font-extrabold tracking-[0.25em] text-ink-muted">SİPARİŞ FİŞİ</p>
            <p className="text-2xl font-extrabold tracking-tight">#{order.no}</p>

            <ul aria-label="Siparişteki ürünler" className="mt-4 flex flex-col gap-3">
              {order.lines.map((l) => (
                <li key={l.id} className="flex items-end gap-2 text-sm">
                  <span className="min-w-0 max-w-[60%] shrink">
                    <span className="block line-clamp-2 font-bold break-words">
                      <span className="mr-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-extrabold text-brand-ink">
                        {l.qty}×
                      </span>
                      {l.name}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{l.code}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="mb-1.5 min-w-4 flex-1 border-b-2 border-dotted border-line-strong/40"
                  />
                  <b className="shrink-0">{formatMoney(l.lineTotal ?? l.qty * l.unitPrice)}</b>
                </li>
              ))}
            </ul>

            {/* Perforasyon */}
            <div className="relative my-5">
              <span
                aria-hidden="true"
                className="block border-t-2 border-dashed border-line-strong/40"
              />
              <span
                aria-hidden="true"
                className="absolute -top-3 -left-7 size-6 sm:-left-8 rounded-full bg-surface-raised"
              />
              <span
                aria-hidden="true"
                className="absolute -top-3 -right-7 size-6 sm:-right-8 rounded-full bg-surface-raised"
              />
            </div>

            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Ara toplam</dt>
                <dd>{formatMoney(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">KDV</dt>
                <dd>{formatMoney(vat)}</dd>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-2xl bg-brand-700 px-4 py-3 text-white">
                <dt className="font-bold">Toplam</dt>
                <dd className="text-xl font-extrabold">{formatMoney(order.totalWithVat)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {operations}
        {next || (order.status !== 'cancelled' && order.status !== 'delivered') ? (
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
