import { describe, it, expect } from 'vitest';
import { clearWhiteBackground } from './image-background';

const white = (width: number, height: number) =>
  new Uint8ClampedArray(width * height * 4).fill(255);

const put = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
) => {
  const i = (y * width + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
};

const alphaAt = (data: Uint8ClampedArray, width: number, x: number, y: number) =>
  data[(y * width + x) * 4 + 3]!;

describe('arka plan temizleme', () => {
  it('kenardan çapraz bağlantılı fonu da kaldırır', () => {
    const data = white(3, 3);
    put(data, 3, 1, 1, 30, 80, 120);
    put(data, 3, 2, 2, 30, 80, 120);

    clearWhiteBackground(data, 3, 3);

    expect(alphaAt(data, 3, 1, 2)).toBe(0);
  });

  it('koyu nesnenin kenarındaki beyaz halesini temizler, pikseli yarı saydam yapar', () => {
    const data = white(6, 6);
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 3; x++) put(data, 6, x, y, 20, 40, 60);
    put(data, 6, 1, 2, 150, 160, 170); // fon ile nesne arasındaki karışım

    clearWhiteBackground(data, 6, 6);

    const i = (2 * 6 + 1) * 4;
    expect(data[i + 3]).toBeGreaterThan(0);
    expect(data[i + 3]).toBeLessThan(255);
    expect(data[i]).toBeLessThan(100);
    expect(data[i + 1]).toBeLessThan(100);
    expect(data[i + 2]).toBeLessThan(100);
  });

  it('nesnenin içindeki küçük beyaz detayı korur', () => {
    const data = white(5, 5);
    for (let y = 1; y < 4; y++)
      for (let x = 1; x < 4; x++) {
        if (x === 2 && y === 2) continue;
        put(data, 5, x, y, 100, 20, 20);
      }

    clearWhiteBackground(data, 5, 5);

    expect(alphaAt(data, 5, 0, 0)).toBe(0);
    expect(alphaAt(data, 5, 2, 2)).toBe(255);
    expect([...data.slice((1 * 5 + 1) * 4, (1 * 5 + 1) * 4 + 4)]).toEqual([100, 20, 20, 255]);
  });

  it('beyazdan griye giden gradyan fonu kaldırır, beyaz ürünü korur', () => {
    const size = 12;
    const data = white(size, size);
    // Satır bazlı gradyan: 232 → 200
    for (let y = 0; y < size; y++) {
      const tone = Math.round(232 - (32 * y) / (size - 1));
      for (let x = 0; x < size; x++) put(data, size, x, y, tone, tone, tone);
    }
    // Ortada beyaz ürün (4×4)
    for (let y = 4; y < 8; y++) for (let x = 4; x < 8; x++) put(data, size, x, y, 250, 250, 250);

    clearWhiteBackground(data, size, size);

    expect(alphaAt(data, size, 0, 0)).toBe(0);
    expect(alphaAt(data, size, 11, 11)).toBe(0);
    expect(alphaAt(data, size, 5, 5)).toBe(255);
    const i = (5 * size + 5) * 4;
    expect(data[i]).toBe(250);
  });

  it('çanta kulpu gibi kapalı ve dış fonla aynı renkteki boşluğu kaldırır', () => {
    const size = 40;
    const data = white(size, size);
    for (let y = 10; y < 30; y++)
      for (let x = 10; x < 30; x++) {
        const inner = x >= 12 && x < 28 && y >= 12 && y < 28;
        if (!inner) put(data, size, x, y, 25, 25, 28);
      }

    clearWhiteBackground(data, size, size);

    expect(alphaAt(data, size, 20, 20)).toBe(0); // kulp boşluğu
    expect(alphaAt(data, size, 10, 10)).toBe(255); // nesne
  });

  it('ürünün açık renkli iç yüzeyini (kalem gövdesi) delik sanıp silmez', () => {
    const size = 60;
    const data = white(size, size);
    for (let y = 10; y < 50; y++)
      for (let x = 10; x < 50; x++) {
        const inner = x >= 20 && x < 40 && y >= 20 && y < 40;
        put(data, size, x, y, inner ? 248 : 230, inner ? 248 : 230, inner ? 248 : 230);
      }

    clearWhiteBackground(data, size, size);

    expect(alphaAt(data, size, 30, 30)).toBe(255); // iç yüzey
    expect(alphaAt(data, size, 10, 30)).toBe(255); // açık renkli dış hat
    expect(alphaAt(data, size, 0, 0)).toBe(0);
  });

  it('açık renkli ürünün dış hattını bir piksel bile kırpmaz', () => {
    const size = 20;
    const data = white(size, size);
    for (let y = 6; y < 14; y++) for (let x = 6; x < 14; x++) put(data, size, x, y, 236, 236, 236);

    clearWhiteBackground(data, size, size);

    expect(alphaAt(data, size, 6, 10)).toBe(255);
    expect(alphaAt(data, size, 13, 10)).toBe(255);
  });
});
