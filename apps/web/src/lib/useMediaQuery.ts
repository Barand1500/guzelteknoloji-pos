import { useEffect, useState } from 'react';

/**
 * Ekran ölçüsü sorgusunu (ör. "(min-width: 80rem)") React durumu olarak verir.
 * `matchMedia` olmayan ortamlarda (testler) `fallback` döner.
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  const read = () => (window.matchMedia ? window.matchMedia(query).matches : fallback);
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
