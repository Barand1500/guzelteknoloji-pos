import { Navigate, Route, Routes } from 'react-router';
import { APP_BASE, APP_HOME_PATH } from '../config/navigation';
import { AppShell } from '../features/app-shell/AppShell';
import { RequireAccess } from '../features/app-shell/RequireAccess';
import { SessionProvider } from '../features/auth/hooks/session-context';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { AttributesPage } from '../pages/app/AttributesPage';
import { BulkImagesPage } from '../pages/app/BulkImagesPage';
import { DealsPage } from '../pages/app/DealsPage';
import { ProductsPage } from '../pages/app/ProductsPage';
import { CategoriesPage } from '../pages/app/CategoriesPage';
import { CurrenciesPage } from '../features/currencies/components/CurrenciesPage';
import { HolidaysPage } from '../features/holidays/components/HolidaysPage';
import { NotificationsPage } from '../features/notifications/components/NotificationsPage';
import { PaymentsPage } from '../features/payments/components/PaymentsPage';
import { ShippingPage } from '../features/shipping/components/ShippingPage';
import { StockDefsPage } from '../features/stockdefs/components/StockDefsPage';
import { TaxesPage } from '../features/taxes/components/TaxesPage';
import { CampaignPage } from '../features/campaigns/components/CampaignPage';
import { EcommerceSettingsPage } from '../features/ecommerce-settings/EcommerceSettingsPage';
import { ComingSoonPage } from '../pages/app/ComingSoonPage';
import { HomePage } from '../pages/app/HomePage';
import { OrdersPage, ReturnsPage } from '../pages/app/OrdersPage';
import { CustomerLayout } from '../features/customers/components/CustomerLayout';
import { CustomersView } from '../features/customers/components/CustomersView';
import { CustomerDetailView } from '../features/customers/components/CustomerDetailView';
import { BrandsPage } from '../pages/app/BrandsPage';
import { StockCardCreatePage } from '../pages/app/StockCardCreatePage';
import { EMAIL_LOGIN_PATH, LOGIN_PATH, LoginPage } from '../pages/auth/LoginPage';
import {
  ProfilePage,
  UsersPage,
  RolesPage,
  SettingsIndexPage,
  SettingsPage,
  LogsPage,
} from '../features/workspace/WorkspacePages';

/** Giriş ekranları + girişten sonraki uygulama (AppShell içinde). Yeni sayfa: burada yol ekleyin. */
export function App() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Routes>
          <Route path={LOGIN_PATH} element={<LoginPage view="options" />} />
          <Route path={EMAIL_LOGIN_PATH} element={<LoginPage view="email" />} />

          <Route
            path={APP_BASE}
            element={
              <RequireAccess>
                <AppShell />
              </RequireAccess>
            }
          >
            <Route index element={<Navigate to={APP_HOME_PATH} replace />} />
            <Route path="stok-karti/yeni" element={<StockCardCreatePage />} />
            <Route path="stok-karti/:cardId" element={<StockCardCreatePage />} />
            {/* Sıradaki adımlarda tek tek tasarlanacak sayfalar */}
            <Route path="urunler" element={<ProductsPage />} />
            <Route path="urunler/firsatlar" element={<DealsPage />} />
            <Route path="urunler/toplu-gorsel" element={<BulkImagesPage />} />
            <Route path="kategoriler" element={<CategoriesPage />} />
            <Route path="markalar" element={<BrandsPage />} />
            <Route path="ozellikler" element={<AttributesPage />} />
            {['seo'].map((path) => (
              <Route key={path} path={path} element={<ComingSoonPage />} />
            ))}
            <Route path="anasayfa" element={<HomePage />} />
            <Route path="bildirimler">
              <Route index element={<Navigate to="mobil" replace />} />
              <Route path="mobil" element={<NotificationsPage />} />
            </Route>
            <Route path="tanimlamalar">
              <Route index element={<Navigate to="kargo" replace />} />
              <Route path="kargo" element={<ShippingPage />} />
              <Route path="para-birimleri" element={<CurrenciesPage />} />
              <Route path="vergiler" element={<TaxesPage />} />
              <Route path="cari-stok" element={<StockDefsPage />} />
              <Route path="odeme-sekilleri" element={<PaymentsPage />} />
              <Route path="resmi-tatiller" element={<HolidaysPage />} />
            </Route>
            <Route path="kampanyalar">
              <Route index element={<Navigate to="sepet-indirimi" replace />} />
              <Route path="sepet-indirimi" element={<CampaignPage kind="cart" />} />
              <Route path="ucretsiz-kargo" element={<CampaignPage kind="shipping" />} />
            </Route>
            <Route path="musteriler" element={<CustomerLayout />}>
              <Route index element={<CustomersView />} />
              <Route path=":id" element={<CustomerDetailView />} />
            </Route>
            <Route path="siparisler" element={<OrdersPage />} />
            <Route path="siparisler/iade" element={<ReturnsPage />} />
            <Route path="profil" element={<ProfilePage />} />
            <Route path="kullanicilar" element={<UsersPage />} />
            <Route path="roller" element={<RolesPage />} />
            <Route path="ayarlar" element={<SettingsIndexPage />} />
            <Route path="ayarlar/entegrasyonlar" element={<SettingsIndexPage integrations />} />
            {/* E-ticaret ayarları tek yıldızla: liste ve form ekranları içeride çözülür. */}
            <Route path="ayarlar/eticaret/*" element={<EcommerceSettingsPage />} />
            <Route path="ayarlar/:section" element={<SettingsPage />} />
            <Route path="loglar" element={<LogsPage />} />
          </Route>

          <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
        </Routes>
      </ThemeProvider>
    </SessionProvider>
  );
}
