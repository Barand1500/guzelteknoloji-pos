import { Moon, Sun } from 'lucide-react';
import { ProfileMenu } from '../workspace/ProfileMenu';
import { useLocation, useNavigate } from 'react-router';
import { brandConfig } from '../../config/brand.config';
import { pageTitle } from '../../config/navigation';
import { LOGIN_PATH } from '../../pages/auth/LoginPage';
import { useSession } from '../auth/hooks/session-context';
import { hasDevAccess, revokeDevAccess } from '../dev-login/devAccess';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useTheme } from '../theme/ThemeProvider';
import { Greeting } from './Greeting';
import { firstNameOf } from './greeting-text';

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink';

/**
 * İnce üst çubuk: marka, sayfa başlığı; sağda sırayla gece/gündüz anahtarı, selamlama ("Günaydın
 * Baran") ve çıkış. Telefonda yer dar olduğu için selamlama başlığın altına küçük yazılır.
 */
export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const { mode, toggle } = useTheme();
  const wide = useMediaQuery('(min-width: 40rem)');
  // Geçici test girişinde (kimlik yok) "Test Kullanıcısı" selamlanır.
  const name =
    session.status === 'authenticated'
      ? firstNameOf(session.user)
      : hasDevAccess()
        ? 'Test Kullanıcısı'
        : null;

  const signOut = async () => {
    revokeDevAccess(); // GEÇİCİ test girişi (features/dev-login)
    if (session.status === 'authenticated') await logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <header className="mx-auto flex w-full max-w-[120rem] items-center gap-3 px-4 pt-4 tablet:px-8 tablet:pt-6 2xl:px-12">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-2xl bg-brand-700 text-sm font-extrabold text-white"
      >
        {brandConfig.monogram}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-extrabold tracking-tight text-ink">
          {pageTitle(pathname) ?? brandConfig.name}
        </h1>
        {wide ? null : <Greeting name={name} className="text-xs" />}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={mode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
        className={iconButton}
      >
        {mode === 'dark' ? (
          <Sun className="size-5" fill="currentColor" aria-hidden="true" />
        ) : (
          <Moon className="size-5" aria-hidden="true" />
        )}
      </button>
      {wide ? <Greeting name={name} className="max-w-[16rem] px-1 text-sm" /> : null}
      <ProfileMenu onLogout={signOut} />
    </header>
  );
}
