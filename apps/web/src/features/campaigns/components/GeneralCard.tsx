import { Percent, Truck } from 'lucide-react';
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  width?: string;
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
      className={`${width} border-0 border-b-[3px] border-brand-500/50 bg-transparent px-1 text-center text-2xl font-extrabold tracking-tight text-brand-ink outline-none transition-colors hover:border-brand-500 focus:border-brand-700 sm:text-4xl`}
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
            {cart ? 'Genel sepet indirimi' : 'Genel ücretsiz kargo'}
          </h2>
          <p className="text-sm text-ink-muted">Tüm sepetlere uygulanır</p>
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
          label="Cari tipleri"
          options={CUSTOMER_TYPE_OPTIONS.map((t) => ({ id: t, name: t }))}
          value={rule.customerTypes}
          onChange={(v) => set('customerTypes', v)}
          emptyText="Hepsi"
        />
        <MultiSelectField
          label="Fiyat listeleri"
          options={PRICE_LIST_OPTIONS.map((t) => ({ id: t, name: t }))}
          value={rule.priceLists}
          onChange={(v) => set('priceLists', v)}
          emptyText="Hepsi"
        />
      </div>

      <Simulator kind={kind} rule={rule} />
    </section>
  );
}

/** Sepet tutarını kaydırınca kuralın ne yapacağını anında gösterir. */
export function Simulator({ kind, rule }: { kind: CampaignKind; rule: GeneralRule }) {
  const top = Math.max(rule.minTotal * 2, 10000);
  const [cart, setCart] = useState<number | null>(null);
  const value = Math.min(cart ?? (rule.minTotal > 0 ? Math.round(rule.minTotal * 1.25) : 5000), top);
  const out = outcome(rule, kind, value);
  const missing = Math.max(0, rule.minTotal - value);
  const ratio = rule.minTotal > 0 ? Math.min(1, value / rule.minTotal) : 1;

  return (
    <div className="mt-6 rounded-3xl bg-surface-raised/80 p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold tracking-wide text-ink-muted uppercase">Dene</p>
        <p className="text-sm text-ink-muted">
          Örnek sepet <b className="text-base text-ink">{formatMoneyShort(value)}</b>
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={top}
        step={Math.max(50, Math.round(top / 200 / 50) * 50)}
        value={value}
        onChange={(e) => setCart(Number(e.target.value))}
        aria-label="Örnek sepet tutarı"
        className="mt-3 h-2 w-full cursor-pointer accent-brand-700"
      />
      {/* Eşiğe ne kadar kaldı */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ${out.applies ? 'bg-success' : 'bg-brand-500'}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3" aria-live="polite">
        {kind === 'cart' ? (
          out.applies ? (
            <>
              <span className="rounded-2xl bg-success-soft px-4 py-2.5 text-success">
                <span className="block text-xs font-bold">İndirim</span>
                <CountUp value={out.discount} format={formatMoneyShort} className="text-xl font-extrabold" />
              </span>
              <span className="rounded-2xl bg-surface-muted px-4 py-2.5">
                <span className="block text-xs font-bold text-ink-muted">Ödenecek</span>
                <CountUp value={out.pay} format={formatMoneyShort} className="text-xl font-extrabold" />
              </span>
            </>
          ) : (
            <span className="rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink-muted">
              İndirim yok · {formatMoneyShort(missing)} daha ekleyince başlar
            </span>
          )
        ) : out.applies ? (
          <span className="inline-flex animate-rise-in items-center gap-2 rounded-2xl bg-success-soft px-4 py-2.5 font-extrabold text-success">
            <Truck className="size-5" aria-hidden="true" />
            Kargo ücretsiz
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-2xl bg-surface-muted px-4 py-2.5 text-sm font-semibold text-ink-muted">
            <Truck className="size-5" aria-hidden="true" />
            Kargo ücretli · {formatMoneyShort(missing)} daha ekleyince ücretsiz
          </span>
        )}
      </div>
    </div>
  );
}
