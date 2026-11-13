import { describe, expect, it } from 'vitest';
import { customHolidayDraftSchema, paymentActiveSchema, paymentDraftSchema } from '@gt/shared';
import { FALLBACK_2026, mergeOfficial } from '../modules/definitions/nager';

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

describe('Resmî tatil birleştirme', () => {
  it('dış servisin yayınlamadığı dini bayramları yerel listeden ekler', () => {
    // Nager 2026 için yalnızca sabit günleri dönüyor; Ramazan/Kurban yerel listeden gelmeli.
    const merged = mergeOfficial(
      [{ date: '2026-01-01', name: 'Yılbaşı', tentative: false }],
      FALLBACK_2026,
    );
    expect(merged).toHaveLength(FALLBACK_2026.length);
    expect(merged.some((day) => day.date === '2026-03-20')).toBe(true);
    expect(merged.some((day) => day.date === '2026-05-27')).toBe(true);
  });

  it('aynı günü iki kez yazmaz, dış servisin adını korur', () => {
    const merged = mergeOfficial(
      [{ date: '2026-01-01', name: 'Yeni Yıl', tentative: false }],
      FALLBACK_2026,
    );
    expect(merged.filter((day) => day.date === '2026-01-01')).toHaveLength(1);
    expect(merged.find((day) => day.date === '2026-01-01')?.name).toBe('Yeni Yıl');
  });

  it('sonucu tarihe göre sıralar', () => {
    const merged = mergeOfficial(
      [{ date: '2026-10-29', name: 'Cumhuriyet Bayramı', tentative: false }],
      [{ date: '2026-01-01', name: 'Yılbaşı', tentative: false }],
    );
    expect(merged.map((day) => day.date)).toEqual(['2026-01-01', '2026-10-29']);
  });
});
