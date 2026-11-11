import { ListChecks, MapPin, Truck } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { usePublishDockTabs } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useShipping } from '../hooks/useShipping';
import { CarriersTab } from './CarriersTab';
import { DefinitionsTab } from './DefinitionsTab';
import { LocationsTab } from './LocationsTab';

/** Alttaki yüzen ada: ilk ikisi "+" düğmesinin soluna, sonuncusu sağına dizilir. */
const TABS = [
  { id: 'firmalar', label: 'Firmalar', icon: Truck },
  { id: 'lokasyonlar', label: 'Lokasyonlar', icon: MapPin },
  { id: 'tanimlar', label: 'Tanımlar', icon: ListChecks },
];

/**
 * Tanımlamalar › Kargo ve Nakliye. Referanstaki 9 sekme 3 gruba indi (Firmalar, Lokasyonlar, Tanımlar);
 * sekmeler alttaki yüzen adadadır ve adanın ortasındaki "+" açık sekmeye göre Firma / İl / Gönderi Tipi… ekler.
 * Açık sekme adreste tutulur (?sekme=…).
 */
export function ShippingPage() {
  const store = useShipping();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'firmalar';
  usePublishDockTabs({
    items: TABS,
    value: tab,
    split: 2,
    onChange: (id) => setParams(id === 'firmalar' ? {} : { sekme: id }, { replace: true }),
  });

  if (store.error && !store.data) return <Alert tone="error">{store.error}</Alert>;
  if (!store.data)
    return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      <div key={tab} role="region" aria-label={TABS.find((t) => t.id === tab)?.label} className="animate-fade-in">
        {tab === 'firmalar' ? (
          <CarriersTab store={store} />
        ) : tab === 'lokasyonlar' ? (
          <LocationsTab store={store} />
        ) : (
          <DefinitionsTab store={store} />
        )}
      </div>
    </div>
  );
}
