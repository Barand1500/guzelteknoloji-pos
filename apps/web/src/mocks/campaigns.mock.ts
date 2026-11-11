/*
 * SAHTE (MOCK) VERİ — gerçek API hazır olunca bu dosya silinir.
 * Yalnızca features/campaigns/services içe aktarır.
 */
import type { CampaignData, CampaignKind } from '../features/campaigns/types';

export function campaignSeed(kind: CampaignKind): CampaignData {
  if (kind === 'cart')
    return {
      general: {
        active: false,
        customerTypes: [],
        priceLists: [],
        minTotal: 5000,
        discountKind: 'percent',
        discountValue: 5,
      },
      rules: [
        {
          id: 'k1',
          active: true,
          categoryIds: [],
          brandIds: [],
          customerTypes: ['Bayi'],
          priceLists: ['TOPTAN'],
          minTotal: 20000,
          discountKind: 'percent',
          discountValue: 10,
        },
        {
          id: 'k2',
          active: false,
          categoryIds: [],
          brandIds: [],
          customerTypes: [],
          priceLists: [],
          minTotal: 1,
          discountKind: 'amount',
          discountValue: 1,
        },
      ],
    };
  return {
    general: {
      active: true,
      customerTypes: [],
      priceLists: ['FİYAT'],
      minTotal: 20000,
      discountKind: 'percent',
      discountValue: 0,
    },
    rules: [],
  };
}
