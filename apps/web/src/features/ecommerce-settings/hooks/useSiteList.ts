import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useWorkspace } from '../../workspace/workspace-context';

/**
 * Site içeriği listeleri (slider, widget, şablon değişkeni) için ortak veri kapısı.
 * Demo oturumunda yerel örnekler kullanılır ve sunucuya gidilmez; gerçek oturumda liste
 * mount'ta yüklenir, kayıt/silme sonrası `refresh` ile sessizce tazelenir.
 * `loaded` yalnızca başarılı bir yüklemeden sonra true olur; böylece hata halinde boş liste
 * "kayıt yok" gibi gösterilmez.
 */
export function useSiteList<T>(seed: readonly T[], load: () => Promise<T[]>) {
  const { demo } = useWorkspace();
  // Ekranlar WorkspaceProvider yüklemesi bitince mount olur; demo değeri bu noktada kesindir.
  const [items, setItems] = useState<T[]>(() => (demo ? [...seed] : []));
  const [loading, setLoading] = useState(!demo);
  const [loaded, setLoaded] = useState(demo);
  const [error, setError] = useState<string | null>(null);

  /** Yükleme iskeletini göstermeden tazeler (kayıt/silme sonrası). */
  const refresh = useCallback(async () => {
    if (demo) return;
    try {
      setItems(await load());
      setLoaded(true);
      setError(null);
    } catch (e) {
      setError(dataError(e));
    }
  }, [demo, load]);

  /** Hata sonrası "Yeniden Yükle": iskelet gösterir. */
  const reload = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await load());
      setLoaded(true);
    } catch (e) {
      setError(dataError(e));
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [demo, load]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void load()
      .then((list) => {
        if (active) {
          setItems(list);
          setLoaded(true);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(dataError(e));
          setLoaded(false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, load]);

  return { demo, items, setItems, loading, loaded, error, setError, refresh, reload };
}
