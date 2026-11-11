import {
  ChevronLeft,
  KeyRound,
  MapPin,
  MessageSquareHeart,
  ShoppingBag,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { dataError } from '../../../lib/catalog-data';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import {
  usePublishAddAction,
  usePublishDockTabs,
  usePublishSaveAction,
} from '../../app-shell/save-action';
import { useCustomerDetail } from '../hooks/useCustomers';
import { useCustomerService } from '../services/customer.service';
import {
  KIND_LABEL,
  type AddressDraft,
  type CustomerAddress,
  type CustomerDraft,
} from '../types';
import { AddressSheet, AddressTab } from './CustomerAddressTab';
import { InfoTab, type InfoCard, type InfoErrors } from './CustomerInfoTab';
import { AccountTab, FeedbackTab, ShoppingTab } from './CustomerTabs';
import { useCustomerStore } from './CustomerLayout';
import { Avatar, BalanceChip } from './CustomersView';
import { NextCustomerBar } from './NextCustomerBar';

/** Sekmeler alt çubukta (yüzen ada) durur; Dock ilk ikisini sola, kalanı sağa dizer. */
const TABS = [
  { id: 'bilgiler', label: 'Bilgiler', icon: UserRound },
  { id: 'adresler', label: 'Adresler', icon: MapPin },
  { id: 'hesap', label: 'Hesap', icon: Wallet },
  { id: 'alisveris', label: 'Alışveriş', icon: ShoppingBag },
  { id: 'geri-bildirim', label: 'Yorumlar', icon: MessageSquareHeart },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s: string) => s.replace(/[^0-9]/g, '');

/**
 * Müşteri sayfası. Sekmeler (Bilgiler · Adresler · Hesap · Alışveriş · Yorumlar) alttaki yüzen
 * adadadır; adanın ortasındaki düğme düzenleme açıkken "Kaydet", değilken "Adres Ekle"dir.
 * Bilgi kutularına çift tıklayınca kutu yerinde düzenlenir (ayrı "Düzenle" düğmesi yok). Sağ
 * üstte: sıradaki müşteriye geçiş, giriş aç/kapat ve sil. Açık sekme adreste tutulur (?sekme=…).
 */
export function CustomerDetailView() {
  const { id = '' } = useParams();
  // Müşteri değişince düzenleme durumu sıfırlansın diye anahtarla yeniden kurulur.
  return <CustomerDetail key={id} id={id} />;
}

function CustomerDetail({ id }: { id: string }) {
  const store = useCustomerStore();
  const navigate = useNavigate();
  const service = useCustomerService();
  const [params, setParams] = useSearchParams();
  const wideBar = useMediaQuery('(min-width: 40rem)');
  const customer = store.customers.find((c) => c.id === id) ?? null;
  const { detail, setDetail, error } = useCustomerDetail(customer);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerDraft | null>(null);
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [errors, setErrors] = useState<InfoErrors>({});
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<{ edit: CustomerAddress | null } | null>(null);
  const [goTo, setGoTo] = useState<string | null>(null);
  const tab = TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'bilgiler';
  const editing = draft !== null;

  const changeTab = (next: string) =>
    setParams(next === 'bilgiler' ? {} : { sekme: next }, { replace: true });

  const cancel = () => {
    setDraft(null);
    setCards([]);
    setErrors({});
  };

  const begin = (card: InfoCard) => {
    if (!customer) return;
    setDraft(
      (d) =>
        d ?? {
          code: customer.code,
          name: customer.name,
          kind: customer.kind,
          taxId: customer.taxId,
          phone: customer.phone,
          email: customer.email,
          priceList: customer.priceList,
          customerType: customer.customerType,
          payments: customer.payments,
          cardDeal: customer.cardDeal,
        },
    );
    setCards((c) => (c.includes(card) ? c : [...c, card]));
    if (tab !== 'bilgiler') changeTab('bilgiler');
  };

  const setField = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async () => {
    if (!draft || !customer || saving) return;
    const corporate = draft.kind === 'corporate';
    const idLength = corporate ? 10 : 11;
    const next: InfoErrors = {};
    if (draft.name.trim() === '') next.name = corporate ? 'Ünvan gerekli.' : 'Ad soyad gerekli.';
    if (digits(draft.phone).length < 10) next.phone = 'Geçerli bir telefon numarası yazın.';
    if (!EMAIL.test(draft.email.trim())) next.email = 'Geçerli bir e-posta adresi yazın.';
    if (draft.taxId !== '' && digits(draft.taxId).length !== idLength)
      next.taxId = `${corporate ? 'Vergi no' : 'TC kimlik no'} ${idLength} haneli olmalı.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setProblem(null);
    try {
      await store.save(
        { ...draft, name: draft.name.trim(), email: draft.email.trim() },
        customer.id,
      );
      cancel();
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  // Alt adadaki orta düğme: düzenlerken Kaydet, değilken Adres Ekle.
  usePublishSaveAction(editing ? { onSave: () => void save(), saving } : null);
  usePublishAddAction('Adres Ekle', () => {
    changeTab('adresler');
    setAddress({ edit: null });
  });
  usePublishDockTabs({ items: TABS, value: tab, onChange: changeTab });

  // Esc düzenlemeden vazgeçirir (açık pencere varsa pencere kapanır, bu çalışmaz).
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

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

  const saveAddress = async (values: AddressDraft) => {
    const edit = address?.edit ?? null;
    const saved: CustomerAddress = store.sample
      ? { id: edit?.id ?? `a-${Date.now().toString(36)}`, ...values }
      : await service.saveAddress(customer.id, values, edit?.id);
    setDetail((d) => {
      if (!d) return d;
      const others = d.addresses.map((a) =>
        saved.isDefault && a.id !== saved.id ? { ...a, isDefault: false } : a,
      );
      const exists = others.some((a) => a.id === saved.id);
      return {
        ...d,
        addresses: exists ? others.map((a) => (a.id === saved.id ? saved : a)) : [...others, saved],
      };
    });
    setAddress(null);
  };

  const go = (to: string) => (editing ? setGoTo(to) : navigate(`/uygulama/musteriler/${to}`));

  const iconBtn = 'flex size-10 items-center justify-center rounded-full border transition-colors';
  const nextBar = <NextCustomerBar customers={store.customers} currentId={customer.id} onGo={go} />;

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-24">
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
        className="relative isolate rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-surface-raised to-surface-raised p-5 shadow-soft sm:p-7"
      >
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:flex-nowrap">
          <Avatar customer={customer} size="lg" />
          <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
            {/* Ad: çift tıklayınca Kimlik kutusu düzenlemeye açılır. */}
            { }
            <h2
              onDoubleClick={() => begin('kimlik')}
              className="text-2xl leading-tight font-extrabold tracking-tight break-words"
            >
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
          {/* Sağ üst: sıradaki müşteri (geniş ekranda), giriş aç/kapat, sil */}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:ml-0">
            {wideBar ? nextBar : null}
            <button
              type="button"
              onClick={() => void toggleAll()}
              aria-label={customer.active ? 'Girişi kapat' : 'Girişi aç'}
              title={customer.active ? 'Girişi kapat' : 'Girişi aç'}
              className={`${iconBtn} ${customer.active ? 'border-success/30 bg-success-soft text-success hover:border-success' : 'border-field-border bg-surface-raised text-ink-muted hover:border-brand-500 hover:text-ink'}`}
            >
              <KeyRound className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label="Müşteriyi sil"
              title="Müşteriyi sil"
              className={`${iconBtn} border-transparent bg-danger-soft text-danger hover:bg-danger hover:text-white`}
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        {wideBar ? null : <div className="mt-4">{nextBar}</div>}
      </section>

      {editing ? (
        <div className="flex animate-fade-in items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-ink">
          <span>Düzenleniyor · kaydetmek için alttaki düğmeye basın</span>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 font-bold hover:bg-surface-raised"
          >
            <X className="size-4" aria-hidden="true" />
            Vazgeç
          </button>
        </div>
      ) : null}

      {problem || error ? <Alert tone="error">{problem ?? error}</Alert> : null}

      <div
        key={tab}
        role="region"
        aria-label={TABS.find((t) => t.id === tab)?.label}
        className="animate-fade-in"
      >
        {!detail ? (
          <div className="h-48 animate-pulse rounded-3xl bg-surface-muted" aria-busy="true" />
        ) : tab === 'bilgiler' ? (
          <InfoTab
            customer={customer}
            detail={detail}
            editing={{ cards, draft, errors, begin, set: setField }}
            onUserToggle={(uid, v) => void toggleUser(uid, v)}
          />
        ) : tab === 'adresler' ? (
          <AddressTab detail={detail} onEdit={(a) => setAddress({ edit: a })} />
        ) : tab === 'hesap' ? (
          <AccountTab customer={customer} detail={detail} />
        ) : tab === 'alisveris' ? (
          <ShoppingTab detail={detail} />
        ) : (
          <FeedbackTab detail={detail} />
        )}
      </div>

      {address ? (
        <AddressSheet
          address={address.edit}
          onSave={saveAddress}
          onClose={() => setAddress(null)}
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
      <ConfirmSheet
        open={goTo !== null}
        title="Kaydedilmemiş değişiklikler var"
        description="Başka müşteriye geçerseniz bu müşterideki değişiklikler kaybolur."
        confirmLabel="Yine de Geç"
        onConfirm={() => {
          const to = goTo;
          setGoTo(null);
          if (to) navigate(`/uygulama/musteriler/${to}`);
        }}
        onClose={() => setGoTo(null)}
      />
    </div>
  );
}
