/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/currencies/services içe aktarır.
 */
import { DEFAULT_API, type Currency } from '../features/currencies/types';

export const currencySeeds: Currency[] = [
  {
    id: 'p1',
    name: 'Türk Lirası',
    shortName: 'TL',
    symbol: '₺',
    base: true,
    rateType: 'efektifSatis',
    auto: false,
    rate: 1,
    apiUrl: '',
    active: true,
  },
  {
    id: 'p2',
    name: 'ABD Doları',
    shortName: 'USD',
    symbol: '$',
    base: false,
    rateType: 'efektifSatis',
    auto: true,
    rate: 50.3,
    apiUrl: DEFAULT_API,
    active: true,
  },
  {
    id: 'p3',
    name: 'Euro',
    shortName: 'EUR',
    symbol: '€',
    base: false,
    rateType: 'efektifSatis',
    auto: true,
    rate: 56.065,
    apiUrl: DEFAULT_API,
    active: true,
  },
  {
    id: 'p4',
    name: 'İngiliz Sterlini',
    shortName: 'GBP',
    symbol: '£',
    base: false,
    rateType: 'dovizSatis',
    auto: false,
    rate: 64.9,
    apiUrl: '',
    active: false,
  },
];
