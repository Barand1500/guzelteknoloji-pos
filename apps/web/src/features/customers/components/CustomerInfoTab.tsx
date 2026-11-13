import { Mail, Pencil, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { Alert } from '../../../components/ui/Alert';
import { useCustomerChoices } from '../hooks/useCustomerChoices';
import { formatDateTime } from '../../orders/components/parts';
import {
  KIND_LABEL,
  type Customer,
  type CustomerDetail,
  type CustomerDraft,
} from '../types';
import { Info } from './CustomerTabs';

export type InfoCard = 'kimlik' | 'iletisim' | 'satis';
export type InfoErrors = Partial<Record<'name' | 'phone' | 'email' | 'taxId', string>>;

/** Düzenleme durumu (müşteri sayfası tutar): hangi kutular açık, ortak taslak, hatalar. */
export interface InfoEditing {
  cards: InfoCard[];
  draft: CustomerDraft | null;
  errors: InfoErrors;
  begin: (card: InfoCard) => void;
  set: <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => void;
}

/**
 * Kutu: çift tıklayınca (telefonda çift dokunma) düzenlenir; sağ üstteki küçük kalem aynı işi
 * klavye/ekran okuyucu için yapar. Düzenleme açıkken kutunun kenarı turuncu olur.
 */
function EditCard({
  title,
  card,
  editing,
  children,
}: {
  title: string;
  card: InfoCard;
  editing: InfoEditing;
  children: (on: boolean) => ReactNode;
}) {
  const on = editing.cards.includes(card);
  return (
    // Çift tık yalnızca kısayoldur; aynı işi kalem düğmesi klavyeyle de yapar.
     
    <section
      aria-label={title}
      onDoubleClick={() => editing.begin(card)}
      className={`group/card px-5 py-5 transition-colors first:rounded-t-3xl last:rounded-b-3xl sm:px-7 ${on ? 'bg-brand-50/60' : 'hover:bg-surface-muted/40'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold tracking-wider text-brand-ink uppercase">{title}</h3>
        {on ? null : (
          <button
            type="button"
            aria-label={`${title} bilgilerini düzenle`}
            title="Düzenlemek için çift tıklayın"
            onClick={() => editing.begin(card)}
            className="flex size-8 items-center justify-center rounded-full text-ink-muted opacity-60 transition-opacity hover:bg-surface-muted hover:text-ink hover:opacity-100 group-hover/card:opacity-100"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {children(on)}
    </section>
  );
}

/** 1) Bilgiler + giriş hesapları. Kutulara çift tıklayarak yerinde düzenlenir. */
export function InfoTab({
  customer,
  detail,
  editing,
  onUserToggle,
}: {
  customer: Customer;
  detail: CustomerDetail;
  editing: InfoEditing;
  onUserToggle: (userId: string, active: boolean) => void;
}) {
  const choices = useCustomerChoices();
  const { draft, errors, set } = editing;
  const corporate = (draft?.kind ?? customer.kind) === 'corporate';
  const idLength = corporate ? 10 : 11;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {choices.error && <div className="col-span-full"><Alert tone="error">{choices.error}</Alert></div>}
      <div className="divide-y divide-line rounded-3xl border border-line bg-surface">
      <EditCard title="Kimlik" card="kimlik" editing={editing}>
        {(on) =>
          on && draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
              <Segmented
                label="Kişi tipi"
                value={draft.kind}
                options={[
                  { value: 'real', label: 'Gerçek Kişi' },
                  { value: 'corporate', label: 'Tüzel Kişi' },
                ]}
                onChange={(v) => set('kind', v as CustomerDraft['kind'])}
              />
              </div>
              <TextField
                label={corporate ? 'Ünvan' : 'Ad Soyad'}
                value={draft.name}
                error={errors.name}
                maxLength={160}
                onChange={(e) => set('name', e.target.value)}
              />
              <TextField
                label={corporate ? 'Vergi No' : 'TC Kimlik No'}
                numeric="integer"
                value={draft.taxId}
                error={errors.taxId}
                maxLength={idLength}
                onChange={(e) => set('taxId', e.target.value)}
              />
              <TextField
                label="Müşteri kodu"
                value={draft.code}
                maxLength={40}
                onChange={(e) => set('code', e.target.value)}
              />
              <SelectField
                label="Cari tipi"
                options={Array.from(new Set([...choices.customerTypes, draft.customerType])).map((t) => ({ value: t, label: t }))}
                value={draft.customerType}
                onChange={(v) => set('customerType', v)}
              />
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              <Info label="Kişi tipi">{KIND_LABEL[customer.kind]}</Info>
              <Info label={customer.kind === 'corporate' ? 'Vergi No' : 'TC Kimlik No'}>
                {customer.taxId}
              </Info>
              <Info label="Müşteri kodu">{customer.code}</Info>
              <Info label="Cari tipi">{customer.customerType}</Info>
            </dl>
          )
        }
      </EditCard>

      <EditCard title="İletişim" card="iletisim" editing={editing}>
        {(on) =>
          on && draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Telefon"
                type="tel"
                value={draft.phone}
                error={errors.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              <TextField
                label="E-posta"
                type="email"
                value={draft.email}
                error={errors.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Telefon">
                <a
                  href={`tel:${customer.phone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center gap-2 text-brand-ink hover:underline"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {customer.phone}
                </a>
              </Info>
              <Info label="E-posta">
                <a
                  href={`mailto:${customer.email}`}
                  className="inline-flex items-center gap-2 break-all text-brand-ink hover:underline"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {customer.email}
                </a>
              </Info>
            </dl>
          )
        }
      </EditCard>

      <EditCard title="Satış" card="satis" editing={editing}>
        {(on) =>
          on && draft ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Fiyat listesi"
                options={Array.from(new Set([...choices.priceLists, draft.priceList])).map((p) => ({ value: p, label: p }))}
                value={draft.priceList}
                onChange={(v) => set('priceList', v)}
              />
              <MultiSelectField
                label="Ödeme şekilleri"
                options={Array.from(new Set([...choices.payments, ...draft.payments])).map((p) => ({ id: p, name: p }))}
                value={draft.payments}
                onChange={(v) => set('payments', v)}
              />
              <TextField
                label="Kart anlaşması"
                value={draft.cardDeal}
                maxLength={80}
                onChange={(e) => set('cardDeal', e.target.value)}
              />
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              <Info label="Fiyat listesi">{customer.priceList}</Info>
              <Info label="Kart anlaşması">{customer.cardDeal}</Info>
              <div className="col-span-2 lg:col-span-2">
                <dt className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">
                  Ödeme şekilleri
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {customer.payments.length === 0 ? (
                    <span className="text-sm text-ink-muted">Aktif ödeme şekillerinin hepsi</span>
                  ) : (
                    customer.payments.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                      >
                        {p}
                      </span>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          )
        }
      </EditCard>
      </div>

      <section
        aria-label="Giriş hesapları"
        className="rounded-3xl border border-line bg-surface p-4 sm:p-5"
      >
        <h3 className="mb-3 text-base font-extrabold tracking-tight">Giriş hesapları</h3>
        {detail.users.length === 0 ? (
          <p className="text-ink-muted">Bu müşterinin giriş yapabilen kullanıcısı yok.</p>
        ) : (
          <ul aria-label="Kullanıcılar" className="flex flex-col gap-2">
            {detail.users.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 p-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{u.name}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    {u.email}
                    {u.lastLogin ? ` · son giriş ${formatDateTime(u.lastLogin)}` : ''}
                  </span>
                </span>
                <ToggleSwitch
                  label={`${u.name} girişi`}
                  checked={u.active}
                  onChange={(v) => onUserToggle(u.id, v)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
