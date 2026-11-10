import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DuplicateResult, StockService } from './services/stock.service';

type Check = (values: { code: string; barcode: string }) => Promise<DuplicateResult>;

const DuplicateCheckContext = createContext<Check | null>(null);
export const useDuplicateCheck = () => useContext(DuplicateCheckContext);

/**
 * Stok kartı formu için kod/barkod çakışma denetimi sağlayıcısı. Düzenlemede kartın kendisi
 * (`excludeId`) çakışma sayılmaz. Sağlayıcı yoksa (testler, başka ekranlar) denetim yapılmaz.
 */
export function DuplicateCheckProvider({
  service,
  excludeId,
  children,
}: {
  service: StockService;
  excludeId?: string | undefined;
  children: ReactNode;
}) {
  const check = useCallback<Check>(
    (values) => service.checkDuplicate({ ...values, ...(excludeId ? { excludeId } : {}) }),
    [service, excludeId],
  );
  return <DuplicateCheckContext.Provider value={check}>{children}</DuplicateCheckContext.Provider>;
}

export interface DuplicateHit {
  id: string;
  name: string;
  code: string;
}

/**
 * Yazılan kod ya da barkod başka bir üründe kullanılıyorsa o ürünü döndürür (yoksa null). Yazma
 * durunca (400 ms) sorar; eski cevaplar yenisini ezmez. Boş değer için sorulmaz.
 */
export function useDuplicate(kind: 'code' | 'barcode', value: string): DuplicateHit | null {
  const check = useContext(DuplicateCheckContext);
  const [found, setFound] = useState<{ value: string; hit: DuplicateHit | null } | null>(null);
  const text = value.trim();

  useEffect(() => {
    if (!check || text === '') return;
    let active = true;
    const timer = window.setTimeout(() => {
      check({ code: kind === 'code' ? text : '', barcode: kind === 'barcode' ? text : '' })
        .then((result) => {
          if (active) setFound({ value: text, hit: result[kind] });
        })
        .catch(() => {
          // Denetim yalnızca bilgi içindir; ağ hatasında sessizce vazgeçilir (kayıt yine denetler).
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [check, kind, text]);

  return text !== '' && found?.value === text ? found.hit : null;
}
