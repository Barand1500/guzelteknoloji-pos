import { Package, Ruler, Tags, Users } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Alert } from '../../../components/ui/Alert';
import { usePublishDockTabs } from '../../app-shell/save-action';
import { SampleNote } from '../../orders/components/parts';
import { useStockDefs } from '../hooks/useStockDefs';
import { NameChips } from './NameChips';
import { PriceListsTab } from './PriceListsTab';
import { UnitsTab } from './UnitsTab';

/** Alttaki yüzen ada: iki sekme "+" düğmesinin soluna, iki sekme sağına (simetrik). */
const TABS = [
  { id: 'cari', label: 'Cari Tipleri', icon: Users },
  { id: 'stok', label: 'Stok Tipleri', icon: Package },
  { id: 'fiyat', label: 'Fiyat Listeleri', icon: Tags },
  { id: 'birim', label: 'Ölçü Birimleri', icon: Ruler },
];

/**
 * Tanımlamalar › Cari ve Stok Tanımları. Referanstaki dört sekme aynen durur ama her biri sade bir parçadır:
 * Cari/Stok tipleri yazı etiketleri, Fiyat Listeleri kartlar (varsayılan yıldızı, tarih çubuğu), Ölçü Birimleri hazır
 * birimli liste. Alttaki "+" açık sekmeye göre ekler. Açık sekme adreste tutulur (?sekme=…).
 */
export function StockDefsPage() {
  const store = useStockDefs();
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'cari';
  usePublishDockTabs({
    items: TABS,
    value: tab,
    split: 2,
    onChange: (id) => setParams(id === 'cari' ? {} : { sekme: id }, { replace: true }),
  });

  if (store.error && !store.data) return <Alert tone="error">{store.error}</Alert>;
  if (!store.data) return <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" aria-busy="true" />;

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      {store.sample ? <SampleNote /> : null}
      <div key={tab} role="region" aria-label={TABS.find((t) => t.id === tab)?.label} className="animate-fade-in">
        {tab === 'cari' ? (
          <NameChips
            list="cari-tipleri"
            store={store}
            items={store.data.cari}
            noun="Cari Tipi"
            hint="Müşterileri ve tedarikçileri gruplamak için (ör. Bayi, Son Kullanıcı). Etikete basınca adı değişir."
          />
        ) : tab === 'stok' ? (
          <NameChips
            list="stok-tipleri"
            store={store}
            items={store.data.stok}
            noun="Stok Tipi"
            hint="Ürün kartının türü (ör. Basit Ürün, Varyasyonlu Ürün). Etikete basınca adı değişir."
          />
        ) : tab === 'fiyat' ? (
          <PriceListsTab store={store} />
        ) : (
          <UnitsTab store={store} />
        )}
      </div>
    </div>
  );
}
