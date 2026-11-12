/**
 * Tanımlamalar › Vergiler. Referanstaki 3 sekme 2 sayfaya indi:
 *  - Vergiler: "Vergiler" (tür + oran) ile "Vergi Türleri" (ad + kısa ad) tek yerde. Her vergi türü bir karttır,
 *    oranları kartın içindeki etiketlerdir (KDV: %20 %10 %1).
 *  - Vergi Daireleri: arama, harf süzgeci ve sayfalama.
 *
 * Sunucu sözleşmesi (uç yoksa 404 → ekranda örnek veri):
 *  - GET  /api/vergiler                         → TaxType[]
 *  - POST /api/vergiler                         gövde { name, shortName } → TaxType
 *  - POST /api/vergiler/:id                     gövde { name, shortName } → TaxType
 *  - POST /api/vergiler/:id/sil
 *  - POST /api/vergiler/:id/oranlar             gövde { rate } → TaxType (oran ekler)
 *  - POST /api/vergiler/:id/oranlar/sil         gövde { rate } → TaxType (oran siler)
 *  - GET  /api/vergi-daireleri                  → TaxOffice[]
 *  - POST /api/vergi-daireleri                  gövde { name } → TaxOffice
 *  - POST /api/vergi-daireleri/:id              gövde { name } → TaxOffice
 *  - POST /api/vergi-daireleri/:id/sil
 */
export interface TaxType {
  id: string;
  name: string;
  /** Kısa ad: KDV, ÖTV… */
  shortName: string;
  /** Yüzde oranları (ör. 20, 10, 8.5), büyükten küçüğe. */
  rates: number[];
}
export type TaxTypeDraft = Pick<TaxType, 'name' | 'shortName'>;

export interface TaxOffice {
  id: string;
  name: string;
  /** "Belirtilmemiş" gibi sistem kaydı: değiştirilemez, silinemez. */
  builtin: boolean;
}

export const formatPct = (n: number) => `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;

export type CalcMode = 'net' | 'gross';

/** `net`: tutar vergi hariçtir (üstüne eklenir); `gross`: tutar vergi dahildir (içinden ayrılır). */
export function calcTax(amount: number, rate: number, mode: CalcMode) {
  if (mode === 'net') {
    const vat = Math.round(amount * rate) / 100;
    return { net: amount, vat, gross: Math.round((amount + vat) * 100) / 100 };
  }
  const net = Math.round((amount / (1 + rate / 100)) * 100) / 100;
  return { net, vat: Math.round((amount - net) * 100) / 100, gross: amount };
}

/** A–Z süzgeci için ilk harf (Türkçe büyük harf); rakamla başlayanlar "#". */
export function letterOf(name: string): string {
  const c = name.trim().charAt(0).toLocaleUpperCase('tr');
  return /\p{L}/u.test(c) ? c : '#';
}
