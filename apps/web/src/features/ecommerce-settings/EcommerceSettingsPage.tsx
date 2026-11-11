import { Link, useLocation } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { ECOMMERCE_BASE, ECOMMERCE_PAGES, ecommercePage } from '../../config/ecommerce-settings';
import { EcommerceShell, panelClass } from './components/Parts';
import { SystemSettingsScreen } from './components/SystemSettingsScreen';
import { PagesScreen } from './components/PagesScreen';
import { AppearanceScreen } from './components/AppearanceScreen';
import { MenuScreen } from './components/MenuScreen';
import { SlidersScreen } from './components/SlidersScreen';
import { WidgetsScreen } from './components/WidgetsScreen';
import { HeaderTextScreen } from './components/HeaderTextScreen';
import { DefaultsScreen } from './components/DefaultsScreen';
import { VariablesScreen } from './components/VariablesScreen';
import { ErpScreen, XmlScreen } from './components/IntegrationScreens';

/** E-ticaret ayarlarının giriş sayfası: 12 ekranın kartları. */
function EcommerceIndex() {
  return (
    <EcommerceShell description="E-ticaret sitesinin içerik, görünüm ve entegrasyon ayarları. Aşağıdaki ekranlar hazırlanıyor; kayıt backend bağlantısı gelince açılacak.">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {ECOMMERCE_PAGES.map((page) => (
          <Link
            key={page.key}
            to={`${ECOMMERCE_BASE}/${page.key}`}
            className={`${panelClass} group flex min-w-0 flex-col gap-2 transition-colors hover:border-brand-500 hover:bg-brand-50/40`}
          >
            <span className="flex items-center gap-2">
              <page.icon className="size-5 text-brand-ink" aria-hidden="true" />
              <span className="text-base font-extrabold">{page.title}</span>
              <ChevronRight
                className="ml-auto size-4 text-ink-muted transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="text-sm text-ink-muted">{page.description}</span>
          </Link>
        ))}
      </div>
    </EcommerceShell>
  );
}

/**
 * `/uygulama/ayarlar/eticaret/*` altındaki tüm ekranları çözer. Yeni bir ekran eklenince
 * `config/ecommerce-settings.ts` listesine ve buradaki eşlemeye bir satır yeterlidir.
 */
export function EcommerceSettingsPage() {
  const { pathname } = useLocation();
  const rest = pathname.startsWith(ECOMMERCE_BASE)
    ? pathname.slice(ECOMMERCE_BASE.length).replace(/^\/+/, '')
    : '';
  const [key = ''] = rest.split('/');
  if (!key) return <EcommerceIndex />;
  const page = ecommercePage(key);
  if (!page)
    return (
      <EcommerceShell>
        <Alert tone="info">Bu ayar sayfası bulunamadı. Soldaki sekmelerden birini seçin.</Alert>
      </EcommerceShell>
    );

  const screen = (() => {
    switch (key) {
      case 'sistem':
        return <SystemSettingsScreen />;
      case 'sayfalar':
        return <PagesScreen />;
      case 'gorunum':
        return <AppearanceScreen />;
      case 'menu':
        return <MenuScreen />;
      case 'sliderlar':
        return <SlidersScreen />;
      case 'widgetlar':
        return <WidgetsScreen />;
      case 'header-yazi':
        return <HeaderTextScreen />;
      case 'varsayilanlar':
        return <DefaultsScreen />;
      case 'sablon-degiskenleri':
        return <VariablesScreen />;
      case 'erp':
        return <ErpScreen />;
      case 'google-meta-xml':
        return <XmlScreen />;
      default:
        return <Alert tone="info">Bu ayar sayfası henüz hazırlanmadı.</Alert>;
    }
  })();

  return <EcommerceShell page={page}>{screen}</EcommerceShell>;
}
