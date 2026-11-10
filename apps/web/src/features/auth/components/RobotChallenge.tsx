import { useEffect, useRef, useState } from 'react';
import type { ChallengeConfig } from '@gt/shared';
import { ApiError } from '../../../lib/http';
import { loginErrorMessage } from '../services/auth.messages';

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
      window.clearTimeout(timeout);
      const api = (window as unknown as { turnstile?: WidgetApi; grecaptcha?: WidgetApi })[
        provider === 'cloudflare' ? 'turnstile' : 'grecaptcha'
      ];
      if (!api) {
        scripts.delete(provider);
        reject(new Error('missing'));
        return;
      }
      if (api.ready) api.ready(() => resolve(api));
      else resolve(api);
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
  useEffect(() => {
    let active = true;
    let id: string | number | undefined;
    let api: WidgetApi | undefined;
    void load(config.provider)
      .then((loaded) => {
        if (!active || !container.current) return;
        api = loaded;
        id = api.render(container.current, {
          sitekey: config.siteKey,
          size: 'compact',
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          callback: (token: string) => {
            if (active) onToken(token);
          },
          'expired-callback': () => {
            if (active) onToken('');
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
      if (id !== undefined) api?.remove?.(id);
    };
  }, [config.provider, config.siteKey, onToken]);
  return (
    <div className="space-y-2">
      <div ref={container} aria-label="Robot doğrulaması" />
      {failed && (
        <p role="alert" className="text-sm text-danger">
          Robot doğrulaması yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.
        </p>
      )}
    </div>
  );
}

export function useRobotChallenge() {
  const [config, setConfig] = useState<ChallengeConfig | null>(null);
  const [token, setToken] = useState('');
  const [revision, setRevision] = useState(0);
  return {
    token,
    widget: config ? <RobotChallenge key={revision} config={config} onToken={setToken} /> : null,
    error: (error: unknown) => {
      if (error instanceof ApiError && error.challenge) setConfig(error.challenge);
      setToken('');
      setRevision((n) => n + 1);
      return loginErrorMessage(error);
    },
    reset: () => {
      setToken('');
      setRevision((n) => n + 1);
    },
  };
}
