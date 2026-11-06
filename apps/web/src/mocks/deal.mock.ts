/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca servis katmanı (features/deals/services) içe aktarır.
 * Liste sırası = fırsatların gösterim sırasıdır.
 */
import type { Deal, DealProductRef } from '../features/deals/types';
import { productSeeds } from './brand.mock';

type DealSeed = Omit<Deal, 'productCount'>;

const deal = (
  id: string,
  name: string,
  icon: DealSeed['icon'],
  badgeText: string,
  extra: Partial<DealSeed> = {},
): DealSeed => ({
  id,
  name,
  icon,
  badgeText,
  active: true,
  showOnImage: true,
  position: 'tl',
  size: 'medium',
  seoTitle: name,
  seoDescription: '',
  ...extra,
});

const preset = (key: 'yeni' | 'cok-satan' | 'indirim' | 'firsat' | 'yildiz') =>
  ({ type: 'preset', key }) as const;

export const dealSeeds: DealSeed[] = [
  deal('yeni', 'Yeni Ürünler', preset('yeni'), 'YENİ', { position: 'tl' }),
  deal('cok-satan', 'Çok Satanlar', preset('cok-satan'), 'ÇOK SATAN', { position: 'tr' }),
  deal('indirim-10', '%10 İndirim', preset('indirim'), '%10', { position: 'bl', size: 'small' }),
  deal('indirim-20', '%20 İndirim', preset('indirim'), '%20', { position: 'bl', size: 'small' }),
  deal('indirim-30', '%30 İndirim', preset('indirim'), '%30', { position: 'bl', size: 'small' }),
  deal('acilis', 'Açılışa Özel', preset('yildiz'), '★', {
    active: false,
    showOnImage: false,
  }),
];

/** Ürünler: marka ekranındaki ürünlerle aynı, fırsatları farklı dağıtılmış. */
const spread: string[][] = [
  ['yeni'],
  ['yeni', 'indirim-10'],
  ['cok-satan'],
  [],
  ['indirim-20'],
  ['yeni'],
];

export const dealProductSeeds: DealProductRef[] = productSeeds.map((p, i) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  barcode: p.barcode,
  dealIds: [...(spread[i % spread.length] ?? [])],
}));
