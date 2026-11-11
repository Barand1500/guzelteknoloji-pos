import { Star } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { formatMoney } from '../../home/components/parts';
import { ReturnPill, StatusPill, formatDateTime } from '../../orders/components/parts';
import { RETURN_KIND_LABEL } from '../../orders/types';
import { balanceOf, type Customer, type CustomerDetail } from '../types';

/** Basit satır listesi: başlık, alt yazı, sağda değer/rozet; boşsa dostça bir mesaj. */
function Rows({
  label,
  empty,
  items,
}: {
  label: string;
  empty: string;
  items: { id: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }[];
}) {
  if (items.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line-strong/50 bg-surface px-4 py-10 text-center text-ink-muted">
        {empty}
      </p>
    );
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li
          key={it.id}
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          className="flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{it.title}</span>
            {it.sub ? (
              <span className="block truncate text-sm text-ink-muted">{it.sub}</span>
            ) : null}
          </span>
          {it.right ? <span className="shrink-0 text-right">{it.right}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Küçük sekme hapları (alt gruplar): "Siparişler 6 · İade 2 · …". */
function SubTabs<T extends string>({
  label,
  value,
  onChange,
  tabs,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  tabs: { id: T; label: string; count: number }[];
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
    >
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={[
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-all duration-200',
              on
                ? 'border-brand-600 bg-brand-700 text-white shadow-soft'
                : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-white/20' : 'bg-surface-muted'}`}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">{label}</dt>
      <dd className="mt-0.5 break-words font-semibold">{children || '—'}</dd>
    </div>
  );
}

export const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title} className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
    <h3 className="mb-3 text-base font-extrabold tracking-tight">{title}</h3>
    {children}
  </section>
);

/* 2) Adresler: CustomerAddressTab.tsx */

/** 3) Hesap hareketleri: borç / alacak / bakiye + hareket listesi. */
export function AccountTab({ customer, detail }: { customer: Customer; detail: CustomerDetail }) {
  const bal = balanceOf(customer);
  const tiles = [
    { label: 'Borç', value: formatMoney(customer.debt), tone: 'bg-danger-soft text-danger' },
    { label: 'Alacak', value: formatMoney(customer.credit), tone: 'bg-success-soft text-success' },
    {
      label: bal > 0 ? 'Bakiye (borçlu)' : bal < 0 ? 'Bakiye (alacaklı)' : 'Bakiye',
      value: formatMoney(Math.abs(bal)),
      tone: 'bg-brand-50 text-brand-ink',
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`min-w-0 rounded-2xl p-3 sm:p-4 ${t.tone}`}>
            <dd className="truncate text-base font-extrabold sm:text-xl">{t.value}</dd>
            <dt className="truncate text-xs font-semibold opacity-80 sm:text-sm">{t.label}</dt>
          </div>
        ))}
      </dl>
      <Rows
        label="Hesap hareketleri"
        empty="Hesap hareketi yok."
        items={detail.ledger.map((l) => ({
          id: l.id,
          title: l.ref,
          sub: formatDateTime(l.date),
          right:
            l.debt > 0 ? (
              <b className="text-danger">+ {formatMoney(l.debt)}</b>
            ) : (
              <b className="text-success">− {formatMoney(l.credit)}</b>
            ),
        }))}
      />
    </div>
  );
}

type ShopTab = 'orders' | 'returns' | 'cart' | 'saved' | 'favorites' | 'alerts';

/** 4) Alışveriş: sipariş, iade/değişim, sepet, kayıtlı sepet, favori, fiyat alarmı (6 ekran tek sekmede). */
export function ShoppingTab({ detail }: { detail: CustomerDetail }) {
  const [tab, setTab] = useState<ShopTab>('orders');
  const product = (
    p: { id: string; code: string; name: string; gross: number; stock: string },
    extra?: ReactNode,
  ) => ({
    id: p.id,
    title: p.name,
    sub: `${p.code} · Stok: ${p.stock}`,
    right: (
      <span className="flex flex-col items-end">
        <b>{formatMoney(p.gross)}</b>
        {extra}
      </span>
    ),
  });
  return (
    <div className="flex flex-col gap-4">
      <SubTabs
        label="Alışveriş bölümleri"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'orders', label: 'Siparişler', count: detail.orders.length },
          { id: 'returns', label: 'İade/Değişim', count: detail.returns.length },
          { id: 'cart', label: 'Sepet', count: detail.cart.length },
          { id: 'saved', label: 'Kayıtlı Sepetler', count: detail.savedCarts.length },
          { id: 'favorites', label: 'Favoriler', count: detail.favorites.length },
          { id: 'alerts', label: 'Fiyat Alarmları', count: detail.alerts.length },
        ]}
      />
      {tab === 'orders' ? (
        <Rows
          label="Siparişler"
          empty="Henüz sipariş yok."
          items={detail.orders.map((o) => ({
            id: o.id,
            title: `#${o.no}`,
            sub: `${formatDateTime(o.date)} · ${o.paid ? 'Ödendi' : 'Ödeme bekleniyor'}`,
            right: (
              <span className="flex flex-col items-end gap-1">
                <b>{formatMoney(o.total)}</b>
                <StatusPill status={o.status} />
              </span>
            ),
          }))}
        />
      ) : null}
      {tab === 'returns' ? (
        <Rows
          label="İade ve değişim talepleri"
          empty="İade ya da değişim talebi yok."
          items={detail.returns.map((r) => ({
            id: r.id,
            title: `${RETURN_KIND_LABEL[r.kind]} · #${r.orderNo}`,
            sub: `${formatDateTime(r.date)} · ${r.items} ürün`,
            right: <ReturnPill status={r.status} />,
          }))}
        />
      ) : null}
      {tab === 'cart' ? (
        <Rows
          label="Sepet"
          empty="Sepet boş."
          items={detail.cart.map((p) =>
            product(p, <span className="text-xs text-ink-muted">{p.qty} adet</span>),
          )}
        />
      ) : null}
      {tab === 'saved' ? (
        <Rows
          label="Kayıtlı sepetler"
          empty="Kayıtlı sepet yok."
          items={detail.savedCarts.map((s) => ({
            id: s.id,
            title: s.name,
            sub: formatDateTime(s.date),
            right: <b>{s.items} ürün</b>,
          }))}
        />
      ) : null}
      {tab === 'favorites' ? (
        <Rows
          label="Favoriler"
          empty="Favori ürün yok."
          items={detail.favorites.map((p) => product(p))}
        />
      ) : null}
      {tab === 'alerts' ? (
        <Rows
          label="Fiyat alarmları"
          empty="Fiyat alarmı yok."
          items={detail.alerts.map((p) =>
            product(p, <span className="text-xs font-bold text-danger">{p.alert}</span>),
          )}
        />
      ) : null}
    </div>
  );
}

type FeedbackTab = 'reviews' | 'liked' | 'messages';

/** 5) Geri bildirim: yorumlar, beğenilen yorumlar, mesajlar (3 ekran tek sekmede). */
export function FeedbackTab({ detail }: { detail: CustomerDetail }) {
  const [tab, setTab] = useState<FeedbackTab>('reviews');
  const review = (r: CustomerDetail['reviews'][number]) => ({
    id: r.id,
    title: (
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-flex items-center gap-0.5 text-accent"
          aria-label={`${r.rating} yıldız`}
        >
          {Array.from({ length: r.rating }, (_, i) => (
            <Star key={i} className="size-4 fill-current" aria-hidden="true" />
          ))}
        </span>
        {r.product}
      </span>
    ),
    sub: `“${r.text}” · #${r.orderNo} · ${formatDateTime(r.date)}`,
    right: (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.approved ? 'bg-success-soft text-success' : 'bg-accent-soft text-brand-800'}`}
      >
        {r.approved ? 'Yayında' : 'Onay bekliyor'}
      </span>
    ),
  });
  return (
    <div className="flex flex-col gap-4">
      <SubTabs
        label="Geri bildirim bölümleri"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'reviews', label: 'Yorumlar', count: detail.reviews.length },
          { id: 'liked', label: 'Beğenilen Yorumlar', count: detail.likedReviews.length },
          { id: 'messages', label: 'Mesajlar', count: detail.messages.length },
        ]}
      />
      {tab === 'reviews' ? (
        <Rows label="Yorumlar" empty="Henüz yorum yok." items={detail.reviews.map(review)} />
      ) : null}
      {tab === 'liked' ? (
        <Rows
          label="Beğenilen yorumlar"
          empty="Beğenilen yorum yok."
          items={detail.likedReviews.map(review)}
        />
      ) : null}
      {tab === 'messages' ? (
        <Rows
          label="Mesajlar"
          empty="Mesaj yok."
          items={detail.messages.map((m) => ({
            id: m.id,
            title: m.subject,
            sub: `${m.text} · ${formatDateTime(m.date)}`,
            right: (
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold">
                {m.place}
              </span>
            ),
          }))}
        />
      ) : null}
    </div>
  );
}
