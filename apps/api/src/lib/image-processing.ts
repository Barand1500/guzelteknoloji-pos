import sharp from 'sharp';
import { clearWhiteBackground } from '@gt/shared';
import { HttpError } from './http-error';

type UploadedImageFormat = 'png' | 'jpeg' | 'webp';
// Birden fazla büyük fotoğrafın piksel tamponları aynı anda bellekte tutulmasın.
let tail: Promise<void> = Promise.resolve();
let waiting = 0;

export async function prepareUploadedImage(
  data: Buffer,
  transparent: boolean,
): Promise<{ data: Buffer; format: UploadedImageFormat }> {
  if (waiting >= 4)
    throw new HttpError(429, 'RATE_LIMITED', 'Görsel işleme yoğun. Biraz sonra tekrar deneyin.');
  waiting++;
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const image = await sharp(data, { limitInputPixels: 40000000, animated: false })
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength,
    );
    if (transparent) clearWhiteBackground(pixels, image.info.width, image.info.height);
    const output = await sharp(image.data, {
      raw: { width: image.info.width, height: image.info.height, channels: 4 },
    })
      .webp({ quality: 90, alphaQuality: 100, effort: 4 })
      .toBuffer();
    if (output.length > 5 * 1024 * 1024) throw new Error('WEBP_TOO_LARGE');
    return { data: output, format: 'webp' };
  } catch {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Görsel WebP olarak işlenemedi. En fazla 40 megapiksel büyüklüğünde JPG, PNG veya WebP seçin.',
    );
  } finally {
    waiting--;
    release();
  }
}
