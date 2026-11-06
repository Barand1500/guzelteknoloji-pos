import { Navigate, Route, Routes } from 'react-router';
import { APP_BASE, APP_HOME_PATH } from '../config/navigation';
import { AppShell } from '../features/app-shell/AppShell';
import { RequireAccess } from '../features/app-shell/RequireAccess';
import { SessionProvider } from '../features/auth/hooks/session-context';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { AttributesPage } from '../pages/app/AttributesPage';
import { DealsPage } from '../pages/app/DealsPage';
import { ProductEditPage } from '../pages/app/ProductEditPage';
import { ProductsPage } from '../pages/app/ProductsPage';
import { CategoriesPage } from '../pages/app/CategoriesPage';
import { BrandsPage } from '../pages/app/BrandsPage';
import { StockCardCreatePage } from '../pages/app/StockCardCreatePage';
import { EMAIL_LOGIN_PATH, LOGIN_PATH, LoginPage } from '../pages/auth/LoginPage';

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
            {/* Sıradaki adımlarda tek tek tasarlanacak sayfalar */}
            <Route path="urunler" element={<ProductsPage />} />
            <Route path="urunler/firsatlar" element={<DealsPage />} />
            <Route path="urunler/:productId" element={<ProductEditPage />} />
            <Route path="kategoriler" element={<CategoriesPage />} />
            <Route path="markalar" element={<BrandsPage />} />
            <Route path="ozellikler" element={<AttributesPage />} />
          </Route>

          <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
        </Routes>
      </ThemeProvider>
    </SessionProvider>
  );
}
