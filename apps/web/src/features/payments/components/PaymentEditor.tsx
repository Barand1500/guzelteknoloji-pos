import { Check, ImagePlus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { usePublishSaveAction } from '../../app-shell/save-action';
import { PRICE_LIST_OPTIONS } from '../../campaigns/types';
import type { PaymentStore } from '../hooks/usePayments';
import {
  PAYMENT_ICONS,
  draftOf,
  emptyPaymentDraft,
  type PaymentDraft,
  type PaymentMethod,
} from '../types';
import { ICONS, MethodIcon } from './MethodIcon';

const MAX_BYTES = 1024 * 1024;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/** Büyük, anlaşılır açma-kapama kutusu: başlık + tek satır açıklama. */
function FlagChip({
  on,
  onChange,
  title,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${on ? 'border-brand-600 bg-brand-50 shadow-soft' : 'border-field-border bg-surface hover:border-brand-500'}`}
    >
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-brand-700 bg-brand-700 text-white' : 'border-line-strong/60 text-transparent'}`}
      >
        <Check className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block font-extrabold ${on ? 'text-brand-ink' : ''}`}>{title}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </button>
  );
}

/**
 * Satırın içinde açılan düzenleyici (yeni ekleme de aynısıdır). "Kaydet" düğmesi yok: değişiklik olunca alttaki
 * yüzen adanın "+" düğmesi "Kaydet"e döner. Simge: hazır simgelerden biri ya da kendi görselin (en çok 1 MB).
 */
export function PaymentEditor({
  method,
  store,
  onClose,
  onDelete,
}: {
  method: PaymentMethod | null;
  store: PaymentStore;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const initial = method ? draftOf(method) : emptyPaymentDraft();
  const [draft, setDraft] = useState<PaymentDraft>(initial);
  const [nameError, setNameError] = useState<string | undefined>();
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof PaymentDraft>(k: K, v: PaymentDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = method ? JSON.stringify(draft) !== JSON.stringify(initial) : draft.name.trim() !== '';

  const save = async () => {
    if (saving) return;
    if (!draft.name.trim()) return setNameError('Ad gerekli.');
    setSaving(true);
    setProblem(null);
    try {
      await store.save({ ...draft, name: draft.name.trim() }, method?.id);
      onClose();
    } catch (e) {
      setProblem(dataError(e));
    } finally {
      setSaving(false);
    }
  };
  usePublishSaveAction(dirty ? { onSave: () => void save(), saving } : null);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setProblem('Yalnızca görsel dosyaları (PNG, JPG, WebP, SVG) yüklenebilir.');
    if (f.size > MAX_BYTES) return setProblem('Görsel en çok 1 MB olabilir.');
    setProblem(null);
    const r = new FileReader();
    r.onload = () => set('iconUrl', String(r.result));
    r.readAsDataURL(f);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-surface-muted/40 px-4 py-4">
      {problem ? (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Adı"
          value={draft.name}
          error={nameError}
          maxLength={60}
          onChange={(e) => {
            set('name', e.target.value);
            setNameError(undefined);
          }}
        />
        <SelectField
          label="Fiyat Seçimi"
          options={[
            { value: '', label: 'Müşterinin kendi listesi' },
            ...PRICE_LIST_OPTIONS.map((p) => ({ value: p, label: p })),
          ]}
          value={draft.priceList}
          onChange={(v) => set('priceList', v)}
        />
      </div>

      {/* Simge */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Simge</p>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Simge">
          {PAYMENT_ICONS.map((p) => {
            const Icon = ICONS[p.key];
            const on = !draft.iconUrl && draft.icon === p.key;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={p.label}
                title={p.label}
                onClick={() => setDraft((d) => ({ ...d, icon: p.key, iconUrl: null }))}
                className={`flex size-11 items-center justify-center rounded-2xl border transition-all ${on ? 'border-brand-600 bg-brand-700 text-white shadow-soft' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500'}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </button>
            );
          })}
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          {draft.iconUrl ? (
            <span className="relative">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-brand-600 bg-surface shadow-soft">
                <MethodIcon method={draft} className="size-7" />
              </span>
              <button
                type="button"
                aria-label="Yüklenen görseli kaldır"
                onClick={() => set('iconUrl', null)}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => file.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-dashed border-brand-500/60 px-3 text-sm font-bold text-brand-ink hover:bg-brand-50"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              Kendi görselim
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept={ACCEPT.join(',')}
            aria-label="Görsel yükle"
            className="hidden"
            onChange={(e) => {
              take(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <FlagChip
          on={draft.isDefault}
          onChange={(v) => set('isDefault', v)}
          title="Varsayılan"
          hint="Müşteriye özel seçim yoksa kullanılır"
        />
        <FlagChip
          on={draft.noShipping}
          onChange={(v) => set('noShipping', v)}
          title="Kargo hesaplanmasın"
          hint="Bu şekilde kargo ücreti yok"
        />
        <FlagChip
          on={draft.allowAdjust}
          onChange={(v) => set('allowAdjust', v)}
          title="İndirim ve ek ücret"
          hint="Havale indirimi, kart komisyonu gibi"
        />
      </div>

      {onDelete ? (
        <div className="flex justify-end">
          <button
            type="button"
            aria-label={`${method?.name ?? ''} sil`}
            onClick={onDelete}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-danger hover:bg-danger-soft"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Sil
          </button>
        </div>
      ) : null}
    </div>
  );
}
