import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { campaignCartSchema, type CampaignCartQuote } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { ProductPickerSheet } from '../../products/components/ProductPickerSheet';
import { useProductService } from '../../products/services/product.service';
import type { ProductItem } from '../../products/types';
import { useCampaignService } from '../services/campaign.service';
import type { CampaignAudience } from '../campaign-audience';

const money = (value: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value));
const decimal = (value: string) => Number(value.replace(',', '.'));

/** Kayıtlı kurallarla gerçek katalog önizlemesi. Sonuç, giriş değiştiğinde geçerliliğini kaybeder. */
export function CartPreview({ choices }: { choices: CampaignAudience }) {
  const service = useCampaignService();
  const productService = useProductService();
  const [items, setItems] = useState<{ product: ProductItem; quantity: string }[]>([]);
  const [priceListId, setPriceListId] = useState(choices.priceLists[0]?.id ?? '');
  const [customerTypeId, setCustomerTypeId] = useState('');
  const [shippingFee, setShippingFee] = useState('0');
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<CampaignCartQuote | null>(null);
  const revision = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      revision.current++;
    };
  }, []);

  const invalidate = () => {
    revision.current++;
    setQuote(null);
    setError(null);
    setBusy(false);
  };
  const chooseProduct = async () => {
    if (products) {
      setPicking(true);
      return;
    }
    setLoadingProducts(true);
    setError(null);
    try {
      const loaded = await productService.list();
      if (!alive.current) return;
      setProducts(loaded.filter((item) => item.salesOpen && !item.variantCount));
      setPicking(true);
    } catch (e) {
      if (alive.current) setError(dataError(e));
    } finally {
      if (alive.current) setLoadingProducts(false);
    }
  };
  const calculate = async () => {
    const parsed = campaignCartSchema.safeParse({
      priceListId,
      customerTypeId: customerTypeId || null,
      shippingFee: decimal(shippingFee || '0'),
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: decimal(item.quantity),
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ürün ve miktarları kontrol edin.');
      return;
    }
    const request = ++revision.current;
    setBusy(true);
    setError(null);
    setQuote(null);
    try {
      const result = await service.quote(parsed.data);
      if (request === revision.current) setQuote(result);
    } catch (e) {
      if (request === revision.current) setError(dataError(e));
    } finally {
      if (request === revision.current) setBusy(false);
    }
  };

  return (
    <section
      aria-label="Kayıtlı kurallarla sepet denemesi"
      className="flex flex-col gap-4 rounded-3xl border border-line bg-surface-raised p-5"
    >
      <div>
        <h2 className="text-lg font-bold">Kayıtlı kurallarla sepet denemesi</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Kaydedilmiş sepet indirimi ve ücretsiz kargo kuralları kullanılır. Fiyatlar ana birim ve
          KDV dahil TRY tutarıyla hesaplanır.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Deneme fiyat listesi"
          options={choices.priceLists.map((item) => ({ value: item.id, label: item.name }))}
          value={priceListId}
          onChange={(value) => {
            invalidate();
            setPriceListId(value);
          }}
        />
        <SelectField
          label="Deneme cari tipi"
          options={[
            { value: '', label: 'Seçilmedi' },
            ...choices.customerTypes.map((item) => ({ value: item.id, label: item.name })),
          ]}
          value={customerTypeId}
          onChange={(value) => {
            invalidate();
            setCustomerTypeId(value);
          }}
        />
        <TextField
          label="Deneme kargo bedeli (₺)"
          numeric="decimal"
          value={shippingFee}
          onChange={(event) => {
            invalidate();
            setShippingFee(event.target.value);
          }}
        />
      </div>
      {items.map((item) => (
        <div key={item.product.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate font-semibold">{item.product.name}</span>
          <div className="w-28">
            <TextField
              label={`${item.product.name} miktarı`}
              numeric="decimal"
              value={item.quantity}
              onChange={(event) => {
                invalidate();
                setItems((current) =>
                  current.map((row) =>
                    row.product.id === item.product.id
                      ? { ...row, quantity: event.target.value }
                      : row,
                  ),
                );
              }}
            />
          </div>
          <button
            type="button"
            aria-label={`${item.product.name} kaldır`}
            className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-danger"
            onClick={() => {
              invalidate();
              setItems((current) => current.filter((row) => row.product.id !== item.product.id));
            }}
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          fullWidth={false}
          variant="outline"
          flow={false}
          loading={loadingProducts}
          disabled={items.length >= 100}
          onClick={() => void chooseProduct()}
        >
          Ürün Ekle
        </Button>
        <Button
          fullWidth={false}
          flow={false}
          loading={busy}
          loadingLabel="Hesaplanıyor…"
          disabled={!items.length || !priceListId}
          onClick={() => void calculate()}
        >
          Sepeti Hesapla
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {quote && (
        <dl className="grid gap-3 rounded-2xl bg-surface-muted p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ürün toplamı', quote.subtotal],
            ['Sepet indirimi', quote.discount],
            ['Kargo indirimi', quote.shippingDiscount],
            ['Ödenecek toplam', quote.total],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="mt-1 text-lg font-bold">{money(value!)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-ink-muted">
        Bu bir hesaplama denemesidir; sipariş, stok hareketi veya ödeme oluşturmaz. Üst üste gelen
        indirimlerden en avantajlısı uygulanır.
      </p>
      {picking && products && (
        <ProductPickerSheet
          products={products}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            const product = products.find((item) => item.id === id);
            if (!product) return;
            invalidate();
            setItems((current) =>
              current.some((item) => item.product.id === id)
                ? current.map((item) =>
                    item.product.id === id
                      ? { ...item, quantity: String(decimal(item.quantity) + 1) }
                      : item,
                  )
                : [...current, { product, quantity: '1' }],
            );
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
