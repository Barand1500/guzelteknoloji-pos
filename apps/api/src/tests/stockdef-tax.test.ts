import { describe, expect, it } from 'vitest';
import {
  nameDraftSchema,
  priceListDraftSchema,
  taxOfficeDraftSchema,
  taxRateSchema,
  taxTypeDraftSchema,
} from '@gt/shared';

describe('Vergi şemaları', () => {
  it('tür adı ve kısa ad zorunlu', () => {
    expect(taxTypeDraftSchema.safeParse({ name: 'KDV', shortName: 'KDV' }).success).toBe(true);
    expect(taxTypeDraftSchema.safeParse({ name: ' ', shortName: 'KDV' }).success).toBe(false);
    expect(taxTypeDraftSchema.safeParse({ name: 'KDV', shortName: '' }).success).toBe(false);
  });

  it('oran 0–100 arasında olmalı', () => {
    expect(taxRateSchema.safeParse({ rate: 20 }).success).toBe(true);
    expect(taxRateSchema.safeParse({ rate: 101 }).success).toBe(false);
    expect(taxRateSchema.safeParse({ rate: -1 }).success).toBe(false);
  });

  it('vergi dairesi adı boş olamaz', () => {
    expect(taxOfficeDraftSchema.safeParse({ name: 'Kadıköy' }).success).toBe(true);
    expect(taxOfficeDraftSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});

describe('Cari ve stok tanım şemaları', () => {
  it('ad zorunlu, kısa ad isteğe bağlı', () => {
    expect(nameDraftSchema.safeParse({ name: 'Bayi', shortName: '' }).success).toBe(true);
    expect(nameDraftSchema.safeParse({ name: '', shortName: 'KG' }).success).toBe(false);
  });

  it('özel fiyat listesinde bitiş başlangıçtan önce olamaz', () => {
    expect(
      priceListDraftSchema.safeParse({
        name: 'Bayram',
        kind: 'special',
        start: '2026-11-01',
        end: '2026-10-01',
      }).success,
    ).toBe(false);
    expect(
      priceListDraftSchema.safeParse({
        name: 'Bayram',
        kind: 'special',
        start: '2026-10-01',
        end: '2026-11-01',
      }).success,
    ).toBe(true);
  });

  it('genel listede tarih zorunlu değildir', () => {
    expect(
      priceListDraftSchema.safeParse({ name: 'FİYAT', kind: 'general', start: null, end: null })
        .success,
    ).toBe(true);
  });
});
