import { CreditCard, LayoutDashboard, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { useSession } from '../../auth/hooks/session-context';
import { firstNameOf } from '../../app-shell/greeting-text';
import { hasDevAccess } from '../../dev-login/devAccess';
import { useHome } from '../hooks/useHome';
import type { HomePeriod } from '../types';
import { OrderStatusRing, PaymentMix, RevenueChart } from './HomeCharts';
import { HomeHero, StatTiles } from './HomeHero';
import { ProductRanks, RecentOrders } from './HomeLists';
import { Block, Card } from './parts';

/** Anasayfa bloklarının kimlikleri: alttaki yüzen çubuk bunlara kayar (bkz. HomeDock). */
export const HOME_BLOCKS = [
  { id: 'ozet', label: 'Özet', icon: LayoutDashboard },
  { id: 'gelir', label: 'Gelir', icon: TrendingUp },
  { id: 'siparisler', label: 'Sipariş', icon: ShoppingBag },
  { id: 'odemeler', label: 'Ödeme', icon: CreditCard },
  { id: 'urunler', label: 'Ürün', icon: Package },
] as const;

const PERIOD_HINT: Record<HomePeriod, string> = {
  today: 'Bugün',
  week: 'Bu hafta',
  month: 'Bu ay',
  year: 'Bu yıl',
  all: 'Tüm zamanlar',
};

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-64 animate-pulse rounded-[2rem] bg-surface-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[1.75rem] bg-surface-muted" />
    </div>
  );
}

/**
 * Anasayfa: günün saatine göre renklenen karşılama kartı (dönem seçici + ciro), dört sayı kutusu,
 * gelir grafiği, sipariş durumu, son siparişler, ödeme dağılımı ve ürün sıralamaları. Veri
 * sunucudan (`/api/anasayfa`) döneme göre gelir. Sayılar akar, çubuklar büyür; hareketi azalt
 * ayarında hepsi anında görünür.
 */
export function HomeView() {
  const [period, setPeriod] = useState<HomePeriod>('month');
  const { data, error, refresh } = useHome(period);
  const { session } = useSession();
  const name =
    session.status === 'authenticated'
      ? firstNameOf(session.user)
      : hasDevAccess()
        ? 'Test Kullanıcısı'
        : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      {error ? (
        <Alert tone="error">
          {error}
          <button type="button" className="ml-3 underline" onClick={refresh}>
            Tekrar Dene
          </button>
        </Alert>
      ) : null}

      <Block
        id="ozet"
        title="Özet"
        icon={<LayoutDashboard className="size-4" aria-hidden="true" />}
      >
        <HomeHero name={name} data={data} period={period} onPeriod={setPeriod} />
        {data ? <StatTiles stats={data.stats} /> : null}
      </Block>

      {!data ? (
        error ? null : (
          <Skeleton />
        )
      ) : (
        <>
          <Block
            id="gelir"
            title="Gelir"
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
          >
            <Card title="Gelir Raporu" hint={PERIOD_HINT[period]}>
              <RevenueChart points={data.revenue} version={period} />
            </Card>
          </Block>

          <Block
            id="siparisler"
            title="Siparişler"
            icon={<ShoppingBag className="size-4" aria-hidden="true" />}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Sipariş Durumu" hint={PERIOD_HINT[period]}>
                <OrderStatusRing orders={data.orders} />
              </Card>
              <Card title="Son Siparişler" hint="En yeniden eskiye">
                <RecentOrders orders={data.recentOrders.slice(0, 5)} />
              </Card>
            </div>
          </Block>

          <Block
            id="odemeler"
            title="Ödemeler"
            icon={<CreditCard className="size-4" aria-hidden="true" />}
          >
            <Card title="Ödeme Şekilleri" hint="Tüm siparişlerin dağılımı">
              <PaymentMix payments={data.payments} />
            </Card>
          </Block>

          <Block
            id="urunler"
            title="Ürünler"
            icon={<Package className="size-4" aria-hidden="true" />}
          >
            <Card title="Ürün Hareketleri" hint="Şu anda en çok ilgi görenler">
              <ProductRanks ranks={data.productRanks} />
            </Card>
          </Block>
        </>
      )}
    </div>
  );
}
