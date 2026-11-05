import { Navigate, Route, Routes } from 'react-router';
import { SessionProvider } from '../features/auth/hooks/session-context';
import { EMAIL_LOGIN_PATH, LOGIN_PATH, LoginPage } from '../pages/auth/LoginPage';

/** Bu sprintte yalnızca giriş deneyimi vardır; diğer tüm yollar /login'e yönlenir. */
export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path={LOGIN_PATH} element={<LoginPage view="options" />} />
        <Route path={EMAIL_LOGIN_PATH} element={<LoginPage view="email" />} />
        <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
      </Routes>
    </SessionProvider>
  );
}
