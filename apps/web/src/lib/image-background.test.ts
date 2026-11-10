import { describe, it, expect } from 'vitest';
import { clearWhiteBackground } from './image-background';

describe('beyaz arka plan', () => {
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
