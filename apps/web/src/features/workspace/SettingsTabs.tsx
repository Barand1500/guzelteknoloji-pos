import { Image as ImageIcon, Mail, Settings, Store } from 'lucide-react';
import { Link } from 'react-router';
import { ECOMMERCE_BASE, ECOMMERCE_PAGES } from '../../config/ecommerce-settings';

const tabStyle = (active: boolean) =>
  `flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
    active ? 'border-brand-700 text-brand-ink' : 'border-transparent text-ink-muted hover:text-ink'
  }`;

const chipStyle = (active: boolean) =>
  `flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
    active
      ? 'border-brand-500/40 bg-brand-50 text-brand-ink'
      : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink'
  }`;

/**
 * Ayarlar'ın ortak sekme şeridi. Üst seviye: Genel · Görseller · Entegrasyonlar · E-Ticaret.
 * E-Ticaret seçiliyken ikinci satırda 12 e-ticaret ekranının kısa adları görünür; form ekranlarında
 * (ör. sayfalar/yeni) ait olduğu sekme seçili kalır.
 */
export function SettingsTabs({ pathname }: { pathname: string }) {
  const ecommerce = pathname.startsWith(ECOMMERCE_BASE);
  const tabs = [
    {
      key: 'general',
      label: 'Genel',
      icon: Settings,
      active: pathname.endsWith('/ayarlar') || pathname.endsWith('/general'),
    },
    { key: 'images', label: 'Görseller', icon: ImageIcon, active: pathname.endsWith('/images') },
    {
      key: 'entegrasyonlar',
      label: 'Entegrasyonlar',
      icon: Mail,
      active:
        /\/(smtp|imap|google|cloudflare|whatsapp|sms|recaptcha|entegrasyonlar|iletisim|robot-dogrulama|sosyal-giris)$/.test(
          pathname,
        ),
    },
    { key: 'eticaret', label: 'E-Ticaret', icon: Store, active: ecommerce },
  ];
  return (
    <div className="space-y-1">
      <nav
        aria-label="Ayar bölümleri"
        className="flex overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={`/uygulama/ayarlar/${t.key}`}
            aria-current={t.active ? 'page' : undefined}
            className={tabStyle(t.active)}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
      </nav>
      {tabs[2]?.active && (
        <nav
          aria-label="Entegrasyonlar"
          className="flex overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[
            ['iletisim', 'İletişim'],
            ['robot-dogrulama', 'Doğrulama'],
            ['sosyal-giris', 'Hızlı Giriş'],
          ].map(([key, label]) => {
            const active =
              pathname.endsWith(`/${key}`) ||
              (key === 'iletisim' && /\/(smtp|imap|whatsapp|entegrasyonlar)$/.test(pathname)) ||
              (key === 'robot-dogrulama' && /\/(cloudflare|recaptcha)$/.test(pathname)) ||
              (key === 'sosyal-giris' && pathname.endsWith('/google'));
            return (
              <Link
                key={key}
                to={`/uygulama/ayarlar/${key}`}
                aria-current={active ? 'page' : undefined}
                className={tabStyle(active)}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      {ecommerce && (
        <nav
          aria-label="E-Ticaret ayarları"
          className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ECOMMERCE_PAGES.map((page) => {
            const path = `${ECOMMERCE_BASE}/${page.key}`;
            const active = pathname === path || pathname.startsWith(`${path}/`);
            return (
              <Link
                key={page.key}
                to={path}
                aria-current={active ? 'page' : undefined}
                className={chipStyle(active)}
              >
                <page.icon className="mr-1 size-4" aria-hidden="true" />
                {page.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
