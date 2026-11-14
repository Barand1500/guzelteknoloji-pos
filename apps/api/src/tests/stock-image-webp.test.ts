import sharp from 'sharp';
import { expect, it } from 'vitest';
import { prepareUploadedImage } from '../lib/image-processing';

async function picture(format: 'png' | 'jpeg' | 'webp') {
  const rgb = Buffer.alloc(64 * 64 * 3, 255);
  for (let y = 20; y < 44; y++)
    for (let x = 20; x < 44; x++) {
      const i = (y * 64 + x) * 3;
      rgb[i] = 20;
      rgb[i + 1] = 60;
      rgb[i + 2] = 100;
    }
  return sharp(rgb, { raw: { width: 64, height: 64, channels: 3 } })
    .toFormat(format)
    .toBuffer();
}
it.each(['png', 'jpeg', 'webp'] as const)(
  '%s ürün görselini şeffaf WebP yapar, ürünü ve boyutu korur',
  async (format) => {
    const result = await prepareUploadedImage(await picture(format), true);
    expect(result.format).toBe('webp');
    const meta = await sharp(result.data).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 64, height: 64, hasAlpha: true });
    const raw = await sharp(result.data).ensureAlpha().raw().toBuffer();
    expect(raw[3]).toBe(0);
    expect(raw[(32 * 64 + 32) * 4 + 3]).toBe(255);
  },
);
it('şeffaflık kapalıyken de WebP yapar, beyaz arka planı korur', async () => {
  const data = await picture('jpeg');
  const result = await prepareUploadedImage(data, false);
  expect(result.format).toBe('webp');
  expect((await sharp(result.data).metadata()).format).toBe('webp');
  const raw = await sharp(result.data).ensureAlpha().raw().toBuffer();
  expect(raw[3]).toBe(255);
  expect(raw[0]).toBeGreaterThan(245);
});
it('büyük resmi en fazla 2048 piksele indirir, yeniden büyütmez', async () => {
  const data = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: '#ffffff' },
  })
    .jpeg()
    .toBuffer();
  const result = await prepareUploadedImage(data, true);
  expect(await sharp(result.data).metadata()).toMatchObject({ width: 2048, height: 1024 });
});
