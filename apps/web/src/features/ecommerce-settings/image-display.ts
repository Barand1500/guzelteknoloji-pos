import { useSyncExternalStore } from 'react';

export type ImageShape = 'kare' | 'yatay' | 'dikey';
export type ImageFit = 'kirp' | 'sigdir';

export interface ImageDisplay {
  shape: ImageShape;
  fit: ImageFit;
}

const KEY = 'gt-eticaret-resim-gorunumu';
const DEFAULTS: ImageDisplay = { shape: 'yatay', fit: 'sigdir' };

/**
 * Görünüm Ayarları'ndaki resim tercihleri tarayıcıda saklanır; ekranlar arasında paylaşılır.
 * Backend gelince bu değerler işletme ayarından okunacak.
 */
function read(): ImageDisplay {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULTS;
    const value = parsed as Partial<ImageDisplay>;
    return {
      shape:
        value.shape === 'kare' || value.shape === 'dikey' || value.shape === 'yatay'
          ? value.shape
          : DEFAULTS.shape,
      fit: value.fit === 'kirp' || value.fit === 'sigdir' ? value.fit : DEFAULTS.fit,
    };
  } catch {
    return DEFAULTS;
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getImageDisplay(): ImageDisplay {
  return current;
}

export function setImageDisplay(patch: Partial<ImageDisplay>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* saklama kapalıysa tercih yalnızca oturum boyunca geçerli olur */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useImageDisplay(): ImageDisplay {
  return useSyncExternalStore(subscribe, getImageDisplay, getImageDisplay);
}

/** Seçilen orana göre kutu sınıfı (Tailwind sınıfları sabit yazılır). */
export function shapeClass(shape: ImageShape) {
  return shape === 'kare' ? 'aspect-square' : shape === 'dikey' ? 'aspect-[3/4]' : 'aspect-[4/3]';
}

/** Kırp = alanı doldur (taşan kenarlar kesilir), Sığdır = tamamı görünsün (boşluk kalabilir). */
export function fitClass(fit: ImageFit) {
  return fit === 'kirp' ? 'object-cover' : 'object-contain';
}
