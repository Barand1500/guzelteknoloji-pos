import { Navigate, useLocation } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { ECOMMERCE_BASE, ecommercePage } from '../../config/ecommerce-settings';
import { EcommerceShell } from './components/Parts';
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

/** E-ticaret ayarlarının giriş sayfası kaldırıldı; kök adres Sistem'e yönlenir. */

/**
 * `/uygulama/ayarlar/eticaret/*` altındaki tüm ekranları çözer. Yeni bir ekran eklenince
 * `config/ecommerce-settings.ts` listesine ve buradaki eşlemeye bir satır yeterlidir.
 *
 * Kök adres (`/eticaret`) artık kart menüsü göstermez: doğrudan **Sistem** ekranı açılır,
 * diğer ekranlara üstteki sekme şeridinden geçilir.
 */
export function EcommerceSettingsPage() {
  const { pathname } = useLocation();
  const rest = pathname.startsWith(ECOMMERCE_BASE)
    ? pathname.slice(ECOMMERCE_BASE.length).replace(/^\/+/, '')
    : '';
  const [key = ''] = rest.split('/');
  if (!key) return <Navigate to={`${ECOMMERCE_BASE}/sistem`} replace />;
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
