import { useEffect, useState } from 'react';
import type { LifecycleDetail, RecordPaymentInput, CreateReturnInput } from '@gt/shared';
import { ApiError } from '../../../lib/http';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { formatMoney } from '../../home/components/parts';
import { orderLifecycleService as service } from '../services/order.service';
import type { Order } from '../types';

export function OrderOperations({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const [detail, setDetail] = useState<LifecycleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [paymentId, setPaymentId] = useState(() => crypto.randomUUID());
  const [returnId, setReturnId] = useState(() => crypto.randomUUID());
  const [retry, setRetry] = useState(0);
  const [paymentAttempt, setPaymentAttempt] = useState<RecordPaymentInput | null>(null);
  const [returnAttempt, setReturnAttempt] = useState<CreateReturnInput | null>(null);
  const locked = busy || paymentAttempt !== null || returnAttempt !== null;
  useEffect(() => {
    let active = true;
    void service
      .detail(order.id)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((e) => {
        if (active) setError(dataError(e));
      });
    return () => {
      active = false;
    };
  }, [order.id, retry, order.paid]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      onRefresh();
      setRetry((v) => v + 1);
    } catch (e) {
      setError(dataError(e));
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        setPaymentAttempt(null);
        setReturnAttempt(null);
        setConfirmed(false);
        onRefresh();
        setRetry((v) => v + 1);
      }
    } finally {
      setBusy(false);
    }
  };
  const returned =
    detail?.returns
      .filter((r) => r.status === 'completed')
      .reduce((n, r) => n + Number(r.amount ?? 0), 0) ?? 0;
  const open = detail?.returns.some((r) => !['completed', 'rejected'].includes(r.status));
  return (
    <section
      aria-label="Tahsilat ve iade işlemleri"
      className="flex flex-col gap-4 rounded-3xl border border-line p-4"
    >
      <h3 className="font-bold">Tahsilat ve İade</h3>
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert>{notice}</Alert>}
      {!busy && (paymentAttempt || returnAttempt) && (
        <Alert>
          Sonuç alınamadı. Aynı düğmeyle değişmeden tekrar denendiğinde ikinci kayıt oluşturulmaz.
        </Alert>
      )}
      {!detail ? (
        <p>İşlemler yükleniyor…</p>
      ) : !detail.managed ? (
        <p className="text-sm text-ink-muted">
          Eski siparişin ödeme ve stok geçmişi bağlı değil; otomatik finansal işlem yapılamaz.
        </p>
      ) : (
        <>
          {!order.paid && order.status !== 'cancelled' && order.totalWithVat > returned && (
            <div className="flex flex-col gap-3">
              <p>
                Tahsil edilecek: <b>{formatMoney(order.totalWithVat - returned)}</b>
              </p>
              <p className="text-sm text-ink-muted">
                Bu işlem bankadan para çekmez; alınmış havale, nakit veya kapıda ödemeyi kaydeder.
              </p>
              <TextField
                label="Dekont / işlem referansı"
                value={reference}
                maxLength={160}
                disabled={locked}
                onChange={(e) => setReference(e.target.value)}
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={locked}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Tahsilatı gerçekte aldım ve tutarını kontrol ettim.
              </label>
              <Button
                disabled={
                  busy ||
                  !!returnAttempt ||
                  (!!open && !paymentAttempt) ||
                  !confirmed ||
                  reference.trim().length < 3
                }
                loading={busy}
                onClick={() =>
                  void run(async () => {
                    const input = paymentAttempt ?? {
                      requestId: paymentId,
                      reference,
                      confirmed: true as const,
                      expectedAmount: (order.totalWithVat - returned).toFixed(2),
                    };
                    setPaymentAttempt(input);
                    await service.collect(order.id, input);
                    setPaymentAttempt(null);
                    setPaymentId(crypto.randomUUID());
                    setReference('');
                    setConfirmed(false);
                  }, 'Tahsilat kaydedildi.')
                }
              >
                Tahsilatı Kaydet
              </Button>
            </div>
          )}
          {order.status !== 'cancelled' && !open && (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <h4 className="font-bold">Ürün Bazlı İade Talebi</h4>
              {order.lines.map((line) => {
                const already = detail.returns
                  .filter((r) => r.status === 'completed')
                  .flatMap((r) => r.items)
                  .filter((i) => i.lineId === line.id)
                  .reduce((n, i) => n + Number(i.quantity), 0);
                const remaining = Math.max(0, line.qty - already);
                return remaining > 0 ? (
                  <TextField
                    key={line.id}
                    label={`${line.name} (kalan ${remaining})`}
                    numeric="decimal"
                    value={quantities[line.id] ?? ''}
                    disabled={locked}
                    onChange={(e) => setQuantities((v) => ({ ...v, [line.id]: e.target.value }))}
                  />
                ) : null;
              })}
              <TextField
                label="İade Sebebi"
                value={reason}
                maxLength={500}
                disabled={locked}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={
                  busy ||
                  !!paymentAttempt ||
                  !reason.trim() ||
                  !Object.values(quantities).some((q) => Number(q.replace(',', '.')) > 0)
                }
                onClick={() =>
                  void run(async () => {
                    const input = returnAttempt ?? {
                      requestId: returnId,
                      reason,
                      items: Object.entries(quantities)
                        .filter(([, q]) => Number(q.replace(',', '.')) > 0)
                        .map(([lineId, q]) => ({ lineId, quantity: Number(q.replace(',', '.')) })),
                    };
                    setReturnAttempt(input);
                    await service.requestReturn(order.id, input);
                    setReturnAttempt(null);
                    setReturnId(crypto.randomUUID());
                    setReason('');
                    setQuantities({});
                  }, 'İade talebi oluşturuldu. İade/Değişim ekranından onaylayıp tamamlayabilirsiniz.')
                }
              >
                İade Talebi Oluştur
              </Button>
            </div>
          )}
          {open && (
            <p className="text-sm text-ink-muted">
              Açık iade talebi var. İade/Değişim ekranından sonuçlandırın.
            </p>
          )}
          {detail.payments.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {detail.payments.map((p) => (
                <li key={p.id}>
                  {p.kind === 'refund' ? 'İade ödemesi' : 'Tahsilat'} ·{' '}
                  {formatMoney(Number(p.amount))} · {p.reference}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
