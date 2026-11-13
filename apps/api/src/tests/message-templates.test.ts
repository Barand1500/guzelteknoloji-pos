import { expect, it } from 'vitest';
import { renderMessage, messageTemplatesSchema, templateVariables } from '@gt/shared';

it('değişkenleri yalnızca tek kez ve izin verilen kaynaklardan doldurur', () => {
  const vars = templateVariables({ adsoyad: 'Ali #siparisno#', siparisno: 'S-1' }, [
    { column: 'siparisNo', code: '#numara#' },
    { column: 'password', code: '#sifre#' },
  ]);
  expect(renderMessage('Merhaba #adsoyad#, #numara#', vars)).toBe('Merhaba Ali #siparisno#, S-1');
  expect(() => renderMessage('#sifre#', vars)).toThrow();
});
it('e-posta uzun metnini kabul eder, yinelenen otomatik olayları reddeder', () => {
  const row = {
    id: '1',
    name: 'Sipariş',
    subject: 'Siparişiniz',
    text: 'a'.repeat(30000),
    event: 'order.created',
  };
  expect(messageTemplatesSchema('email').safeParse([row]).success).toBe(true);
  expect(messageTemplatesSchema('sms').safeParse([row]).success).toBe(false);
  expect(messageTemplatesSchema('email').safeParse([row, { ...row, id: '2' }]).success).toBe(false);
});
