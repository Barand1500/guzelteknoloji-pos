import { useEffect, useState } from 'react';
import type { RateType } from '../types';

/**
 * Merkez Bankası önizleme kuru. `undefined`: aranıyor, `null`: bu kod için kur yok, sayı: kur.
 * Kod ya da kur tipi değişince kısa bir gecikmeyle yeniden sorulur.
 */
export function useLiveRate(
  preview: (code: string, type: RateType) => Promise<number | null>,
  enabled: boolean,
  code: string,
  type: RateType,
): number | null | undefined {
  const clean = code.trim();
  const key = `${clean.toUpperCase()}|${type}`;
  const [live, setLive] = useState<{ key: string; rate: number | null } | null>(null);

  useEffect(() => {
    if (!enabled || clean.length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void preview(clean, type)
        .then((rate) => !cancelled && setLive({ key, rate }))
        .catch(() => !cancelled && setLive({ key, rate: null }));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [enabled, clean, type, key, preview]);

  return live?.key === key ? live.rate : undefined;
}
