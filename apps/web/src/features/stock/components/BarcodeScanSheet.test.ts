import { describe, expect, it } from 'vitest';
import { checksumOk } from './BarcodeScanSheet';

describe('Barkod kontrol hanesi (yanlış okumaları eler)', () => {
  it('geçerli EAN-13, EAN-8 ve UPC-A kabul edilir', () => {
    expect(checksumOk('4006381333931', 'EAN_13')).toBe(true);
    expect(checksumOk('96385074', 'EAN_8')).toBe(true);
    expect(checksumOk('036000291452', 'UPC_A')).toBe(true);
    expect(checksumOk('4006381333931', 'ean_13')).toBe(true);
  });
  it('kontrol hanesi tutmayan ya da uzunluğu yanlış değer reddedilir', () => {
    expect(checksumOk('4006381333932', 'EAN_13')).toBe(false);
    expect(checksumOk('400638133393', 'EAN_13')).toBe(false);
    expect(checksumOk('96385075', 'EAN_8')).toBe(false);
  });
  it('kontrol hanesi olmayan biçimler (CODE 128/39) olduğu gibi geçer', () => {
    expect(checksumOk('500144301456', 'CODE_128')).toBe(true);
    expect(checksumOk('ABC-123', 'CODE_39')).toBe(true);
  });
});
