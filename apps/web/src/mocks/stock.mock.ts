/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu klasör (src/mocks) silinir.
 * Bu dosyayı yalnızca servis katmanı (features/*\/services) içe aktarır; bileşenler doğrudan
 * buraya bağlanmaz. Böylece geçiş yalnızca servis dosyalarındaki birkaç satırdır.
 */
import type { StockLookups } from '../features/stock/types';

export const stockLookupsMock: StockLookups = {
  stockTypes: [{ value: 'basit', label: 'Basit Ürün' }],
  vatDepartments: [
    { value: '', label: 'Seçiniz' },
    { value: 'genel', label: 'Genel (%20)' },
    { value: 'gida', label: 'Gıda (%10)' },
    { value: 'temel-gida', label: 'Temel Gıda (%1)' },
  ],
  brands: [
    { value: '', label: 'Seçiniz' },
    { value: 'alatel', label: 'ALATEL' },
    { value: 'anypay', label: 'ANYPAY' },
    { value: 'asys', label: 'ASYS' },
    { value: 'bmx', label: 'BMX' },
    { value: 'cas', label: 'CAS' },
  ],
  stockKinds: [
    { value: 'resmi', label: 'Resmî' },
    { value: 'gayriresmi', label: 'Gayriresmî' },
  ],
  inventoryTracking: [
    { value: 'normal', label: 'Normal' },
    { value: 'yok', label: 'Takip Yok' },
  ],
  units: [
    { value: 'adet', label: 'Adet' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'lt', label: 'Litre' },
    { value: 'metre', label: 'Metre' },
    { value: 'koli', label: 'Koli' },
  ],
  currencies: [
    { value: 'TRY', label: '₺ TRY' },
    { value: 'USD', label: '$ USD' },
    { value: 'EUR', label: '€ EUR' },
  ],
  priceLists: [
    { value: 'fiyat', label: 'Fiyat' },
    { value: 'perakende', label: 'Perakende' },
    { value: 'toptan', label: 'Toptan' },
  ],
  vatRates: [
    { value: '0', label: '% 0' },
    { value: '1', label: '% 1' },
    { value: '10', label: '% 10' },
    { value: '20', label: '% 20' },
  ],
};
