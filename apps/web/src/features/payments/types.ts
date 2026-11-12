/**
 * Tanımlamalar › Ödeme Şekilleri.
 *
 * Sunucu sözleşmesi (uç yoksa 404 → ekranda örnek veri):
 *  - GET  /api/odeme-sekilleri                       → PaymentMethod[] (sıralı: sıra = ödeme ekranındaki sıra)
 *  - POST /api/odeme-sekilleri                       gövde PaymentDraft → PaymentMethod (yeni; aktif başlar)
 *  - POST /api/odeme-sekilleri/:id                   gövde PaymentDraft → PaymentMethod
 *  - POST /api/odeme-sekilleri/:id/sil
 *  - POST /api/odeme-sekilleri/:id/aktiflik          gövde { active }
 *  - POST /api/odeme-sekilleri/sirala                gövde { ids: string[] } (yeni sıra)
 * `icon`: hazır simge anahtarı (PAYMENT_ICONS); `iconUrl`: yüklenen görsel (data URL ya da adres), doluysa simgeyi ezer.
 * `isDefault`: müşteriye özel ödeme şekli seçilmemişse kullanılan şekiller. `priceList`: boşsa müşterinin kendi listesi.
 */
export type PaymentIcon = 'card' | 'bank' | 'store' | 'file' | 'delivery' | 'wallet' | 'cash' | 'qr';

export const PAYMENT_ICONS: { key: PaymentIcon; label: string }[] = [
  { key: 'card', label: 'Kart' },
  { key: 'bank', label: 'Banka' },
  { key: 'store', label: 'Mağaza' },
  { key: 'file', label: 'Açık hesap' },
  { key: 'delivery', label: 'Teslimat' },
  { key: 'wallet', label: 'Cüzdan' },
  { key: 'cash', label: 'Nakit' },
  { key: 'qr', label: 'QR' },
];

export interface PaymentMethod {
  id: string;
  name: string;
  icon: PaymentIcon | null;
  iconUrl: string | null;
  active: boolean;
  isDefault: boolean;
  /** Fiyat seçimi: boş = müşterinin kendi fiyat listesi. */
  priceList: string;
  /** Bu şekil seçilince kargo ücreti hesaplanmaz (ör. mağazada öde). */
  noShipping: boolean;
  /** Bu şekilde indirim ve ek ücretler (ör. havale indirimi, kart komisyonu) uygulanır. */
  allowAdjust: boolean;
}

export type PaymentDraft = Omit<PaymentMethod, 'id' | 'active'>;

export const emptyPaymentDraft = (): PaymentDraft => ({
  name: '',
  icon: 'card',
  iconUrl: null,
  isDefault: false,
  priceList: '',
  noShipping: false,
  allowAdjust: false,
});

export const draftOf = (m: PaymentMethod): PaymentDraft => ({
  name: m.name,
  icon: m.icon,
  iconUrl: m.iconUrl,
  isDefault: m.isDefault,
  priceList: m.priceList,
  noShipping: m.noShipping,
  allowAdjust: m.allowAdjust,
});
