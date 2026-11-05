import { useState } from 'react';

const MAX_PAGE_SIZE = 200;

/** Sayfa elemanlarını ve aralık bilgisini hesaplar (liste ekranlarında ortak kullanılır). */
export function usePagination<T>(items: T[], defaultSize = 10) {
  const [page, setPage] = useState(1);
  // Kullanıcı sayıyı yazarken kutu geçici olarak boş kalabilir; bu durumda varsayılan boyut kullanılır.
  const [sizeText, setSizeTextRaw] = useState(String(defaultSize));

  const parsed = Number.parseInt(sizeText, 10);
  const pageSize =
    Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGE_SIZE) : defaultSize;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Silme gibi nedenlerle sayfa sayısı azalırsa son sayfaya dönülür.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    /** Sayfanın tüm listedeki ilk sırası (0'dan). */
    start,
    page: current,
    setPage,
    pageCount,
    pageSize,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: start + pageItems.length,
    sizeText,
    /** Sayfa başına adet değişince ilk sayfaya dönülür. */
    setSizeText: (text: string) => {
      setSizeTextRaw(text);
      setPage(1);
    },
  };
}

export type Pagination<T> = ReturnType<typeof usePagination<T>>;
