import { FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router';
import { APP_HOME_PATH } from '../../config/navigation';
import { grantDevAccess } from './devAccess';

/** GEÇİCİ — bkz. devAccess.ts. "Yardıma mı İhtiyacınız Var?" bağlantısının altında durur. */
export function DevLoginButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        grantDevAccess();
        navigate(APP_HOME_PATH);
      }}
      className="-mx-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
    >
      <FlaskConical className="size-5" aria-hidden="true" />
      Test Kullanıcısı Olarak Devam Et
    </button>
  );
}
