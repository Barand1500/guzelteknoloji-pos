import {
  CalendarRange,
  Download,
  Layers,
  ListChecks,
  Package,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { PickList } from '../../../components/ui/PickList';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { WizardSteps } from '../../products/components/WizardSteps';
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMNS,
  distinctProducts,
  ordersToCsv,
  selectForExport,
  type ExportColumnKey,
  type ExportScope,
} from '../order-filter';
import { STATUS_LABEL, STATUS_ORDER, type Order, type OrderStatus } from '../types';

const STEPS = ['Ne indirilsin?', 'Neler olsun?', 'Onayla'] as const;

type ScopeKind = ExportScope['kind'];
const OPTIONS: { kind: ScopeKind; icon: LucideIcon; title: string; hint: string }[] = [
  {
    kind: 'list',
    icon: ListChecks,
    title: 'Listedeki siparişler',
    hint: 'Süzgeç ve aramanın sonucu',
  },
  { kind: 'all', icon: Layers, title: 'Tüm siparişler', hint: 'Hiçbir süzgeç uygulanmadan' },
  {
    kind: 'product',
    icon: Package,
    title: 'Belirli bir ürün',
    hint: 'O ürünün geçtiği siparişler',
  },
  { kind: 'status', icon: Truck, title: 'Belirli bir durum', hint: 'Örn. yalnızca kargodakiler' },
  {
    kind: 'range',
    icon: CalendarRange,
    title: 'Belirli bir tarih aralığı',
    hint: 'Başlangıç ve bitiş seç',
  },
];

function save(csv: string) {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'siparisler.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface OrderExportSheetProps {
  orders: Order[];
  /** Süzgeç ve aramanın uygulandığı güncel liste. */
  listed: Order[];
  onClose: () => void;
}

/**
 * Dışa aktarma sihirbazı: 1) Ne indirilsin (listedekiler, hepsi, belirli ürün/durum/tarih),
 * 2) Hangi sütunlar, 3) özet ve indir. Dosya, Excel'in açtığı CSV'dir.
 */
export function OrderExportSheet({ orders, listed, onClose }: OrderExportSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<ScopeKind>('list');
  const products = distinctProducts(orders);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OrderStatus>('delivered');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [columns, setColumns] = useState<ExportColumnKey[]>(DEFAULT_EXPORT_COLUMNS);

  const scope: ExportScope =
    kind === 'product'
      ? { kind, code }
      : kind === 'status'
        ? { kind, status }
        : kind === 'range'
          ? { kind, from, to }
          : { kind };
  const chosen = selectForExport(orders, listed, scope);
  const ready = kind !== 'product' || code !== '';

  const toggle = (key: ExportColumnKey) =>
    setColumns((cols) =>
      cols.includes(key)
        ? cols.length > 1
          ? cols.filter((c) => c !== key)
          : cols
        : [...cols, key],
    );

  return (
    <Sheet open onClose={onClose} title="Siparişleri Dışa Aktar" size="lg">
      <div className="flex flex-col gap-5">
        <WizardSteps steps={STEPS} current={step} />

        {step === 1 ? (
          <>
            <div
              role="radiogroup"
              aria-label="Ne indirilsin"
              className="grid gap-2.5 sm:grid-cols-2"
            >
              {OPTIONS.map((o) => {
                const Icon = o.icon;
                const on = kind === o.kind;
                return (
                  <button
                    key={o.kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setKind(o.kind)}
                    className={[
                      'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200',
                      on
                        ? 'border-brand-600 bg-brand-50 shadow-soft'
                        : 'border-line bg-surface hover:border-brand-500/60',
                    ].join(' ')}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink'}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{o.title}</span>
                      <span className="block text-sm text-ink-muted">{o.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {kind === 'product' ? (
              <PickList
                label="Ürün seç"
                options={products.map((p) => ({ value: p.code, label: p.name }))}
                value={code}
                onChange={setCode}
              />
            ) : null}
            {kind === 'status' ? (
              <div role="radiogroup" aria-label="Durum" className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => setStatus(s)}
                    className={[
                      'min-h-11 rounded-full border px-4 text-sm font-bold transition-colors',
                      status === s
                        ? 'border-brand-600 bg-brand-700 text-white'
                        : 'border-field-border text-ink-muted hover:border-brand-500',
                    ].join(' ')}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            ) : null}
            {kind === 'range' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Başlangıç tarihi"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <TextField
                  label="Bitiş tarihi"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            ) : null}

            <p className="text-sm text-ink-muted" aria-live="polite">
              <b className="text-ink">{chosen.length} sipariş</b> seçildi.
            </p>
            <Button
              flow={false}
              disabled={!ready || chosen.length === 0}
              onClick={() => setStep(2)}
            >
              Devam
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <div role="group" aria-label="Sütunlar" className="flex flex-wrap gap-2">
              {EXPORT_COLUMNS.map((c) => {
                const on = columns.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggle(c.key)}
                    className={[
                      'min-h-11 rounded-full border px-4 text-sm font-bold transition-colors',
                      on
                        ? 'border-brand-600 bg-brand-50 text-brand-ink'
                        : 'border-field-border text-ink-muted hover:border-brand-500',
                    ].join(' ')}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button flow={false} onClick={() => setStep(3)}>
                Devam
              </Button>
              <Button variant="outline" flow={false} onClick={() => setStep(1)}>
                Geri
              </Button>
            </div>
          </>
        ) : (
          <>
            <dl className="grid gap-2 rounded-2xl bg-surface-muted/70 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">İçerik</dt>
                <dd className="font-bold">{OPTIONS.find((o) => o.kind === kind)!.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sipariş</dt>
                <dd className="font-bold">{chosen.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Sütun</dt>
                <dd className="font-bold">{columns.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Dosya</dt>
                <dd className="font-bold">siparisler.csv (Excel)</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                leadingIcon={<Download className="size-5" aria-hidden="true" />}
                onClick={() => {
                  save(ordersToCsv(chosen, columns));
                  onClose();
                }}
              >
                İndir
              </Button>
              <Button variant="outline" flow={false} onClick={() => setStep(2)}>
                Geri
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
