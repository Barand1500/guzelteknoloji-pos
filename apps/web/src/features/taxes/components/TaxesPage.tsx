import { Landmark, Percent } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { usePublishDockTabs } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useTaxes } from '../hooks/useTaxes';
import { OfficesTab } from './OfficesTab';
import { TypesTab } from './TypesTab';

/** Alttaki yüzen ada: Vergiler solda, "+" ortada, Vergi Daireleri sağda (simetrik). */
const TABS = [
  { id: 'vergiler', label: 'Vergiler', icon: Percent },
  { id: 'daireler', label: 'Vergi Daireleri', icon: Landmark },
];

/**
 * Tanımlamalar › Vergiler. Referanstaki 3 sekme 2 sayfaya indi: "Vergiler" + "Vergi Türleri" tek sayfada
 * (tür kartları ve oran etiketleri), "Vergi Daireleri" ayrı sayfada. Adanın ortasındaki "+" açık sayfaya göre
 * Vergi Türü / Vergi Dairesi ekler. Açık sekme adreste tutulur (?sekme=daireler).
 */
export function TaxesPage() {
  const store = useTaxes();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'vergiler';
  usePublishDockTabs({
    items: TABS,
    value: tab,
    split: 1,
    onChange: (id) => setParams(id === 'vergiler' ? {} : { sekme: id }, { replace: true }),
  });

  if (store.error && !store.types) return <Alert tone="error">{store.error}</Alert>;
  if (!store.types) return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      <div key={tab} role="region" aria-label={TABS.find((t) => t.id === tab)?.label} className="animate-fade-in">
        {tab === 'vergiler' ? <TypesTab store={store} /> : <OfficesTab store={store} />}
      </div>
    </div>
  );
}
