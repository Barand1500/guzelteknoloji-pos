/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/stockdefs/services içe aktarır.
 */
import type { StockDefsData } from '../features/stockdefs/types';

export function stockDefsSeed(): StockDefsData {
  const n = (id: string, name: string, shortName = '') => ({ id, name, shortName });
  const year = new Date().getFullYear();
  return {
    cari: [n('c1', 'Bayi'), n('c2', 'Dağıtıcı'), n('c3', 'Son Kullanıcı')],
    stok: [n('s1', 'Basit Ürün'), n('s2', 'Grup Ürün'), n('s3', 'Varyasyonlu Ürün')],
    units: [n('u1', 'ADET', 'ADET'), n('u2', 'KOLİ', 'KOLİ')],
    priceLists: [
      { id: 'f1', name: 'FİYAT', kind: 'general', start: null, end: null, isDefault: true },
      { id: 'f2', name: 'TOPTAN', kind: 'general', start: null, end: null, isDefault: false },
      {
        id: 'f3',
        name: 'YILSONU KAMPANYASI',
        kind: 'special',
        start: `${year}-11-01`,
        end: `${year}-12-31`,
        isDefault: false,
      },
    ],
  };
}
