/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca servis katmanı (features/categories/services) içe aktarır.
 * Liste sırası = kardeş kategorilerin mağazadaki gösterim sırasıdır.
 */
import type { Category, CategoryProductRef } from '../features/categories/types';
import { productSeeds } from './brand.mock';

type CategorySeed = Omit<Category, 'productCount' | 'childCount'>;

const cat = (id: string, parentId: string | null, name: string, active = true): CategorySeed => ({
  id,
  parentId,
  name,
  description: '',
  imageUrl: null,
  active,
  hidden: false,
  seoTitle: name,
  seoDescription: '',
});

export const categorySeeds: CategorySeed[] = [
  cat('otvt', null, 'OT/VT Ürünleri'),
  cat('pos', 'otvt', 'Dokunmatik POS'),
  cat('kiosk', 'otvt', 'Fiyatgör ve Kiosk'),
  cat('el-terminali', 'otvt', 'El Terminalleri', false),
  cat('odeme', 'otvt', 'Ödeme Kaydediciler'),
  cat('yeni-nesil', 'odeme', 'Yeni Nesil Yazarkasa/POS'),
  cat('yazarkasa-aks', 'odeme', 'Yazarkasa/POS Aksesuarları'),
  cat('para-sayma', 'otvt', 'Para Sayma ve Kontrol'),
  cat('barkod-okuyucu', 'otvt', 'Barkod Okuyucular'),
  cat('yazici', 'otvt', 'Yazıcılar'),
  cat('pos-aks', 'otvt', 'POS Aksesuarları'),
  cat('tartim', null, 'Tartım ve Paketleme'),
  cat('terazi', 'tartim', 'Market Terazileri'),
  cat('paketleme', 'tartim', 'Paketleme Makineleri'),
  cat('cagri', null, 'Çağrı Sistemleri'),
  cat('sarf', null, 'Sarf Malzemeler'),
  cat('yazilim', null, 'Yazılım Çözümleri'),
];

/** Ürünler: marka ekranındaki ürünlerle aynı, kategorileri farklı dağıtılmış. */
const spread = [
  'pos',
  'pos',
  'pos',
  'kiosk',
  'yeni-nesil',
  'yeni-nesil',
  null,
  'barkod-okuyucu',
  'barkod-okuyucu',
  'barkod-okuyucu',
  'yazici',
  'terazi',
  'terazi',
  null,
  'sarf',
] as const;

export const categoryProductSeeds: CategoryProductRef[] = productSeeds.map((p, i) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  barcode: p.barcode,
  categoryId: spread[i % spread.length] ?? null,
}));
