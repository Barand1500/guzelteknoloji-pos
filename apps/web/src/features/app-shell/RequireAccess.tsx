import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '../../components/ui/Spinner';
import { LOGIN_PATH } from '../../pages/auth/LoginPage';
import { useSession } from '../auth/hooks/session-context';
import { hasDevAccess } from '../dev-login/devAccess';

/** Uygulama ekranlarına yalnızca giriş yapmış kullanıcı girer; yoksa /login'e gider. */
export function RequireAccess({ children }: { children: ReactNode }) {
  const { session } = useSession();
  // GEÇİCİ: test kullanıcısı işareti (features/dev-login). Gerçek giriş gelince bu satır silinir.
  if (hasDevAccess()) return <>{children}</>;
  if (session.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center text-brand-ink" role="status">
        <Spinner className="size-7" />
        <span className="sr-only">Yükleniyor…</span>
      </div>
    );
  }
  if (session.status === 'anonymous') return <Navigate to={LOGIN_PATH} replace />;
  return <>{children}</>;
}
