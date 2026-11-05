import type { PublicUser } from '@gt/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../services/auth.api';

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: PublicUser };

interface SessionContextValue {
  session: SessionState;
  /** Yalnızca sunucunun doğruladığı kullanıcıyla çağrılır (login yanıtı veya /me). */
  setAuthenticated: (user: PublicUser) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Oturum durumu her zaman sunucudan gelir (HttpOnly cookie + /api/auth/me).
 * Tarayıcı depolamasında token veya kullanıcı bilgisi tutulmaz.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((user) => {
        if (!active) return;
        setSession(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null });
      })
      .catch(() => {
        // Ağ hatasında giriş seçenekleri gösterilir; giriş denemesi hatayı ayrıca bildirir.
        if (active) setSession({ status: 'anonymous', user: null });
      });
    return () => {
      active = false;
    };
  }, []);

  const setAuthenticated = useCallback((user: PublicUser) => {
    setSession({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(
    () => ({ session, setAuthenticated, logout }),
    [session, setAuthenticated, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession, SessionProvider içinde kullanılmalıdır.');
  return ctx;
}
