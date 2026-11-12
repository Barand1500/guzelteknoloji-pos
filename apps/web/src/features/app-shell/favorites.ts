import { useCallback, useSyncExternalStore } from 'react';

/** En çok üç favori sayfa (adres olarak saklanır). Tarayıcıda kalır; başka sekmelerle de eşitlenir. */
export const MAX_FAVORITES = 3;
const KEY = 'gt-favorites';
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string').slice(0, MAX_FAVORITES) : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore aynı değeri aynı referansla ister; içerik değişmedikçe önbellekteki dizi döner.
let cache = read();
function snapshot(): string[] {
  const next = read();
  if (next.length !== cache.length || next.some((p, i) => p !== cache[i])) cache = next;
  return cache;
}

function write(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX_FAVORITES)));
  } catch {
    /* depolama kapalıysa favoriler yalnızca bu oturumda kalmaz; sessizce geçilir */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Favori sayfa adresleri ve ekleme/çıkarma işlemleri. */
export function useFavorites() {
  const paths = useSyncExternalStore(subscribe, snapshot, () => []);
  const add = useCallback((path: string) => {
    const now = read();
    if (now.includes(path) || now.length >= MAX_FAVORITES) return;
    write([...now, path]);
  }, []);
  const remove = useCallback((path: string) => write(read().filter((p) => p !== path)), []);
  return { paths, add, remove };
}
