import { clearWhiteBackground } from '@gt/shared';
export { clearWhiteBackground } from '@gt/shared';

const cache = new Map<string, Promise<string>>();

/** Aynı görsel için işlem bir kez yapılır; sonuç sekmede önbellekte tutulur. */
export function withoutWhiteBackground(src: string): Promise<string> {
  const existing = cache.get(src);
  if (existing) return existing;
  const result = new Promise<string>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onerror = () => resolve(src);
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // 1024 px yeterli: ekranda en büyük önizleme ~400 px; tam boyutu şişirmeyelim.
        const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(src);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        clearWhiteBackground(pixels.data, canvas.width, canvas.height);
        context.putImageData(pixels, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    image.src = src;
  });
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  cache.set(src, result);
  return result;
}
