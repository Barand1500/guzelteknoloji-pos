import type { PublicUser } from '@gt/shared';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { NETWORK_ERROR_MESSAGE } from '../services/auth.messages';

interface SignedInPanelProps {
  user: PublicUser;
  onLogout: () => Promise<void>;
}

/** Bu sprintte panel/dashboard yok: başarılı girişten sonra doğrulanmış oturum burada gösterilir. */
export function SignedInPanel({ user, onLogout }: SignedInPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = user.displayName ?? user.email ?? 'Hesabınız';
  const initial = label.trim().charAt(0).toLocaleUpperCase('tr-TR');

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLogout();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="oturum-baslik" className="animate-rise-in">
      <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Güvenli oturum
      </div>
      <h2 id="oturum-baslik" className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        Giriş yaptınız
      </h2>

      <div className="mt-6 flex items-center gap-4 rounded-panel border border-line bg-surface-raised p-4 shadow-soft">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-ink"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{label}</p>
          {user.email && user.displayName ? (
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-muted">
        Hesap paneli bir sonraki aşamada bu ekrana eklenecek.
      </p>

      {error ? (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <Button
        variant="outline"
        className="mt-6"
        onClick={logout}
        loading={loading}
        loadingLabel="Çıkış Yapılıyor…"
        leadingIcon={<LogOut className="size-5" aria-hidden="true" />}
      >
        Çıkış Yap
      </Button>
    </section>
  );
}
