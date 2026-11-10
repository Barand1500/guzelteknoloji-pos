/** Removes only near-white pixels connected to the edge, preserving enclosed white details. */
export function clearWhiteBackground(data: Uint8ClampedArray, width: number, height: number) {
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;
  const add = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    if (
      data[offset + 3] === 0 ||
      (Math.min(r, g, b) >= 235 && Math.max(r, g, b) - Math.min(r, g, b) <= 15)
    ) {
      data[offset + 3] = 0;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (index >= width) add(index - width);
    if (index + width < width * height) add(index + width);
  }
}

const cache = new Map<string, Promise<string>>();
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
