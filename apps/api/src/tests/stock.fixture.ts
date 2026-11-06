import type { StockCardDraft, UnitRow } from '@gt/shared';

export function stockFixture(): StockCardDraft {
  const row: UnitRow = {
    id: 'temporary-row',
    unit: 'adet',
    multiplier: '1',
    purchase: {
      amount: '100,125',
      currency: 'TRY',
      discount: '10',
      vatRate: '20',
      vatIncluded: false,
      extras: [
        { id: 'temporary-extra', note: 'Bayi', amount: '50,5', discount: '5', currency: 'EUR' },
      ],
    },
    sale: {
      amount: '120',
      currency: 'TRY',
      discount: '',
      vatRate: '20',
      vatIncluded: true,
      extras: [],
    },
    barcodes: [{ id: 'temporary-barcode', type: 'EAN13', code: '8690000000001' }],
    weight: '250',
    weightUnit: 'g',
    volume: '1,5',
    note: 'Kırılabilir',
    isMain: true,
    isDefault: true,
  };
  return {
    stockType: 'basit',
    code: 'STK-001',
    name: 'Deneme Ürünü',
    brand: '',
    vatDepartment: 'genel',
    stockKind: 'resmi',
    inventoryTracking: 'normal',
    lowerLimit: '1,25',
    upperLimit: '20',
    serialRequired: false,
    serialPrefix: '',
    lotRequired: false,
    expiryTracking: false,
    lotPrefix: '',
    expiryRequired: false,
    shelfLifeDays: '',
    riskDays: '',
    gtip: '123456789012',
    origin: 'Türkiye',
    otherTax: 'otv',
    units: { fiyat: [row] },
  };
}
