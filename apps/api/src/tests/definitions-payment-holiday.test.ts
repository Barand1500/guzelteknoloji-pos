import { describe, expect, it } from 'vitest';
import { customHolidayDraftSchema, paymentActiveSchema, paymentDraftSchema } from '@gt/shared';

describe('Ödeme şekli şeması', () => {
  const base = {
    name: 'Kredi Kartı',
    icon: 'card' as const,
    iconUrl: null,
    isDefault: true,
    priceList: '',
    noShipping: false,
    allowAdjust: true,
  };

  it('geçerli gövdeyi kabul eder', () => {
    expect(paymentDraftSchema.safeParse(base).success).toBe(true);
    expect(paymentDraftSchema.safeParse({ ...base, icon: null }).success).toBe(true);
  });

  it('boş adı, bilinmeyen simgeyi ve fazla alanı reddeder', () => {
    expect(paymentDraftSchema.safeParse({ ...base, name: '  ' }).success).toBe(false);
    expect(paymentDraftSchema.safeParse({ ...base, icon: 'yok' }).success).toBe(false);
    expect(paymentDraftSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });

  it('aktiflik gövdesi yalnızca boolean taşır', () => {
    expect(paymentActiveSchema.safeParse({ active: false }).success).toBe(true);
    expect(paymentActiveSchema.safeParse({ active: 'false' }).success).toBe(false);
  });
});

describe('Özel tatil şeması', () => {
  const base = { name: 'Sayım Günü', start: '2026-12-31', end: '2026-12-31' };

  it('tek gün ve aralığı kabul eder', () => {
    expect(customHolidayDraftSchema.safeParse(base).success).toBe(true);
    expect(customHolidayDraftSchema.safeParse({ ...base, end: '2027-01-02' }).success).toBe(true);
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    const result = customHolidayDraftSchema.safeParse({ ...base, end: '2026-12-30' });
    expect(result.success).toBe(false);
  });

  it('geçersiz tarih biçimini reddeder', () => {
    expect(customHolidayDraftSchema.safeParse({ ...base, start: '31.12.2026' }).success).toBe(
      false,
    );
    expect(customHolidayDraftSchema.safeParse({ ...base, start: '2026-02-31' }).success).toBe(
      false,
    );
  });
});
