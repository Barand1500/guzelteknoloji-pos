import { Building2, CircleDollarSign, KeyRound, ListOrdered, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { Choice, Section } from '../../orders/components/OrderFilterSheet';
import { emptyCustomerFilters, filterCustomers, type CustomerFilters } from '../customer-filter';
import { KIND_LABEL, PRICE_LISTS, type Customer } from '../types';

interface CustomerFilterSheetProps {
  rows: Customer[];
  value: CustomerFilters;
  onApply: (next: CustomerFilters) => void;
  onClose: () => void;
}

/** Süzgeçler penceresi (diğer sayfalarla aynı dil): kişi tipi, giriş, hesap durumu, fiyat listesi. */
export function CustomerFilterSheet({ rows, value, onApply, onClose }: CustomerFilterSheetProps) {
  const [draft, setDraft] = useState<CustomerFilters>(value);
  const set = <K extends keyof CustomerFilters>(key: K, v: CustomerFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));
  const count = filterCustomers(rows, draft).length;

  return (
    <Sheet open onClose={onClose} title="Süzgeçler" size="lg">
      <div className="flex flex-col gap-6">
        <Section icon={User} title="Kişi tipi">
          <div role="radiogroup" aria-label="Kişi tipi" className="flex flex-wrap gap-2">
            <Choice on={draft.kind === 'all'} onClick={() => set('kind', 'all')}>
              Hepsi
            </Choice>
            <Choice on={draft.kind === 'real'} onClick={() => set('kind', 'real')} icon={User}>
              {KIND_LABEL.real}
            </Choice>
            <Choice
              on={draft.kind === 'corporate'}
              onClick={() => set('kind', 'corporate')}
              icon={Building2}
            >
              {KIND_LABEL.corporate}
            </Choice>
          </div>
        </Section>

        <Section icon={KeyRound} title="Giriş durumu">
          <div role="radiogroup" aria-label="Giriş durumu" className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Hepsi'],
                ['active', 'Girişe açık'],
                ['passive', 'Pasif'],
              ] as const
            ).map(([v, label]) => (
              <Choice key={v} on={draft.status === v} onClick={() => set('status', v)}>
                {label}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={CircleDollarSign} title="Hesap durumu">
          <div role="radiogroup" aria-label="Hesap durumu" className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Hepsi'],
                ['debtor', 'Bize borcu var'],
                ['creditor', 'Alacağı var'],
              ] as const
            ).map(([v, label]) => (
              <Choice key={v} on={draft.balance === v} onClick={() => set('balance', v)}>
                {label}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={ListOrdered} title="Fiyat listesi">
          <div role="radiogroup" aria-label="Fiyat listesi" className="flex flex-wrap gap-2">
            <Choice on={draft.priceList === 'all'} onClick={() => set('priceList', 'all')}>
              Hepsi
            </Choice>
            {PRICE_LISTS.map((p) => (
              <Choice key={p} on={draft.priceList === p} onClick={() => set('priceList', p)}>
                {p}
              </Choice>
            ))}
          </div>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-row-reverse gap-3 border-t border-line bg-surface-raised px-6 pt-3 pb-4 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
          <Button
            flow={false}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {count} Müşteriyi Göster
          </Button>
          <Button
            variant="outline"
            flow={false}
            onClick={() => setDraft((d) => ({ ...emptyCustomerFilters, query: d.query }))}
          >
            Sıfırla
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
