import { useEffect, useState } from 'react';
import type { LifecycleDetail, CompleteReturnInput } from '@gt/shared';
import { ApiError } from '../../../lib/http';
import { Sheet } from '../../../components/ui/Sheet';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { orderLifecycleService as service } from '../services/order.service';
import { formatMoney } from '../../home/components/parts';
import type { ReturnRequest } from '../types';

export function ReturnCompletionSheet({
  request,
  onClose,
  onSaved,
}: {
  request: ReturnRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<LifecycleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [restock, setRestock] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<CompleteReturnInput | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true;
    if (request.orderId)
      void service
        .detail(request.orderId)
        .then((value) => {
          if (active) setDetail(value);
        })
        .catch((e) => {
          if (active) setError(dataError(e));
        });
    return () => {
      active = false;
    };
  }, [request.orderId]);
  const current = detail?.returns.find((r) => r.id === request.id);
  const paid = detail?.payments.some((p) => p.kind === 'collection');
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const input = submitted ?? {
        requestId,
        reference,
        confirmed: true as const,
        restockLineIds: restock,
        expectedAmount: paid ? (current!.amount ?? '0.00') : '0.00',
      };
      setSubmitted(input);
      await service.completeReturn(request.id, input);
      onSaved();
      onClose();
    } catch (e) {
      setError(dataError(e));
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        setSubmitted(null);
        setConfirmed(false);
        if (request.orderId) {
          const fresh = await service.detail(request.orderId).catch(() => null);
          if (fresh) setDetail(fresh);
        }
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open
      title="İadeyi Tamamla"
      size="lg"
      permission="save"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        {submitted && !busy && (
          <Alert>
            Sonuç alınamadı. Aynı bilgilerle tekrar deneyebilirsiniz; iade ve stok hareketi ikinci
            kez yapılmaz.
          </Alert>
        )}
        {!request.orderId ? (
          <Alert>
            Bu eski talebin sipariş satırları bağlı değil. Otomatik stok ve para iadesi yapılamaz.
          </Alert>
        ) : !current ? (
          <p>İade bilgileri yükleniyor…</p>
        ) : (
          <>
            <p className="font-bold">
              Ürün iade tutarı: {formatMoney(Number(current.amount ?? 0))}
            </p>
            <p className="text-sm text-ink-muted">
              {paid
                ? 'Bu işlem banka transferi başlatmaz. Geri ödemeyi yaptıktan sonra referansını girip teyit edin.'
                : 'Bu siparişin tahsilatı yok. Tamamlanınca müşterinin borcu düşer; para iadesi kaydı oluşturulmaz.'}{' '}
              Kargo ücreti bu ürün iadesine dahil değildir.
            </p>
            <fieldset disabled={busy || submitted !== null} className="flex flex-col gap-3">
              <p className="text-sm">
                Yalnızca teslim alınmış ve tekrar satılabilir ürünleri stoğa ekleyin:
              </p>
              {current.items.map((item) => (
                <label
                  key={item.lineId}
                  className="flex items-center gap-2 rounded-xl border border-line p-3"
                >
                  <input
                    type="checkbox"
                    disabled={!item.stockTracked}
                    checked={restock.includes(item.lineId)}
                    onChange={(e) =>
                      setRestock((v) =>
                        e.target.checked
                          ? [...v, item.lineId]
                          : v.filter((id) => id !== item.lineId),
                      )
                    }
                  />
                  {item.name} · {item.quantity} adet ·{' '}
                  {item.stockTracked ? 'Stoğa ekle' : 'Stok takibi kapalı'}
                </label>
              ))}
              <TextField
                label={
                  paid ? 'Geri ödeme dekontu / işlem referansı' : 'Teslim alma / kontrol referansı'
                }
                value={reference}
                maxLength={160}
                onChange={(e) => setReference(e.target.value)}
              />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {paid
                  ? 'Ürünleri teslim aldım, seçilen ürünler satılabilir ve belirtilen para iadesini gerçekte yaptım.'
                  : 'Ürünleri teslim aldım ve stoğa eklemek için seçtiklerimin satılabilir olduğunu kontrol ettim.'}
              </label>
            </fieldset>
            <Button
              loading={busy}
              disabled={!confirmed || reference.trim().length < 3}
              onClick={() => void complete()}
            >
              İadeyi ve Kayıtlarını Tamamla
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
