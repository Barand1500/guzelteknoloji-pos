import { ChevronDown, GripVertical, Star, Truck } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SortableList } from '../../../components/ui/SortableList';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError } from '../../../lib/catalog-data';
import { usePublishAddAction } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { usePayments } from '../hooks/usePayments';
import type { PaymentMethod } from '../types';
import { MethodIcon } from './MethodIcon';
import { PaymentEditor } from './PaymentEditor';
import { PaymentPreview } from './PaymentPreview';

/**
 * Ödeme Şekilleri. Sıra numarası kutuları ve "Sıralama Kaydet" düğmesi yerine kartlar SÜRÜKLENEREK sıralanır
 * (sıra anında kaydolur; masaüstünde ⠿ tutamağından, telefonda basılı tutarak). Karta basınca düzenleyici açılır,
 * alttaki "+" yeni ekler. Yanda (telefonda altta) müşterinin göreceği ödeme ekranı canlı önizlenir.
 */
export function PaymentsPage() {
  const store = usePayments();
  const [open, setOpen] = useState<string | null>(null); // 'new' | kimlik
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePublishAddAction('Ödeme Şekli Ekle', () => setOpen('new'));

  if (store.error && !store.items) return <Alert tone="error">{store.error}</Alert>;
  if (!store.items) return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;
  const items = store.items;

  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setProblem(dataError(e)));

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {open === 'new' ? (
            <section
              aria-label="Yeni ödeme şekli"
              className="animate-rise-in overflow-hidden rounded-3xl border border-brand-500/40 bg-surface-raised shadow-soft"
            >
              <p className="px-4 pt-4 text-lg font-extrabold">Yeni Ödeme Şekli</p>
              <PaymentEditor method={null} store={store} onClose={() => setOpen(null)} />
            </section>
          ) : null}

          <SortableList
            label="Ödeme şekilleri"
            items={items}
            getId={(m) => m.id}
            getLabel={(m) => m.name}
            disabled={open !== null}
            onReorder={(next) => void run(store.reorder(next))}
            renderItem={(m, ctx) => {
              const on = open === m.id;
              return (
                <div
                  className={`overflow-hidden rounded-3xl border bg-surface-raised transition-colors ${on ? 'border-brand-500/50 shadow-soft' : 'border-line'} ${m.active ? '' : 'opacity-70'}`}
                >
                  <div className="flex items-center gap-1 pr-2 pl-1">
                    <button
                      type="button"
                      {...ctx.handleProps}
                      className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted active:cursor-grabbing"
                    >
                      <GripVertical className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-expanded={on}
                      aria-label={`${m.name} düzenle`}
                      onClick={() => setOpen(on ? null : m.id)}
                      className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 rounded-2xl py-2 text-left"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
                        <MethodIcon method={m} className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-lg leading-tight font-extrabold">{m.name}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink-muted">
                          <span className="tabular-nums">#{ctx.index + 1}</span>
                          {m.isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-ink">
                              <Star className="size-3 fill-current" aria-hidden="true" />
                              <span className="max-sm:sr-only">Varsayılan</span>
                            </span>
                          ) : null}
                          {m.noShipping ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-success">
                              <Truck className="size-3" aria-hidden="true" />
                              <span className="max-sm:sr-only">Kargo yok</span>
                            </span>
                          ) : null}
                          {m.priceList ? (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5">{m.priceList}</span>
                          ) : null}
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-5 shrink-0 text-ink-muted transition-transform duration-300 ${on ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    <ToggleSwitch
                      label={`${m.name} aktif`}
                      checked={m.active}
                      onChange={(v) => void run(store.setActive(m.id, v))}
                    />
                  </div>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      {on ? (
                        <PaymentEditor
                          method={m}
                          store={store}
                          onClose={() => setOpen(null)}
                          onDelete={() => setDeleting(m)}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        <div className="lg:sticky lg:top-4">
          <PaymentPreview items={items} />
        </div>
      </div>

      <ConfirmSheet
        open={deleting !== null}
        danger
        title={`${deleting?.name ?? ''} Silinsin Mi?`}
        description="Ödeme şekli silinir; müşterilerin özel seçimlerinden de kalkar."
        confirmLabel="Sil"
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d) {
            setOpen(null);
            void run(store.remove(d.id));
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
