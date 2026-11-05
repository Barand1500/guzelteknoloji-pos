import { describe, expect, it } from 'vitest';
import { loginCodeEmail } from '../lib/mail-templates';

const base = {
  code: '048213',
  expiresInMinutes: 10,
  brandName: 'Güzel Teknoloji',
  appUrl: 'https://guzelteknoloji.com',
};

describe('giriş kodu e-postası', () => {
  it('konu, düz metin ve HTML kodu içerir', () => {
    const mail = loginCodeEmail(base);
    expect(mail.subject).toBe('Güzel Teknoloji giriş kodunuz: 048213');
    expect(mail.text).toContain('048213');
    expect(mail.text).toContain('10 dakika');
    for (const digit of '048213') expect(mail.html).toContain(`>${digit}</td>`);
    expect(mail.html).toContain('guzelteknoloji.com');
    expect(mail.html).toContain('lang="tr"');
  });

  it('başa gelen sıfırlar korunur', () => {
    const mail = loginCodeEmail({ ...base, code: '000123' });
    expect(mail.subject.endsWith('000123')).toBe(true);
  });

  it('dinamik metinleri HTML olarak kaçışlar', () => {
    const mail = loginCodeEmail({
      ...base,
      brandName: '<script>alert(1)</script>',
      appUrl: 'https://x.test/"><img src=x>',
    });
    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).not.toContain('"><img');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
