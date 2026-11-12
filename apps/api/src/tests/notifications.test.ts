import { describe, expect, it } from 'vitest';
import { notificationDraftSchema } from '@gt/shared';

const base = {
  title: 'Yılsonu kampanyası',
  text: 'Tüm ürünlerde %10 indirim.',
  customerIds: [],
  sendAt: null,
};

describe('Mobil bildirim şeması', () => {
  it('hemen gönderim ve planlama biçimlerini kabul eder', () => {
    expect(notificationDraftSchema.safeParse(base).success).toBe(true);
    expect(
      notificationDraftSchema.safeParse({ ...base, sendAt: '2026-12-01T18:30' }).success,
    ).toBe(true);
  });

  it('başlık zorunlu ve 60 karakterle sınırlı', () => {
    expect(notificationDraftSchema.safeParse({ ...base, title: ' ' }).success).toBe(false);
    expect(notificationDraftSchema.safeParse({ ...base, title: 'a'.repeat(61) }).success).toBe(
      false,
    );
  });

  it('müşteri kimlikleri sayısal olmalı', () => {
    expect(notificationDraftSchema.safeParse({ ...base, customerIds: ['12', '34'] }).success).toBe(
      true,
    );
    expect(notificationDraftSchema.safeParse({ ...base, customerIds: ['abc'] }).success).toBe(
      false,
    );
  });

  it('zaman biçimi YYYY-AA-GGTHH:mm olmalı', () => {
    expect(notificationDraftSchema.safeParse({ ...base, sendAt: '2026-12-01' }).success).toBe(false);
    expect(
      notificationDraftSchema.safeParse({ ...base, sendAt: '2026-12-01T18:30:00' }).success,
    ).toBe(false);
  });
});
