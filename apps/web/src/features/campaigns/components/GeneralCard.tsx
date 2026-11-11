import { Flag, Percent, ShoppingCart, Truck } from 'lucide-react';
import { useState } from 'react';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { formatMoneyShort, CountUp } from '../../home/components/parts';
import {
  CUSTOMER_TYPE_OPTIONS,
  PRICE_LIST_OPTIONS,
  outcome,
  type CampaignKind,
  type GeneralRule,
} from '../types';

/** Cümlenin içindeki altı çizgili sayı kutusu. Yalnızca rakam alır. */
export function InlineNumber({
  label,
  value,
  onChange,
  max,
  width = 'w-28 sm:w-44',
  align = 'center',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  width?: string;
  align?: 'center' | 'left';
}) {
  return (
    <input
      inputMode="numeric"
      aria-label={label}
      value={value === 0 ? '0' : value.toLocaleString('tr-TR')}
      onChange={(e) => {
        const n = Number(e.target.value.replace(/\D/g, '')) || 0;
        onChange(max !== undefined ? Math.min(n, max) : n);
      }}
      onFocus={(e) => e.currentTarget.select()}
      className={`${width} ${align === 'left' ? 'text-left' : 'text-center'} border-0 border-b-[3px] border-brand-500/50 bg-transparent px-1 text-2xl font-extrabold tracking-tight text-brand-ink outline-none transition-colors hover:border-brand-500 focus:border-brand-700 sm:text-4xl`}
    />
  );
}

/** "Sepet ... üzerindeyse ... uygula" cümlesi + kimlere + canlı deneme. */
export function GeneralCard({
  kind,
  rule,
  onChange,
}: {
  kind: CampaignKind;
  rule: GeneralRule;
  onChange: (next: GeneralRule) => void;
}) {
  const set = <K extends keyof GeneralRule>(key: K, value: GeneralRule[K]) =>
    onChange({ ...rule, [key]: value });
  const cart = kind === 'cart';
  const Icon = cart ? Percent : Truck;

  return (
    <section
      aria-label="Genel kural"
      className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-5 shadow-soft sm:p-7"
    >
      {/* Arka plandaki büyük, silik simge */}
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 -right-6 -z-10 size-44 -rotate-12 text-brand-600/[0.07]"
      />

      <div className="flex items-start gap-3">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-soft transition-colors duration-300 ${rule.active ? 'bg-brand-700' : 'bg-line-strong/60'}`}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight">
            {cart ? 'Genel Sepet İndirimi' : 'Genel Ücretsiz Kargo'}
          </h2>
          <p className="text-sm text-ink-muted">Tüm sepetlere uygulanır.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={rule.active}
          aria-label="Genel kural aktif"
          onClick={() => set('active', !rule.active)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-extrabold transition-colors ${rule.active ? 'border-success/30 bg-success-soft text-success' : 'border-field-border bg-surface-raised text-ink-muted'}`}
        >
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${rule.active ? 'animate-pulse bg-success' : 'bg-line-strong'}`}
          />
          {rule.active ? 'Aktif' : 'Pasif'}
        </button>
      </div>

      {/* Cümle */}
      <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-3 text-lg leading-relaxed font-semibold">
        <span>Sepet</span>
        <span className="inline-flex items-baseline gap-1.5">
          <InlineNumber label="Alt sınır (₺)" value={rule.minTotal} onChange={(n) => set('minTotal', n)} />
          <span className="text-2xl font-extrabold text-brand-ink">₺</span>
        </span>
        <span>ve üzerindeyse</span>
        {cart ? (
          <>
            <span className="inline-flex items-baseline gap-1.5">
              <InlineNumber
                label="İndirim değeri"
                value={rule.discountValue}
                onChange={(n) => set('discountValue', n)}
                max={rule.discountKind === 'percent' ? 100 : undefined}
                width="w-20 sm:w-24"
              />
              <span
                role="radiogroup"
                aria-label="İndirim tipi"
                className="inline-flex self-center rounded-full bg-surface-muted p-1 text-base"
              >
                {(
                  [
                    ['percent', '%'],
                    ['amount', '₺'],
                  ] as const
                ).map(([k, text]) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={rule.discountKind === k}
                    aria-label={k === 'percent' ? 'Yüzde' : 'Tutar'}
                    onClick={() => set('discountKind', k)}
                    className={`flex size-9 items-center justify-center rounded-full font-extrabold transition-all ${rule.discountKind === k ? 'bg-surface-raised text-brand-ink shadow-soft' : 'text-ink-muted'}`}
                  >
                    {text}
                  </button>
                ))}
              </span>
            </span>
            <span>indirim uygula.</span>
          </>
        ) : (
          <span>kargo ücretsiz olsun.</span>
        )}
      </p>

      {/* Kimlere */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MultiSelectField
          label="Cari Tipleri"
          options={CUSTOMER_TYPE_OPTIONS.map((t) => ({ id: t, name: t }))}
          value={rule.customerTypes}
          onChange={(v) => set('customerTypes', v)}
          emptyText="Hepsi"
          listText
        />
        <MultiSelectField
          label="Fiyat Listeleri"
          options={PRICE_LIST_OPTIONS.map((t) => ({ id: t, name: t }))}
          value={rule.priceLists}
          onChange={(v) => set('priceLists', v)}
          emptyText="Hepsi"
          listText
        />
      </div>

      <Simulator kind={kind} rule={rule} />
    </section>
  );
}

/**
 * "Kuralı dene": sepet tutarını kaydırınca sonucu düz cümleyle söyler. Yol çizgisinde bayrak kuralın
 * eşiğidir; kargoda kamyon sepet tutarını gösterir ve bayrağı geçince yeşile döner.
 */
export function Simulator({ kind, rule }: { kind: CampaignKind; rule: GeneralRule }) {
  const [cart, setCart] = useState<number | null>(null);
  const top = Math.max(rule.minTotal * 2, 10000);
  const step = top > 100000 ? 1000 : top > 20000 ? 500 : 250;
  const value = Math.min(
    cart ?? (rule.minTotal > 0 ? Math.round((rule.minTotal * 1.25) / step) * step : 5000),
    top,
  );
  const out = outcome(rule, kind, value);
  const missing = Math.max(0, rule.minTotal - value);
  const flagAt = rule.minTotal > 0 ? Math.min(100, (rule.minTotal / top) * 100) : 0;
  const truckAt = (value / top) * 100;
  const cart$ = <b className="whitespace-nowrap">{formatMoneyShort(value)}</b>;

  return (
    <div className="mt-5 rounded-2xl bg-surface-raised/70 p-4 ring-1 ring-line">
      <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">
        Kuralı dene <span className="font-semibold tracking-normal normal-case">· çubuğu kaydırın</span>
      </p>
      {/* Yol: bayrak = eşik, kamyon/nokta = örnek sepet */}
      <div className="relative mt-3 h-9">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-muted" />
        <div
          className={`absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full transition-colors ${out.applies ? 'bg-success' : 'bg-brand-500'}`}
          style={{ width: `${truckAt}%` }}
        />
        {rule.minTotal > 0 ? (
          <Flag
            aria-hidden="true"
            className="absolute top-0 size-5 -translate-x-1/2 text-brand-700"
            style={{ left: `${flagAt}%` }}
          />
        ) : null}
        <span
          aria-hidden="true"
          className={`absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-soft transition-[left,background-color] duration-150 ${out.applies ? 'bg-success' : 'bg-brand-700'}`}
          style={{ left: `${Math.min(Math.max(truckAt, 3), 97)}%` }}
        >
          {kind === 'shipping' ? <Truck className="size-5" /> : <ShoppingCart className="size-5" />}
        </span>
        <input
          type="range"
          min={0}
          max={top}
          step={step}
          value={value}
          onChange={(e) => setCart(Number(e.target.value))}
          aria-label="Örnek sepet tutarı"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <p className="mt-2 text-base leading-snug" aria-live="polite">
        {kind === 'cart' ? (
          out.applies ? (
            <>
              Sepet {cart$} olursa{' '}
              <b className="text-success">
                <CountUp value={out.discount} format={formatMoneyShort} duration={300} /> indirim
              </b>{' '}
              uygulanır; müşteri{' '}
              <b>
                <CountUp value={out.pay} format={formatMoneyShort} duration={300} />
              </b>{' '}
              öder.
            </>
          ) : (
            <>
              Sepet {cart$} olursa <b className="text-ink-muted">indirim yok</b>.{' '}
              <span className="text-ink-muted">{formatMoneyShort(missing)} daha eklenirse başlar.</span>
            </>
          )
        ) : out.applies ? (
          <>
            Sepet {cart$} olursa <b className="text-success">kargo ücretsiz</b>.
          </>
        ) : (
          <>
            Sepet {cart$} olursa <b className="text-ink-muted">kargo ücretli</b>.{' '}
            <span className="text-ink-muted">{formatMoneyShort(missing)} daha eklenirse ücretsiz.</span>
          </>
        )}
      </p>
    </div>
  );
}
