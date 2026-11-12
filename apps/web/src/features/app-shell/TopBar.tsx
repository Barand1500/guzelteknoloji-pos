import { LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { brandConfig } from '../../config/brand.config';
import { APP_BASE, pageTitle } from '../../config/navigation';
import { LOGIN_PATH } from '../../pages/auth/LoginPage';
import { useSession } from '../auth/hooks/session-context';
import { hasDevAccess, revokeDevAccess } from '../dev-login/devAccess';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { useTheme } from '../theme/ThemeProvider';
import { FavoritesBar } from './FavoritesBar';
import { Greeting } from './Greeting';
import { SectionMenu } from './SectionMenu';
import { firstNameOf } from './greeting-text';

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink';

/**
 * İnce üst çubuk: marka, sayfa başlığı; sağda sırayla (geniş ekranda) üç favori yuvası, gece/gündüz anahtarı, selamlama ("Günaydın
 * Baran") ve çıkış. Telefonda yer dar olduğu için selamlama başlığın altına küçük yazılır.
 */
export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const { mode, toggle } = useTheme();
  const wide = useMediaQuery('(min-width: 40rem)');
  const large = useMediaQuery('(min-width: 64rem)');
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
      <SectionMenu />
      {/* Sayfa başlığı görsel olarak üst menü düğmesine taşındı; ekran okuyucular için durur. */}
      <h1 className="sr-only">{pageTitle(pathname) ?? brandConfig.name}</h1>
      <div className="min-w-0 flex-1">
        {wide ? null : <Greeting name={name} className="text-xs" />}
      </div>
      {/* Favori sayfalar: yalnızca geniş ekranda, gece/gündüz düğmesinin yanında */}
      {large ? <FavoritesBar /> : null}
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
      {/* Profil simgesi menü açmaz: doğrudan profil sayfasına götürür. Çıkış ayrı düğmedir. */}
      <Link
        to={`${APP_BASE}/profil`}
        aria-label="Profil"
        title="Profil"
        aria-current={pathname === `${APP_BASE}/profil` ? 'page' : undefined}
        className={`${iconButton} aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-ink`}
      >
        <UserRound className="size-5" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Çıkış Yap"
        title="Çıkış Yap"
        className={`${iconButton} hover:bg-danger-soft hover:text-danger`}
      >
        <LogOut className="size-5" aria-hidden="true" />
      </button>
    </header>
  );
}
