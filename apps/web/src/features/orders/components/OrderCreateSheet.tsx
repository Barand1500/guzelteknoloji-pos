import { useEffect, useRef, useState } from 'react';
import {
  createOrderSchema,
  type CampaignCartQuote,
  type CreateOrderInput,
  type OrderChoices,
} from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { ApiError } from '../../../lib/http';
import { dataError } from '../../../lib/catalog-data';
import { orderLifecycleService as service } from '../services/order.service';
import { formatMoney } from '../../home/components/parts';

export function OrderCreateSheet({
  scope,
  onClose,
  onSaved,
}: {
  scope: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const storageKey = `gt-order-pending:${scope}`;
  const [choices, setChoices] = useState<OrderChoices | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [priceListId, setPriceListId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentKind, setPaymentKind] = useState('bank_transfer');
  const [shipping, setShipping] = useState('0');
  const [shippingVat, setShippingVat] = useState('20');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([]);
  const [quote, setQuote] = useState<CampaignCartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<CreateOrderInput | null>(null);
  const [requestId] = useState(() => sessionStorage.getItem(storageKey) ?? crypto.randomUUID());
  const [recovering, setRecovering] = useState(() => sessionStorage.getItem(storageKey) !== null);
  const active = useRef(true);
  const revision = useRef(0);
  const locked = busy || submitted !== null || recovering;
  const callbacks = useRef({ onSaved, onClose });
  callbacks.current = { onSaved, onClose };
  useEffect(() => {
    active.current = true;
    if (sessionStorage.getItem(storageKey)) {
      void service
        .lookup(requestId)
        .then((existing) => {
          if (!active.current) return;
          if (existing) {
            sessionStorage.removeItem(storageKey);
            callbacks.current.onSaved();
            callbacks.current.onClose();
          } else setRecovering(false);
        })
        .catch((e) => {
          if (active.current) {
            setError(dataError(e));
            setRecovering(false);
          }
        });
    }
    void service
      .choices()
      .then((data) => {
        if (active.current) setChoices(data);
      })
      .catch((e) => {
        if (active.current) setError(dataError(e));
      });
    return () => {
      active.current = false;
      revision.current++;
    };
  }, [requestId, storageKey]);
  const edit = (action: () => void) => {
    action();
    revision.current++;
    setQuote(null);
  };
  const draft = () =>
    createOrderSchema.parse({
      requestId,
      customerId,
      priceListId,
      paymentMethodId,
      paymentKind,
      shippingFee: Number(shipping.replace(',', '.')),
      shippingVatRate: Number(shippingVat),
      address,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity.replace(',', '.')),
      })),
    });
  const calculate = async () => {
    setError(null);
    const version = ++revision.current;
    setBusy(true);
    try {
      const result = await service.preview(draft());
      if (active.current && version === revision.current) setQuote(result);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error && 'issues' in e
            ? 'Müşteri, ürün ve diğer alanları kontrol edin.'
            : dataError(e),
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const save = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const input = submitted ?? { ...draft(), expectedTotal: quote!.total };
      sessionStorage.setItem(storageKey, input.requestId);
      setSubmitted(input);
      await service.create(input);
      sessionStorage.removeItem(storageKey);
      if (active.current) {
        onSaved();
        onClose();
      }
    } catch (e) {
      if (active.current) {
        setError(dataError(e));
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          const existing = await service.lookup(requestId).catch(() => undefined);
          if (existing) {
            sessionStorage.removeItem(storageKey);
            onSaved();
            onClose();
          } else if (existing === null) {
            sessionStorage.removeItem(storageKey);
            setSubmitted(null);
            setQuote(null);
          }
        }
      }
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const options = (rows: { id: string; name: string }[]) => [
    { value: '', label: 'Seçin' },
    ...rows.map((r) => ({ value: r.id, label: r.name })),
  ];
  return (
    <Sheet
      open
      title="Yeni Sipariş"
      size="lg"
      permission="save"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        {recovering && <p>Önceki sipariş isteğinin sonucu kontrol ediliyor…</p>}
        {!choices ? (
          <p>Seçenekler yükleniyor…</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Varyantsız, ek vergisi olmayan ürünlerin ana birim TRY fiyatları kullanılır. Sipariş
              kaydedilince stok düşer; tahsilat ayrıca kaydedilir.
            </p>
            <fieldset disabled={locked} className="grid min-w-0 gap-4 sm:grid-cols-2">
              <SelectField
                label="Müşteri"
                value={customerId}
                options={options(choices.customers)}
                onChange={(v) => edit(() => setCustomerId(v))}
              />
              <SelectField
                label="Fiyat Listesi"
                value={priceListId}
                options={options(choices.priceLists)}
                onChange={(v) => edit(() => setPriceListId(v))}
              />
              <SelectField
                label="Ödeme Şekli"
                value={paymentMethodId}
                options={options(choices.payments)}
                onChange={(v) => edit(() => setPaymentMethodId(v))}
              />
              <SelectField
                label="Tahsilat Türü"
                value={paymentKind}
                options={[
                  { value: 'bank_transfer', label: 'Havale' },
                  { value: 'cash', label: 'Nakit' },
                  { value: 'cash_on_delivery', label: 'Kapıda ödeme' },
                ]}
                onChange={(v) => edit(() => setPaymentKind(v))}
              />
              <TextField
                label="Kargo (KDV dahil, TL)"
                value={shipping}
                numeric="decimal"
                onChange={(e) => edit(() => setShipping(e.target.value))}
              />
              <SelectField
                label="Kargo KDV Oranı"
                value={shippingVat}
                options={[0, 1, 10, 20].map((v) => ({ value: String(v), label: `%${v}` }))}
                onChange={(v) => edit(() => setShippingVat(v))}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Teslimat Adresi"
                  value={address}
                  maxLength={500}
                  onChange={(e) => edit(() => setAddress(e.target.value))}
                />
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_7rem_auto]">
                  <SelectField
                    label={`Ürün ${index + 1}`}
                    value={item.productId}
                    options={options(
                      choices.products
                        .filter(
                          (p) =>
                            p.id === item.productId || !items.some((i) => i.productId === p.id),
                        )
                        .map((p) => ({ ...p, name: `${p.name} · ${p.code}` })),
                    )}
                    onChange={(v) =>
                      edit(() =>
                        setItems((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, productId: v } : r)),
                        ),
                      )
                    }
                  />
                  <TextField
                    label={`Miktar ${index + 1}`}
                    value={item.quantity}
                    numeric="decimal"
                    onChange={(e) =>
                      edit(() =>
                        setItems((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, quantity: e.target.value } : r,
                          ),
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    flow={false}
                    onClick={() =>
                      edit(() => setItems((rows) => rows.filter((_, i) => i !== index)))
                    }
                  >
                    Kaldır
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                flow={false}
                disabled={items.length >= 100 || locked}
                onClick={() =>
                  edit(() => setItems((v) => [...v, { productId: '', quantity: '1' }]))
                }
              >
                Ürün Ekle
              </Button>
            </fieldset>
            {quote && (
              <div className="rounded-2xl border border-line p-4" aria-live="polite">
                <p>
                  Ürünler: {formatMoney(Number(quote.subtotal))} · İndirim:{' '}
                  {formatMoney(Number(quote.discount))}
                </p>
                <p>
                  Kargo: {formatMoney(Number(quote.shippingFee) - Number(quote.shippingDiscount))}
                </p>
                <p className="mt-2 font-bold">Ödenecek: {formatMoney(Number(quote.total))}</p>
              </div>
            )}
            {submitted && (
              <Alert>
                İstek gönderildi. Sonuç alınamadıysa aynı siparişi tekrar denetleyebilirsiniz;
                ikinci sipariş oluşturulmaz.
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                flow={false}
                disabled={locked}
                onClick={() => void calculate()}
              >
                Tutarı Hesapla
              </Button>
              <Button loading={busy} disabled={!quote && !submitted} onClick={() => void save()}>
                {submitted ? 'Aynı İsteği Tekrar Dene' : 'Siparişi Oluştur'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
