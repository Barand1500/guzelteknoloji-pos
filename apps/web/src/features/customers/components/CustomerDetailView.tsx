import {
  ChevronLeft,
  KeyRound,
  MapPin,
  MessageSquareHeart,
  Pencil,
  ShoppingBag,
  Trash2,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { dataError } from '../../../lib/catalog-data';
import { useCustomerDetail } from '../hooks/useCustomers';
import { useCustomerService } from '../services/customer.service';
import { KIND_LABEL } from '../types';
import { AccountTab, AddressTab, FeedbackTab, InfoTab, ShoppingTab } from './CustomerTabs';
import { useCustomerStore } from './CustomerLayout';
import { CustomerFormSheet } from './CustomerFormSheet';
import { Avatar, BalanceChip } from './CustomersView';

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'bilgiler', label: 'Bilgiler', icon: UserRound },
  { id: 'adresler', label: 'Adresler', icon: MapPin },
  { id: 'hesap', label: 'Hesap', icon: Wallet },
  { id: 'alisveris', label: 'Alışveriş', icon: ShoppingBag },
  { id: 'geri-bildirim', label: 'Geri Bildirim', icon: MessageSquareHeart },
];

/**
 * Müşteri sayfası. Referanstaki 13 ayrı sekme 5 anlaşılır gruba indi: Bilgiler (+ giriş hesapları),
 * Adresler, Hesap (borç/alacak/bakiye), Alışveriş (sipariş · iade · sepet · kayıtlı sepet · favori ·
 * alarm) ve Geri Bildirim (yorum · beğenilen · mesaj). Üstte kimlik kartı ve üç işlem: Düzenle,
 * Girişi Kapat/Aç (tüm kullanıcılar), Sil. Açık sekme adreste tutulur (?sekme=…).
 */
export function CustomerDetailView() {
  const { id = '' } = useParams();
  const store = useCustomerStore();
  const navigate = useNavigate();
  const service = useCustomerService();
  const [params, setParams] = useSearchParams();
  const customer = store.customers.find((c) => c.id === id) ?? null;
  const { detail, setDetail, error } = useCustomerDetail(customer);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const tab = TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'bilgiler';

  if (store.loading)
    return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;
  if (!customer)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
        <p className="text-lg font-bold">Müşteri bulunamadı</p>
        <Link to="/uygulama/musteriler" className="font-bold text-brand-ink underline">
          Müşteriler listesine dön
        </Link>
      </div>
    );

  const run = async (action: () => Promise<void>) => {
    setProblem(null);
    try {
      await action();
    } catch (e) {
      setProblem(dataError(e));
    }
  };

  const toggleAll = () =>
    run(async () => {
      const next = !customer.active;
      await store.setLogin(customer.id, next);
      setDetail((d) => (d ? { ...d, users: d.users.map((u) => ({ ...u, active: next })) } : d));
    });

  const toggleUser = (userId: string, active: boolean) =>
    run(async () => {
      if (!store.sample) await service.setUserLogin(customer.id, userId, active);
      setDetail((d) =>
        d ? { ...d, users: d.users.map((u) => (u.id === userId ? { ...u, active } : u)) } : d,
      );
    });

  const btn =
    'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors';

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        to="/uygulama/musteriler"
        className="inline-flex min-h-10 items-center gap-1 self-start rounded-full pr-3 text-sm font-bold text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        Müşteriler
      </Link>

      {/* Kimlik kartı */}
      <section
        aria-label="Müşteri özeti"
        className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-5 shadow-soft sm:p-7"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar customer={customer} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl leading-tight font-extrabold tracking-tight break-words">
              {customer.name}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-surface-muted px-2.5 py-1 font-bold">
                {KIND_LABEL[customer.kind]}
              </span>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 font-bold text-brand-ink">
                {customer.priceList}
              </span>
              {customer.code ? <span className="text-ink-muted">Kod {customer.code}</span> : null}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${customer.active ? 'bg-success-soft text-success' : 'bg-surface-muted text-ink-muted'}`}
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                {customer.active ? 'Girişe açık' : 'Giriş kapalı'}
              </span>
              <BalanceChip customer={customer} />
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Düzenle
          </button>
          <button
            type="button"
            onClick={() => void toggleAll()}
            className={`${btn} border border-field-border bg-surface-raised text-ink hover:border-brand-500`}
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {customer.active ? 'Girişi Kapat' : 'Girişi Aç'}
          </button>
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={`${btn} bg-danger-soft text-danger hover:bg-danger hover:text-white`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Sil
          </button>
        </div>
      </section>

      {problem || error ? <Alert tone="error">{problem ?? error}</Alert> : null}

      {/* Sekmeler */}
      <div
        role="tablist"
        aria-label="Müşteri bölümleri"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() =>
                setParams(t.id === 'bilgiler' ? {} : { sekme: t.id }, { replace: true })
              }
              className={[
                'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 font-bold transition-all duration-200',
                on
                  ? 'border-brand-600 bg-brand-50 text-brand-ink shadow-soft'
                  : 'border-line bg-surface-raised text-ink-muted hover:border-brand-500/60 hover:text-ink',
              ].join(' ')}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === tab)?.label}
        className="animate-fade-in"
      >
        {!detail ? (
          <div className="h-48 animate-pulse rounded-3xl bg-surface-muted" aria-busy="true" />
        ) : tab === 'bilgiler' ? (
          <InfoTab
            customer={customer}
            detail={detail}
            onUserToggle={(uid, v) => void toggleUser(uid, v)}
          />
        ) : tab === 'adresler' ? (
          <AddressTab detail={detail} />
        ) : tab === 'hesap' ? (
          <AccountTab customer={customer} detail={detail} />
        ) : tab === 'alisveris' ? (
          <ShoppingTab detail={detail} />
        ) : (
          <FeedbackTab detail={detail} />
        )}
      </div>

      {editing ? (
        <CustomerFormSheet
          customer={customer}
          onSave={async (draft) => {
            await store.save(draft, customer.id);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting}
        danger
        title={`${customer.name} Silinsin Mi?`}
        description="Müşteri ve giriş hesapları silinecek. Geçmiş siparişleri raporlarda kalır."
        confirmLabel="Sil"
        onConfirm={() =>
          void run(async () => {
            await store.remove(customer.id);
            setDeleting(false);
            navigate('/uygulama/musteriler');
          })
        }
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
