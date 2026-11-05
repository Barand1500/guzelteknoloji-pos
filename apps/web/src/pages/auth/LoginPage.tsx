import { LifeBuoy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Spinner } from '../../components/ui/Spinner';
import { brandConfig } from '../../config/brand.config';
import { AuthLayout } from '../../features/auth/components/AuthLayout';
import { AuthOptions } from '../../features/auth/components/AuthOptions';
import { EmailLoginForm } from '../../features/auth/components/EmailLoginForm';
import { SignedInPanel } from '../../features/auth/components/SignedInPanel';
import { useSession } from '../../features/auth/hooks/session-context';
import { googleErrorMessage } from '../../features/auth/services/auth.messages';
import { SupportSheet } from '../../features/support/SupportSheet';

export const LOGIN_PATH = '/login';
export const EMAIL_LOGIN_PATH = '/login/e-posta';

/**
 * E-posta görünümü ayrı bir route'tur (/login/e-posta): mobilde tarayıcının "geri" hareketi
 * doğal çalışır, aynı düzen içinde kalınır ve sayfa yeniden yüklenmez.
 */
export function LoginPage({ view }: { view: 'options' | 'email' }) {
  const navigate = useNavigate();
  const { session, setAuthenticated, logout } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [helpOpen, setHelpOpen] = useState(false);
  // Görünümler arası geçiş: çıkan görünüm kayıp gider, yenisi karşı yönden gelir.
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const goTo = (path: string) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    if (reduce) return navigate(path);
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      navigate(path);
    }, 200);
  };
  const transitionClass = leaving
    ? view === 'options'
      ? 'animate-out-down'
      : 'animate-out-up'
    : view === 'email'
      ? 'animate-in-from-top'
      : 'animate-in-from-bottom';
  // Google dönüşündeki ?hata= bir kez okunur, ardından adres çubuğundan temizlenir.
  const [googleError] = useState(() => googleErrorMessage(searchParams.get('hata')));

  useEffect(() => {
    document.title = `Giriş yap · ${brandConfig.name}`;
  }, []);

  useEffect(() => {
    if (searchParams.has('hata')) {
      const next = new URLSearchParams(searchParams);
      next.delete('hata');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  let content;
  if (session.status === 'loading') {
    content = (
      <div className="flex min-h-48 items-center justify-center text-brand-700" role="status">
        <Spinner className="size-7" />
        <span className="sr-only">Oturum bilgisi kontrol ediliyor…</span>
      </div>
    );
  } else if (session.status === 'authenticated') {
    content = <SignedInPanel user={session.user} onLogout={logout} />;
  } else if (view === 'email') {
    content = (
      <EmailLoginForm
        onBack={() => goTo(LOGIN_PATH)}
        onSuccess={(user) => {
          setAuthenticated(user);
          navigate(LOGIN_PATH, { replace: true });
        }}
      />
    );
  } else {
    content = (
      <AuthOptions onEmailSelected={() => goTo(EMAIL_LOGIN_PATH)} initialError={googleError} />
    );
  }

  return (
    <AuthLayout>
      <div className={transitionClass}>{content}</div>

      {/* mt-auto: mobilde yardım bağlantısı ekranın altına yerleşir, içerik uzarsa doğal akışta kalır. */}
      <div className="mt-auto pt-8 tablet:pt-10">
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-haspopup="dialog"
            className="-mx-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-brand-700 underline-offset-4 transition-colors hover:bg-brand-50 hover:underline"
          >
            <LifeBuoy className="size-5" aria-hidden="true" />
            Yardıma Mı İhtiyacınız Var?
          </button>
        </div>
      </div>

      <SupportSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AuthLayout>
  );
}
