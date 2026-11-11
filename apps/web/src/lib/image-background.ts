/** Removes edge-connected white background and decontaminates its antialiased edge pixels. */
export function clearWhiteBackground(data: Uint8ClampedArray, width: number, height: number) {
  const background = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;
  const add = (index: number) => {
    if (background[index]) return;
    const offset = index * 4;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    if (
      data[offset + 3] === 0 ||
      (Math.min(r, g, b) >= 220 && Math.max(r, g, b) - Math.min(r, g, b) <= 30)
    ) {
      background[index] = 1;
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
    const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) add(ny * width + nx);
      }
    }
  }

  for (let index = 0; index < background.length; index++) {
    if (!background[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          (dx !== 0 || dy !== 0) &&
          nx >= 0 &&
          nx < width &&
          ny >= 0 &&
          ny < height &&
          !background[ny * width + nx]
        ) {
          edge = true;
          break;
        }
      }
    }
    const offset = index * 4;
    if (!edge) {
      data[offset + 3] = 0;
      continue;
    }

    // Estimate coverage against a white matte, then unmix white from the edge color.
    const minChannel = Math.min(data[offset]!, data[offset + 1]!, data[offset + 2]!);
    const alpha = 255 - minChannel;
    if (alpha <= 0) {
      data[offset + 3] = 0;
      continue;
    }
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = Math.max(
        0,
        Math.min(255, Math.round((data[offset + channel]! - minChannel) * (255 / alpha))),
      );
    }
    data[offset + 3] = Math.round((data[offset + 3]! * alpha) / 255);
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
