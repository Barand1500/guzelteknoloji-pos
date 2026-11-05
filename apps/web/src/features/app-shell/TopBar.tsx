import { LogOut, Moon, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { brandConfig } from '../../config/brand.config';
import { PAGE_TITLES } from '../../config/navigation';
import { LOGIN_PATH } from '../../pages/auth/LoginPage';
import { useSession } from '../auth/hooks/session-context';
import { revokeDevAccess } from '../dev-login/devAccess';
import { useTheme } from '../theme/ThemeProvider';

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink';

/** İnce üst çubuk: marka, sayfa başlığı, gece/gündüz anahtarı ve çıkış. */
export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const { mode, toggle } = useTheme();

  const signOut = async () => {
    revokeDevAccess(); // GEÇİCİ test girişi (features/dev-login)
    if (session.status === 'authenticated') await logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-4 tablet:px-8 tablet:pt-6">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-2xl bg-brand-700 text-sm font-extrabold text-white"
      >
        {brandConfig.monogram}
      </span>
      <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight text-ink">
        {PAGE_TITLES[pathname] ?? brandConfig.name}
      </h1>
      <button
        type="button"
        onClick={toggle}
        aria-label={mode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
        className={iconButton}
      >
        {mode === 'dark' ? (
          <Sun className="size-5" aria-hidden="true" />
        ) : (
          <Moon className="size-5" aria-hidden="true" />
        )}
      </button>
      <button type="button" onClick={signOut} aria-label="Çıkış Yap" className={iconButton}>
        <LogOut className="size-5" aria-hidden="true" />
      </button>
    </header>
  );
}
