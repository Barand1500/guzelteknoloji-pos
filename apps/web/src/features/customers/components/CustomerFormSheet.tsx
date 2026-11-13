import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NameItemDto, PriceListDto } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { MultiSelectField } from '../../../components/ui/MultiSelectField';
import { Segmented } from '../../../components/ui/Segmented';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { apiRequest } from '../../../lib/http';
import { siteService } from '../../ecommerce-settings/services/site.service';
import {
  emptyCustomerDraft,
  type Customer,
  type CustomerDraft,
} from '../types';
import { useCustomerChoices } from '../hooks/useCustomerChoices';

interface CustomerFormSheetProps {
  /** Düzenlenen müşteri; yoksa yeni müşteri eklenir. */
  customer: Customer | null;
  onSave: (draft: CustomerDraft) => Promise<void>;
  onClose: () => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s: string) => s.replace(/[^0-9]/g, '');

/**
 * Müşteri ekle/düzenle. Referanstaki 9 alan sadeleşti: "Fiyat Tanımı" ve "Fiyat Seçimi" tek "Fiyat
 * listesi" oldu; kişi tipi (Gerçek/Tüzel) seçilince kimlik alanı kendiliğinden "TC Kimlik No" ya da
 * "Vergi No" olur ve etiket "Ad Soyad" / "Ünvan" olur. Cari tipi ve kart anlaşması seyrek
 * kullanıldığı için "Gelişmiş" altında katlıdır.
 */
export function CustomerFormSheet({ customer, onSave, onClose }: CustomerFormSheetProps) {
  const choices = useCustomerChoices();
  const [draft, setDraft] = useState<CustomerDraft>(() =>
    customer
      ? {
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
        }
      : emptyCustomerDraft(),
  );
  const [errors, setErrors] = useState<
    Partial<Record<'name' | 'phone' | 'email' | 'taxId', string>>
  >({});
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const touched = useRef(new Set<keyof CustomerDraft>());

  useEffect(() => {
    if (customer) return;
    let active = true;
    void Promise.all([
      siteService.loadSettings('site_defaults'),
      apiRequest<PriceListDto[]>('/api/cari-stok/fiyat-listeleri').catch(() => []),
      apiRequest<NameItemDto[]>('/api/cari-stok/cari-tipleri').catch(() => []),
    ])
      .then(([settings, priceLists, customerTypes]) => {
        if (!active) return;
        const values = settings.values;
        const configuredPrice = values.fiyatTanimi?.trim();
        const price = priceLists.find(
          (item) => item.id === configuredPrice || item.name === configuredPrice,
        );
        const configuredType = values.cariTipi?.trim();
        const type = customerTypes.find(
          (item) => item.id === configuredType || item.name === configuredType,
        );
        setDraft((current) => ({
          ...current,
          ...(!touched.current.has('priceList') && price ? { priceList: price.name } : {}),
          ...(!touched.current.has('priceList') && configuredPrice && !price
            ? { priceList: configuredPrice }
            : {}),
          ...(!touched.current.has('customerType') && type ? { customerType: type.name } : {}),
          ...(!touched.current.has('customerType') && configuredType && !type
            ? { customerType: configuredType }
            : {}),
          ...(!touched.current.has('kind') &&
          ['gercek', 'real'].includes(values.musteriTipi?.toLocaleLowerCase('tr') ?? '')
            ? { kind: 'real' as const }
            : {}),
          ...(!touched.current.has('kind') &&
          ['tuzel', 'corporate'].includes(values.musteriTipi?.toLocaleLowerCase('tr') ?? '')
            ? { kind: 'corporate' as const }
            : {}),
        }));
      })
      .catch(() => undefined); // Varsayılan ayarlar isteğe bağlıdır; yeni müşteri formu yine açılabilir.
    return () => {
      active = false;
    };
  }, [customer]);

  const set = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) => {
    touched.current.add(key);
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const corporate = draft.kind === 'corporate';
  const idLength = corporate ? 10 : 11;

  const submit = async () => {
    if (saving) return;
    const next: typeof errors = {};
    if (draft.name.trim() === '') next.name = corporate ? 'Ünvan gerekli.' : 'Ad soyad gerekli.';
    if (digits(draft.phone).length < 10) next.phone = 'Geçerli bir telefon numarası yazın.';
    if (!EMAIL.test(draft.email.trim())) next.email = 'Geçerli bir e-posta adresi yazın.';
    if (draft.taxId !== '' && digits(draft.taxId).length !== idLength)
      next.taxId = `${corporate ? 'Vergi no' : 'TC kimlik no'} ${idLength} haneli olmalı.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ ...draft, name: draft.name.trim(), email: draft.email.trim() });
    } catch (e) {
      setSaveError(dataError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      permission="save"
      open
      onClose={onClose}
      size="lg"
      title={customer ? 'Müşteriyi Düzenle' : 'Müşteri Ekle'}
    >
      <div className="flex flex-col gap-5">
        {saveError ? <Alert tone="error">{saveError}</Alert> : null}
        {choices.error ? <Alert tone="error">{choices.error}</Alert> : null}

        <Segmented
          label="Kişi tipi"
          value={draft.kind}
          options={[
            { value: 'real', label: 'Gerçek Kişi' },
            { value: 'corporate', label: 'Tüzel Kişi (Firma)' },
          ]}
          onChange={(v) => set('kind', v as CustomerDraft['kind'])}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={corporate ? 'Ünvan' : 'Ad Soyad'}
            value={draft.name}
            error={errors.name}
            maxLength={160}
            onChange={(e) => set('name', e.target.value)}
          />
          <TextField
            label={corporate ? 'Vergi No (isteğe bağlı)' : 'TC Kimlik No (isteğe bağlı)'}
            numeric="integer"
            value={draft.taxId}
            error={errors.taxId}
            maxLength={idLength}
            onChange={(e) => set('taxId', e.target.value)}
          />
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
          <SelectField
            label="Fiyat listesi"
            options={Array.from(new Set([...choices.priceLists, draft.priceList])).map((p) => ({
              value: p,
              label: p,
            }))}
            value={draft.priceList}
            onChange={(v) => set('priceList', v)}
          />
          <TextField
            label="Müşteri kodu (isteğe bağlı)"
            value={draft.code}
            maxLength={40}
            onChange={(e) => set('code', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <MultiSelectField
            label="Ödeme şekilleri"
            options={Array.from(new Set([...choices.payments, ...draft.payments])).map((p) => ({ id: p, name: p }))}
            value={draft.payments}
            onChange={(v) => set('payments', v)}
          />
          <p className="px-2 text-sm text-ink-muted">
            Boş bırakılırsa aktif ödeme şekillerinin hepsi kullanılır.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-brand-ink"
        >
          Gelişmiş
          <ChevronDown
            className={`size-4 transition-transform ${advanced ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {advanced ? (
          <div className="grid animate-fade-in gap-4 md:grid-cols-2">
            <SelectField
              label="Cari tipi"
              options={Array.from(new Set([...choices.customerTypes, draft.customerType])).map((t) => ({
                value: t,
                label: t,
              }))}
              value={draft.customerType}
              onChange={(v) => set('customerType', v)}
            />
            <TextField
              label="Kart anlaşması (isteğe bağlı)"
              value={draft.cardDeal}
              maxLength={80}
              onChange={(e) => set('cardDeal', e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row-reverse">
          <Button
            flow={false}
            loading={saving}
            loadingLabel="Kaydediliyor…"
            onClick={() => void submit()}
          >
            Kaydet
          </Button>
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
