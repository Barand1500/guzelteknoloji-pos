import { describe, expect, it } from 'vitest';
import { allocateMoney, returnedAmount } from '../modules/orders/order-money';

describe('Sipariş ve kısmi iade kuruş hesabı', () => {
  it('kampanya tutarını satırlara dağıtır; kuruş kaybetmez ve satır tutarını aşmaz', () => {
    expect(allocateMoney('1.00', ['1.00', '1.00', '1.00'])).toEqual(['0.34', '0.33', '0.33']);
    expect(allocateMoney('0.01', ['0', '1'])).toEqual(['0.00', '0.01']);
  });
  it('üç ayrı kısmi iadede satılan toplam tutarın tamamını tam bir kez iade eder', () => {
    expect(returnedAmount('1.00', '3', '0', '0', '1')).toBe('0.33');
    expect(returnedAmount('1.00', '3', '1', '0.33', '1')).toBe('0.34');
    expect(returnedAmount('1.00', '3', '2', '0.67', '1')).toBe('0.33');
    expect(() => returnedAmount('1', '3', '2', '0.67', '2')).toThrow();
  });
});
