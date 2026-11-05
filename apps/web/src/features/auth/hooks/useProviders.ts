import { useEffect, useState } from 'react';
import { authApi } from '../services/auth.api';

export interface ProviderAvailability {
  /** `null`: henüz bilinmiyor (yükleniyor veya API'ye ulaşılamadı). */
  google: boolean | null;
  apple: boolean | null;
}

export function useProviders(): ProviderAvailability {
  const [state, setState] = useState<ProviderAvailability>({ google: null, apple: null });
  useEffect(() => {
    let active = true;
    authApi
      .providers()
      .then((p) => active && setState({ google: p.google, apple: p.apple }))
      .catch(() => active && setState({ google: null, apple: null }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}
