/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu klasör (src/mocks) silinir.
 * Yalnızca servis katmanı (features/brands/services) içe aktarır.
 * Liste sırası = mağazadaki gösterim sırasıdır.
 */
import type { Brand, ProductRef } from '../features/brands/types';

type BrandSeed = Omit<Brand, 'productCount'>;

const brand = (id: string, name: string, active = true, description = ''): BrandSeed => ({
  id,
  name,
  description,
  logoUrl: null,
  active,
  seoTitle: name,
  seoDescription: '',
});

export const brandSeeds: BrandSeed[] = [
  brand('alatel', 'ALATEL', true, 'Terazi ve tartım çözümleri.'),
  brand('anypay', 'ANYPAY'),
  brand('asys', 'ASYS', true, 'Barkod okuyucu ve yazıcılar.'),
  brand('banknotemaster', 'BANKNOTEMASTER'),
  brand('bmt', 'BMT'),
  brand('bmx', 'BMX', false),
  brand('bng-plus', 'BNG PLUS'),
  brand('cas', 'CAS', true, 'Market terazileri.'),
  brand('flexypos', 'FLEXYPOS', true, 'Dokunmatik POS ve yazarkasa sistemleri.'),
  brand('idata', 'IDATA', true, 'Android el terminalleri.'),
];

export const productSeeds: ProductRef[] = [
  {
    id: 'p1',
    code: 'FLEXYPOS.FP-503',
    name: 'FLEXYPOS FP-503 İ3-15.6" Dokunmatik POS',
    barcode: '8690000000011',
    brandId: 'flexypos',
  },
  {
    id: 'p2',
    code: '2',
    name: 'FLEXYPOS FP-505 İ5-15.6" Dokunmatik POS',
    barcode: '8690000000028',
    brandId: 'flexypos',
  },
  {
    id: 'p3',
    code: '3',
    name: 'FLEXYPOS FP-503M İ3-15.6" Dokunmatik POS',
    barcode: '8690000000035',
    brandId: 'flexypos',
  },
  {
    id: 'p4',
    code: '4',
    name: 'FLEXYPOS FP-505M İ5-15.6" Dokunmatik POS',
    barcode: '8690000000042',
    brandId: 'flexypos',
  },
  {
    id: 'p5',
    code: '5',
    name: 'FLEXYPOS FP-705 İ5-17" Dokunmatik POS',
    barcode: '8690000000059',
    brandId: 'flexypos',
  },
  {
    id: 'p6',
    code: '6',
    name: 'FLEXYPOS FP-705M İ5-17" Dokunmatik POS',
    barcode: '8690000000066',
    brandId: null,
  },
  {
    id: 'p7',
    code: '7',
    name: 'FLEXYPOS FP-815 İ5-18.5" Dokunmatik POS',
    barcode: '8690000000073',
    brandId: null,
  },
  {
    id: 'p8',
    code: '8',
    name: 'FLEXYPOS FP-815M İ5-18.5" Dokunmatik POS',
    barcode: '8690000000080',
    brandId: 'flexypos',
  },
  {
    id: 'p9',
    code: '9',
    name: 'IDATA K1S IP65 Android El Terminali',
    barcode: '8690000000097',
    brandId: 'idata',
  },
  {
    id: 'p10',
    code: '10',
    name: 'IDATA T1 IP68 Android El Terminali',
    barcode: '8690000000103',
    brandId: 'idata',
  },
  {
    id: 'p11',
    code: 'ASYS-BR-1',
    name: 'ASYS Barkod Okuyucu 2D USB',
    barcode: '8690000000110',
    brandId: 'asys',
  },
  {
    id: 'p12',
    code: 'ASYS-FY-2',
    name: 'ASYS Fiş Yazıcı 80mm Termal',
    barcode: '8690000000127',
    brandId: 'asys',
  },
  {
    id: 'p13',
    code: 'CAS-PD-3',
    name: 'CAS PD-II Market Terazisi 30kg',
    barcode: '8690000000134',
    brandId: 'cas',
  },
  {
    id: 'p14',
    code: 'CAS-ER-4',
    name: 'CAS ER Plus Etiketli Terazi',
    barcode: '8690000000141',
    brandId: 'cas',
  },
  {
    id: 'p15',
    code: 'GEN-USB-5',
    name: 'USB Barkod Okuyucu Standart',
    barcode: '8690000000158',
    brandId: null,
  },
  {
    id: 'p16',
    code: 'GEN-KS-6',
    name: 'Kasa Çekmecesi 5 Bölmeli',
    barcode: '8690000000165',
    brandId: null,
  },
];
