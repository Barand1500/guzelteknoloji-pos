/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/shipping/services içe aktarır.
 */
import type {
  Carrier,
  DefItem,
  ListKey,
  LocationNode,
  ShippingData,
  Tier,
} from '../features/shipping/types';

const tiers = (rows: [number | null, number][], perUnit = false): Tier[] =>
  rows.map(([to, price], i) => ({ to, price, perUnit: perUnit && i === rows.length - 1 }));

const carriers: Carrier[] = [
  {
    id: 'f1',
    name: 'DHL eCommerce',
    shortName: 'DHL',
    apiUrl: 'https://api.dhlecommerce.example/v2',
    prices: {
      vat: 20,
      desi: tiers(
        [
          [0, 113.9],
          [2, 143.52],
          [5, 160.49],
          [10, 194.36],
          [15, 245.16],
          [20, 291.73],
          [25, 342.57],
          [30, 389.11],
          [null, 13.96],
        ],
        true,
      ),
      weight: tiers([
        [5, 150],
        [20, 260],
        [null, 420],
      ]),
    },
  },
  {
    id: 'f2',
    name: 'Yurtiçi Kargo',
    shortName: 'YK',
    apiUrl: '',
    prices: {
      vat: 20,
      desi: tiers(
        [
          [2, 95],
          [5, 118],
          [10, 160],
          [null, 12.5],
        ],
        true,
      ),
      weight: tiers([[null, 180]]),
    },
  },
];

const node = (id: string, parentId: string | null, name: string, level: number): LocationNode => ({
  id,
  parentId,
  name,
  level,
});

const locations: LocationNode[] = [
  node('l1', null, 'Türkiye', 0),
  node('l2', 'l1', 'Adana', 1),
  node('l3', 'l1', 'Ankara', 1),
  node('l4', 'l1', 'İstanbul', 1),
  node('l5', 'l1', 'İzmir', 1),
  node('l6', 'l2', 'Ceyhan', 2),
  node('l7', 'l2', 'Seyhan', 2),
  node('l8', 'l2', 'Çukurova', 2),
  node('l9', 'l3', 'Çankaya', 2),
  node('l10', 'l3', 'Keçiören', 2),
  node('l11', 'l4', 'Kadıköy', 2),
  node('l12', 'l4', 'Beşiktaş', 2),
  node('l13', 'l4', 'Üsküdar', 2),
  node('l14', 'l6', 'Merkez', 3),
  node('l15', 'l6', 'Büyükmangıt', 3),
  node('l16', 'l14', 'Yılankale Mah.', 4),
  node('l17', 'l14', 'Cumhuriyet Mah.', 4),
  node('l18', 'l16', 'Atatürk Cad.', 5),
  node('l19', 'l16', 'İnönü Sok.', 5),
  node('l20', 'l11', 'Caferağa Mah.', 4),
];

const item = (id: string, title: string, short = '', text = ''): DefItem => ({ id, title, short, text });

const lists: Record<ListKey, DefItem[]> = {
  'gonderi-tipleri': [item('g1', 'Koli', 'KOL'), item('g2', 'Zarf', 'ZRF'), item('g3', 'Palet', 'PLT')],
  'kargo-tipleri': [
    item('k1', 'Standart Kargo', '', 'Siparişler 1-3 iş gününde kargoya verilir.'),
    item('k2', 'Hızlı Kargo', '', 'Saat 15:00’a kadar verilen siparişler aynı gün çıkar.'),
  ],
  'alim-sekilleri': [item('a1', 'Adresten Alım', '', 'Kurye adresinizden paketi teslim alır.')],
  'teslimat-sekilleri': [
    item('t1', 'Adrese Teslim', '', 'Kargo, siparişteki adrese teslim edilir.'),
    item('t2', 'Şubeden Teslim', '', 'Kargo, size en yakın şubeden alınır.'),
  ],
  'teslimat-modelleri': [],
  'ulastirma-turleri': [item('u1', 'Karayolu'), item('u2', 'Havayolu', '', 'Acil ve hafif gönderiler için.')],
  'yasak-kargolar': [
    item('y1', 'Parlayıcı Maddeler', '', 'Çakmak gazı, tiner ve benzeri maddeler gönderilemez.'),
    item('y2', 'Canlı Hayvan'),
  ],
};

export function shippingSeed(): ShippingData {
  return JSON.parse(JSON.stringify({ carriers, locations, lists })) as ShippingData;
}
