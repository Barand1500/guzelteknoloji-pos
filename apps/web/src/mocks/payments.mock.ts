/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/payments/services içe aktarır.
 */
import type { PaymentMethod } from '../features/payments/types';

const m = (
  id: string,
  name: string,
  icon: PaymentMethod['icon'],
  isDefault: boolean,
  extra: Partial<PaymentMethod> = {},
): PaymentMethod => ({
  id,
  name,
  icon,
  iconUrl: null,
  active: true,
  isDefault,
  priceList: '',
  noShipping: false,
  allowAdjust: false,
  ...extra,
});

export const paymentSeeds: PaymentMethod[] = [
  m('o1', 'Kredi Kartı/Banka Kartı', 'card', true, { allowAdjust: true }),
  m('o2', 'Havale/EFT', 'bank', true, { allowAdjust: true, priceList: 'FİYAT' }),
  m('o3', 'Mağazada Öde', 'store', true, { noShipping: true }),
  m('o4', 'Açık Hesap', 'file', false, { priceList: 'TOPTAN' }),
  m('o5', 'Teslimatta Öde', 'delivery', false),
];
