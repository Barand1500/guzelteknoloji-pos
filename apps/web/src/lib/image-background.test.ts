import { describe, it, expect } from 'vitest';
import { clearWhiteBackground } from './image-background';

describe('beyaz arka plan', () => {
  it('arka planı çapraz bağlantılarda da kaldırır', () => {
    const data = new Uint8ClampedArray(3 * 3 * 4).fill(255);
    const opaque = (x: number, y: number) => {
      const i = (y * 3 + x) * 4;
      data[i] = 30;
      data[i + 1] = 80;
      data[i + 2] = 120;
      data[i + 3] = 255;
    };
    opaque(1, 1);
    opaque(2, 2);

    clearWhiteBackground(data, 3, 3);

    expect(data[(1 * 3 + 2) * 4 + 3]).toBe(0);
  });

  it('nesne kenarındaki kırık beyaz pikselleri yarı saydam ve haleden arındırılmış yapar', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    const object = (x: number, y: number) => {
      const i = (y * 5 + x) * 4;
      data[i] = 20;
      data[i + 1] = 40;
      data[i + 2] = 60;
      data[i + 3] = 255;
    };
    object(2, 2);
    const fringe = (2 * 5 + 1) * 4;
    data[fringe] = 235;
    data[fringe + 1] = 235;
    data[fringe + 2] = 235;

    clearWhiteBackground(data, 5, 5);

    expect(data[fringe + 3]).toBeGreaterThan(0);
    expect(data[fringe + 3]).toBeLessThan(255);
    expect(data[fringe]).toBeLessThan(100);
    expect(data[fringe + 1]).toBeLessThan(100);
    expect(data[fringe + 2]).toBeLessThan(100);
  });
  it('kenardaki beyazı kaldırır; nesnenin içindeki kapalı beyaz alanı ve renkleri korur', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (let y = 1; y < 4; y++)
      for (let x = 1; x < 4; x++) {
        if (x === 2 && y === 2) continue;
        const i = (y * 5 + x) * 4;
        data[i] = 100;
        data[i + 1] = 20;
        data[i + 2] = 20;
      }
    clearWhiteBackground(data, 5, 5);
    expect(data[3]).toBe(0);
    expect(data[(2 * 5 + 2) * 4 + 3]).toBe(255);
    expect([...data.slice((1 * 5 + 1) * 4, (1 * 5 + 1) * 4 + 4)]).toEqual([100, 20, 20, 255]);
  });
});
