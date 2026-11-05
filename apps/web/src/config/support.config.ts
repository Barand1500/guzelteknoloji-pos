/**
 * Yardım penceresi yapılandırması. Değerler sır değildir; derleme anında VITE_SUPPORT_*
 * değişkenlerinden okunur. Form adresi geçerli bir https adresi değilse form gösterilmez
 * (boş durum çıkar); sahte/bozuk bağlantı asla gömülmez.
 */
export interface SupportConfig {
  title: string;
  /** Gömülecek destek formunun tam adresi (https) veya null. */
  formUrl: string | null;
  /** Formun origin'i; postMessage ve CSP `frame-src` doğrulaması için. */
  formOrigin: string | null;
}

export type SupportEnv = Partial<Record<string, string | undefined>>;

const blankToNull = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

function parseFormUrl(raw: string | null): URL | null {
  if (raw === null) return null;
  try {
    const url = new URL(raw);
    // Yalnızca https: karışık içerik ve javascript:/data: gibi şemalar reddedilir.
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function createSupportConfig(env: SupportEnv): SupportConfig {
  const rawUrl = blankToNull(env.VITE_SUPPORT_FORM_URL);
  const url = parseFormUrl(rawUrl);
  if (rawUrl !== null && url === null && import.meta.env.DEV) {
    console.warn('[destek] VITE_SUPPORT_FORM_URL geçerli bir https adresi olmadığı için gizlendi.');
  }
  return {
    title: blankToNull(env.VITE_SUPPORT_TITLE) ?? 'Yardıma Mı İhtiyacınız Var?',
    formUrl: url ? url.href : null,
    formOrigin: url ? url.origin : null,
  };
}

export const supportConfig = createSupportConfig(import.meta.env);
