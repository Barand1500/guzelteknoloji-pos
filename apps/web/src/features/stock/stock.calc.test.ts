import { describe, expect, it } from 'vitest';
import { blockTotals, extraNet, shapeVolumeCm3, toInputValue, volumeToDesi } from './stock.calc';

describe('stok hesapları', () => {
  it('prizma, küp ve silindir hacmini cm³ olarak hesaplar', () => {
    expect(shapeVolumeCm3('prizma', { a: 10, b: 20, c: 30 })).toBe(6000);
    expect(shapeVolumeCm3('kup', { a: 10, b: 0, c: 0 })).toBe(1000);
    expect(shapeVolumeCm3('silindir', { a: 10, b: 0, c: 10 })).toBeCloseTo(785.398, 3);
  });

  it('desi: yurt içi ÷ 3000, yurt dışı ÷ 5000', () => {
    expect(volumeToDesi(6000)).toBe(2);
    expect(volumeToDesi(6000, 'yurtici')).toBe(2);
    expect(volumeToDesi(6000, 'yurtdisi')).toBe(1.2);
  });

  it('formda virgüllü ve en çok 3 ondalıklı yazar', () => {
    expect(toInputValue(1.23456)).toBe('1,235');
    expect(toInputValue(2)).toBe('2');
  });

  it('KDV hariç/dahil ve iskonto doğru hesaplanır', () => {
    const base = { amount: '100', currency: 'TRY', discount: '10', vatRate: '20', extras: [] };
    const excl = blockTotals({ ...base, vatIncluded: false });
    expect(excl.net).toBeCloseTo(90);
    expect(excl.incl).toBeCloseTo(108);
    const incl = blockTotals({ ...base, vatIncluded: true });
    expect(incl.excl).toBeCloseTo(75);
    expect(incl.incl).toBeCloseTo(90);
  });

  it('ek fiyat iskontosunu virgüllü sayıyla da uygular', () => {
    expect(extraNet('200', '12,5')).toBeCloseTo(175);
  });
});
