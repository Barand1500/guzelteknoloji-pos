import {
  Banknote,
  CalendarDays,
  Check,
  Globe,
  Hand,
  Smartphone,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { emptyOrderFilters, filterOrders, type OrderFilters } from '../order-filter';
import { SOURCE_LABEL, type Order, type OrderSource } from '../types';

const SOURCE_ICON: Record<OrderSource, LucideIcon> = {
  web: Globe,
  mobile: Smartphone,
  marketplace: Store,
  manual: Hand,
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Hızlı tarih aralıkları (bugüne göre). */
function presets(now = new Date()) {
  const day = new Date(now);
  const week = new Date(now);
  week.setDate(week.getDate() - 6);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = new Date(now.getFullYear(), 0, 1);
  return [
    { id: 'today', label: 'Bugün', from: iso(day), to: iso(day) },
    { id: 'week', label: 'Son 7 gün', from: iso(week), to: iso(now) },
    { id: 'month', label: 'Bu ay', from: iso(month), to: iso(now) },
    { id: 'year', label: 'Bu yıl', from: iso(year), to: iso(now) },
  ];
}

function Choice({
  on,
  onClick,
  icon: Icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={[
        'inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-all duration-200',
        on
          ? 'border-brand-600 bg-brand-50 text-brand-ink shadow-soft'
          : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink',
      ].join(' ')}
    >
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
      {on ? <Check className="size-4" aria-hidden="true" /> : null}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2.5 text-sm font-extrabold">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-ink">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

interface OrderFilterSheetProps {
  orders: Order[];
  value: OrderFilters;
  onApply: (next: OrderFilters) => void;
  onClose: () => void;
}

/**
 * Süzgeçler penceresi (Ürünler'deki gibi): her bölümün simgesi ve hap seçenekleri var; kaynak,
 * ödeme, tarih (hazır aralıklar + kendi aralığın) ve tutar. Altta kaç siparişin göründüğü canlı
 * yazar; "Göster" uygular, "Sıfırla" hepsini temizler.
 */
export function OrderFilterSheet({ orders, value, onApply, onClose }: OrderFilterSheetProps) {
  const [draft, setDraft] = useState<OrderFilters>(value);
  const set = <K extends keyof OrderFilters>(key: K, v: OrderFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));
  const count = filterOrders(orders, draft).length;
  const ranges = presets();
  const activePreset = ranges.find((r) => r.from === draft.from && r.to === draft.to)?.id;

  return (
    <Sheet open onClose={onClose} title="Süzgeçler" size="lg">
      <div className="flex flex-col gap-6">
        <Section icon={Globe} title="Kaynak">
          <div role="radiogroup" aria-label="Kaynak" className="flex flex-wrap gap-2">
            <Choice on={draft.source === 'all'} onClick={() => set('source', 'all')}>
              Hepsi
            </Choice>
            {(Object.keys(SOURCE_LABEL) as OrderSource[]).map((s) => (
              <Choice
                key={s}
                on={draft.source === s}
                onClick={() => set('source', s)}
                icon={SOURCE_ICON[s]}
              >
                {SOURCE_LABEL[s]}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={Wallet} title="Ödeme durumu">
          <div role="radiogroup" aria-label="Ödeme durumu" className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Hepsi'],
                ['paid', 'Ödendi'],
                ['unpaid', 'Ödenmedi'],
              ] as const
            ).map(([v, label]) => (
              <Choice key={v} on={draft.paid === v} onClick={() => set('paid', v)}>
                {label}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={CalendarDays} title="Tarih">
          <div role="radiogroup" aria-label="Hazır tarih aralığı" className="flex flex-wrap gap-2">
            <Choice
              on={!draft.from && !draft.to}
              onClick={() => setDraft((d) => ({ ...d, from: '', to: '' }))}
            >
              Tümü
            </Choice>
            {ranges.map((r) => (
              <Choice
                key={r.id}
                on={activePreset === r.id}
                onClick={() => setDraft((d) => ({ ...d, from: r.from, to: r.to }))}
              >
                {r.label}
              </Choice>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Başlangıç tarihi"
              type="date"
              value={draft.from}
              onChange={(e) => set('from', e.target.value)}
            />
            <TextField
              label="Bitiş tarihi"
              type="date"
              value={draft.to}
              onChange={(e) => set('to', e.target.value)}
            />
          </div>
        </Section>

        <Section icon={Banknote} title="Tutar (KDV dahil)">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="En düşük tutar"
              numeric="decimal"
              value={draft.min}
              onChange={(e) => set('min', e.target.value)}
            />
            <TextField
              label="En yüksek tutar"
              numeric="decimal"
              value={draft.max}
              onChange={(e) => set('max', e.target.value)}
            />
          </div>
        </Section>

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row-reverse">
          <Button
            flow={false}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {count} Siparişi Göster
          </Button>
          <Button
            variant="outline"
            flow={false}
            onClick={() =>
              setDraft((d) => ({ ...emptyOrderFilters, query: d.query, status: d.status }))
            }
          >
            Sıfırla
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
