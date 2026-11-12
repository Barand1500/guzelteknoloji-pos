import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useWorkspace } from '../../workspace/workspace-context';
import { siteService } from '../services/site.service';

/**
 * Bir e-ticaret ayar bölümünü sunucudan yükler ve kaydeder.
 * Test kullanıcısında (demo) sunucuya yazılmaz; ekran yerel değerlerle çalışır.
 */
export function useSiteSettings(section: string, defaults: Record<string, string>) {
  const { demo } = useWorkspace();
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  // Sunucudan bir kez başarıyla yüklendi mi? Yüklenmeden "Kaydet"e basılırsa alanlar
  // varsayılan değerlerle ezilirdi; düğme bu yüzden `ready` olana kadar kapalıdır.
  const [ready, setReady] = useState(demo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (demo) {
      return;
    }
    let active = true;
    void siteService
      .loadSettings(section)
      .then((result) => {
        if (active) {
          setValues({ ...defaults, ...result.values });
          setReady(true);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(dataError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // defaults her render'da yeni nesne; yalnızca bölüm değişince yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, section]);

  const save = useCallback(async () => {
    if (saving) return;
    setError(null);
    setMessage(null);
    if (demo) {
      setMessage('Test modunda değişiklikler kaydedilmez.');
      return;
    }
    setSaving(true);
    try {
      const result = await siteService.saveSettings(section, values);
      setValues((previous) => ({ ...previous, ...result.values }));
      setMessage('Kaydedildi.');
    } catch (e) {
      setError(dataError(e));
    } finally {
      setSaving(false);
    }
  }, [demo, saving, section, values]);

  return {
    values,
    setValues,
    setValue: (key: string, value: string) =>
      setValues((previous) => ({ ...previous, [key]: value })),
    loading: demo ? false : loading,
    ready: demo ? true : ready,
    saving,
    error,
    message,
    save,
  };
}
