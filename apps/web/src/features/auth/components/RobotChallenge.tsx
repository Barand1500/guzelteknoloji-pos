import { useEffect, useRef, useState } from 'react';
import type { ChallengeConfig } from '@gt/shared';
import { ApiError, apiRequest } from '../../../lib/http';
import { loginErrorMessage } from '../services/auth.messages';
import { Button } from '../../../components/ui/Button';

type WidgetApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string | number;
  remove?: (id: string | number) => void;
  ready?: (callback: () => void) => void;
};
const scripts = new Map<string, Promise<WidgetApi>>();
function load(provider: ChallengeConfig['provider']) {
  const existing = scripts.get(provider);
  if (existing) return existing;
  const promise = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      provider === 'cloudflare'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit&hl=tr';
    script.async = true;
    const timeout = window.setTimeout(() => {
      scripts.delete(provider);
      script.remove();
      reject(new Error('timeout'));
    }, 15000);
    script.onload = () => {
      const api = (window as unknown as { turnstile?: WidgetApi; grecaptcha?: WidgetApi })[
        provider === 'cloudflare' ? 'turnstile' : 'grecaptcha'
      ];
      if (!api) {
        window.clearTimeout(timeout);
        scripts.delete(provider);
        reject(new Error('missing'));
        return;
      }
      const ready = () => {
        window.clearTimeout(timeout);
        resolve(api);
      };
      // Turnstile is ready when its explicit script loads; Google exposes a separate ready hook.
      if (provider === 'recaptcha' && api.ready) api.ready(ready);
      else ready();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      scripts.delete(provider);
      script.remove();
      reject(new Error('script'));
    };
    document.head.appendChild(script);
  });
  scripts.set(provider, promise);
  return promise;
}

export function RobotChallenge({
  config,
  onToken,
}: {
  config: ChallengeConfig;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState('Doğrulama yükleniyor…');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) {
        setFailed(true);
        onToken('');
      }
    }, 45000);
    let id: string | number | undefined;
    let api: WidgetApi | undefined;
    void load(config.provider)
      .then((loaded) => {
        if (!active || !element) return;
        api = loaded;
        setStatus('Robot doğrulamasının tamamlanması bekleniyor.');
        id = api.render(element, {
          sitekey: config.siteKey,
          size: element.clientWidth > 0 && element.clientWidth < 304 ? 'compact' : 'normal',
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          callback: (token: string) => {
            if (active) {
              window.clearTimeout(timeout);
              setFailed(false);
              setStatus('Robot doğrulaması tamamlandı.');
              onToken(token);
            }
          },
          'expired-callback': () => {
            if (active) {
              onToken('');
              setFailed(true);
            }
          },
          'error-callback': () => {
            if (active) {
              onToken('');
              setFailed(true);
            }
          },
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      if (id !== undefined) api?.remove?.(id);
      element?.replaceChildren();
    };
  }, [config.provider, config.siteKey, onToken, attempt]);
  return (
    <div className="space-y-2">
      <div ref={container} aria-label="Robot doğrulaması" />
      {!failed && (
        <p role="status" className="text-sm text-ink-muted">
          {status}
        </p>
      )}
      {failed && (
        <>
          <p role="alert" className="text-sm text-danger">
            Doğrulama tamamlanamadı. Sağlayıcıdaki izinli alan adını ve anahtarları kontrol edin.
            Reklam engelleyici veya bağlantı sorunu da doğrulamayı engelleyebilir.
          </p>
          <Button
            type="button"
            variant="outline"
            fullWidth={false}
            flow={false}
            onClick={() => {
              onToken('');
              setFailed(false);
              setStatus('Doğrulama yükleniyor…');
              setAttempt((value) => value + 1);
            }}
          >
            Yeniden Dene
          </Button>
        </>
      )}
    </div>
  );
}

export function useRobotChallenge(email?: string) {
  const configKey = useRef('');
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [token, setToken] = useState('');
  const [revision, setRevision] = useState(0);
  const [loadedEmail, setLoadedEmail] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      () => {
        void apiRequest<{ challenge: ChallengeConfig | null }>('/api/auth/robot', {
          method: 'POST',
          body: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { email } : {},
        })
          .then((result) => {
            if (!active || !result || !('challenge' in result)) return;
            const key = result.challenge
              ? `${result.challenge.provider}:${result.challenge.siteKey}`
              : '';
            if (configKey.current !== key) {
              configKey.current = key;
              setToken('');
              setConfig(result.challenge);
            }
          })
          .catch(() => {
            /* Giriş uçları doğrulamayı sunucuda zorunlu tutmaya devam eder. */
          })
          .finally(() => {
            if (active) setLoadedEmail(email ?? '');
          });
      },
      email ? 350 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [email]);
  return {
    token,
    pending:
      (!!config && !token) ||
      (loadedEmail !== (email ?? '') && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))),
    widget: config ? <RobotChallenge key={revision} config={config} onToken={setToken} /> : null,
    error: (error: unknown) => {
      if (error instanceof ApiError && error.challenge) {
        configKey.current = `${error.challenge.provider}:${error.challenge.siteKey}`;
        setConfig(error.challenge);
      }
      setToken('');
      setRevision((n) => n + 1);
      return error instanceof ApiError && error.challenge ? '' : loginErrorMessage(error);
    },
    reset: () => {
      setToken('');
      setRevision((n) => n + 1);
    },
  };
}
