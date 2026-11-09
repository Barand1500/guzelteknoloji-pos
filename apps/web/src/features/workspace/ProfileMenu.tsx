import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { UserRound, Users, ShieldCheck, Settings, History, LogOut, X } from 'lucide-react';
import { useWorkspace } from './workspace-context';
const items = [
  { path: 'profil', label: 'Profil', icon: UserRound, resource: null },
  { path: 'kullanicilar', label: 'Kullanıcılar', icon: Users, resource: 'users' },
  { path: 'roller', label: 'Roller', icon: ShieldCheck, resource: 'roles' },
  { path: 'ayarlar', label: 'Ayarlar', icon: Settings, resource: 'settings' },
  { path: 'loglar', label: 'Log Kayıtları', icon: History, resource: 'logs' },
] as const;
export function ProfileMenu({ onLogout }: { onLogout: () => Promise<void> }) {
  const { data, can } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const links = [
          ...root.current!.querySelectorAll<HTMLElement>('a,button:not([data-trigger])'),
        ];
        const i = links.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
      }
    };
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', away);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', away);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        data-trigger
        type="button"
        aria-label="Profil Menüsü"
        aria-expanded={open}
        aria-controls="profile-menu"
        onClick={() => setOpen(!open)}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <UserRound className="size-5" />
      </button>
      {open && (
        <div
          id="profile-menu"
          role="dialog"
          aria-label="Profil Menüsü"
          className="absolute top-13 right-0 z-50 w-64 rounded-3xl border border-line bg-surface-raised p-2 shadow-card"
        >
          <div className="flex items-start gap-2 border-b border-line px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{data?.user.name || 'Hesabım'}</p>
              <p className="truncate text-xs text-ink-muted">{data?.business.name}</p>
            </div>
            <button
              type="button"
              aria-label="Kapat"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              className="flex size-8 items-center justify-center rounded-full hover:bg-surface-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav aria-label="Hesap Menüsü" className="py-1">
            {items
              .filter((i) => !i.resource || can(i.resource))
              .map((i, n) => (
                <Link
                  ref={n === 0 ? first : undefined}
                  key={i.path}
                  to={`/uygulama/${i.path}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold hover:bg-surface-muted"
                >
                  <i.icon className="size-4 text-ink-muted" />
                  {i.label}
                </Link>
              ))}
          </nav>
          <div className="border-t border-line pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void onLogout().catch(() => {
                  setError(true);
                  setBusy(false);
                });
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <LogOut className="size-4" />
              {busy ? 'Çıkış Yapılıyor…' : 'Çıkış Yap'}
            </button>
            {error && (
              <p role="alert" className="px-3 py-1 text-xs text-danger">
                Çıkış yapılamadı. Tekrar deneyin.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
