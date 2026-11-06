/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca servis katmanı (features/deals/services) içe aktarır.
 * Liste sırası = fırsatların gösterim sırasıdır.
 * Demo ikonları, kullanıcının yükleyeceği görseller yerine kodla çizilmiş küçük SVG'lerdir.
 */
import type { Deal, DealProductRef } from '../features/deals/types';
import { productSeeds } from './brand.mock';

type DealSeed = Omit<Deal, 'productCount'>;

/** Metinli renkli rozet çizer ve `data:` adresi olarak döndürür (yüklenmiş ikon taklidi). */
function badge(shape: string, fill: string, text: string, font = 18): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="${fill}">${shape}</g>` +
    `<text x="32" y="${32 + font * 0.35}" text-anchor="middle" fill="#fff" font-weight="900" ` +
    `font-size="${font}" font-family="system-ui,sans-serif">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const STAR =
  '<polygon points="32,2 38,12 50,8 51,20 62,24 56,34 62,44 51,48 50,60 38,55 32,62 26,55 14,60 13,48 2,44 8,34 2,24 13,20 14,8 26,12"/>';
const CIRCLE = '<circle cx="32" cy="32" r="30"/>';
const TAG =
  '<path d="M6 14a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H38l-6 10-6-10H12a6 6 0 0 1-6-6z"/>';

const deal = (
  id: string,
  name: string,
  iconUrl: string | null,
  extra: Partial<DealSeed> = {},
): DealSeed => ({
  id,
  name,
  iconUrl,
  active: true,
  showOnImage: true,
  position: 'tl',
  size: 'medium',
  seoTitle: name,
  seoDescription: '',
  ...extra,
});

export const dealSeeds: DealSeed[] = [
  deal('yeni', 'Yeni Ürünler', badge(STAR, '#3f86c8', 'YENİ', 15), { position: 'tl' }),
  deal('cok-satan', 'Çok Satanlar', badge(CIRCLE, '#f08a14', 'ÇOK SATAN', 11), { position: 'tr' }),
  deal('indirim-10', '%10 İndirim', badge(TAG, '#e5251d', '%10', 17), {
    position: 'bl',
    size: 'small',
  }),
  deal('indirim-20', '%20 İndirim', badge(TAG, '#e5251d', '%20', 17), {
    position: 'bl',
    size: 'small',
  }),
  deal('indirim-30', '%30 İndirim', badge(TAG, '#e5251d', '%30', 17), {
    position: 'bl',
    size: 'small',
  }),
  deal('acilis', 'Açılışa Özel', null, { active: false, showOnImage: false }),
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
