import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FaApple } from 'react-icons/fa6';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { useProviders } from '../hooks/useProviders';
import { authApi } from '../services/auth.api';
import {
  APPLE_NOT_CONFIGURED_MESSAGE,
  GOOGLE_NOT_CONFIGURED_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from '../services/auth.messages';
import { GoogleIcon } from './GoogleIcon';

type Provider = 'google' | 'apple';

interface AuthOptionsProps {
  onEmailSelected: () => void;
  /** Sosyal giriş dönüşünden gelen (?hata=) mesaj. */
  initialError: string | null;
  /** Testlerde tam sayfa yönlendirmeyi izlemek için. */
  navigate?: (url: string) => void;
}

export function AuthOptions({
  onEmailSelected,
  initialError,
  navigate = (url) => window.location.assign(url),
}: AuthOptionsProps) {
  const providers = useProviders();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [message, setMessage] = useState<string | null>(initialError);

  // Kullanıcı sağlayıcı ekranından "geri" ile dönerse (bfcache) buton yükleniyor durumunda kalmasın.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoadingProvider(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const startProvider = (provider: Provider) => {
    const available = providers[provider];
    // Yapılandırılmamışsa ya da API'ye ulaşılamıyorsa tarayıcıyı boş/502 sayfasına göndermeyiz.
    if (available !== true) {
      setMessage(
        available === false
          ? provider === 'google'
            ? GOOGLE_NOT_CONFIGURED_MESSAGE
            : APPLE_NOT_CONFIGURED_MESSAGE
          : NETWORK_ERROR_MESSAGE,
      );
      return;
    }
    setMessage(null);
    setLoadingProvider(provider);
    navigate(authApi.providerStartUrl(provider));
  };

  const busy = loadingProvider !== null;

  return (
    <section aria-labelledby="giris-baslik">
      <h2 id="giris-baslik" className="text-2xl font-extrabold tracking-tight text-ink">
        Hesabınıza giriş yapın!
      </h2>
      <p className="mt-1.5 text-base text-ink-muted">Devam etmek için bir yöntem seçin.</p>

      {message ? (
        <div className="mt-6">
          <Alert tone="error">{message}</Alert>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-3.5">
        <Button
          variant="outline"
          onClick={() => startProvider('google')}
          loading={loadingProvider === 'google'}
          disabled={busy && loadingProvider !== 'google'}
          loadingLabel="Google'a Yönlendiriliyor…"
          leadingIcon={<GoogleIcon />}
        >
          Google İle Devam Et
        </Button>
        <Button
          variant="outline"
          onClick={() => startProvider('apple')}
          loading={loadingProvider === 'apple'}
          disabled={busy && loadingProvider !== 'apple'}
          loadingLabel="Apple'a Yönlendiriliyor…"
          leadingIcon={<FaApple className="size-5" aria-hidden="true" />}
        >
          Apple İle Devam Et
        </Button>

        <div role="separator" className="flex items-center gap-4 py-1 text-sm text-ink-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span>veya</span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>

        <Button
          variant="primary"
          onClick={onEmailSelected}
          disabled={busy}
          leadingIcon={<Mail className="size-5" aria-hidden="true" />}
        >
          E-Posta İle Devam Et
        </Button>
      </div>
    </section>
  );
}
