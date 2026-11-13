import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  WORKSPACE_RESOURCES,
  type PermissionAction,
  type WorkspaceContext as WorkspaceData,
  type WorkspaceResource,
} from '@gt/shared';
import { apiRequest } from '../../lib/http';
import { dataError } from '../../lib/catalog-data';
import { useSession } from '../auth/hooks/session-context';
import { hasDevAccess } from '../dev-login/devAccess';
import { useLocation } from 'react-router';

const Context = createContext<{
  data: WorkspaceData | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  resource: WorkspaceResource | null;
  refresh: () => Promise<void>;
  can: (resource: WorkspaceResource, action?: PermissionAction) => boolean;
} | null>(null);

/** Test kullanıcısının şeffaflık tercihleri localStorage'da tutulur (sunucuya yazılmaz). */
const DEMO_APPEARANCE_KEY = 'gt-demo-image-appearance';

function readDemoImageAppearance(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DEMO_APPEARANCE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function writeDemoImageAppearance(page: string, value: boolean) {
  const current = readDemoImageAppearance();
  current[page] = value ? 'true' : 'false';
  try {
    localStorage.setItem(DEMO_APPEARANCE_KEY, JSON.stringify(current));
  } catch {
    /* localStorage kullanılamıyorsa tercih yalnızca oturum boyunca geçerli olur */
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { session } = useSession();
  const demo = session.status === 'anonymous' && hasDevAccess();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (demo) {
      setData({
        business: { id: 0, name: 'Deneme İşletmesi' },
        user: { id: 0, name: 'Test Kullanıcısı', email: null },
        owner: true,
        permissions: WORKSPACE_RESOURCES.map((r) => ({
          resource: r.key,
          read: true,
          save: true,
          delete: true,
        })),
        imageAppearance: readDemoImageAppearance(),
      });
      setLoading(false);
      return;
    }
    if (session.status !== 'authenticated') return;
    try {
      setData(await apiRequest<WorkspaceData>('/api/hesap'));
      setError(null);
    } catch (e) {
      setData(null);
      setError(dataError(e));
    } finally {
      setLoading(false);
    }
  }, [demo, session.status]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        demo,
        resource: pageResource(pathname),
        refresh,
        can: (resource, action = 'read') =>
          !!data &&
          (data.owner ||
            data.permissions.some((p) => p.resource === resource && p.read && p[action])),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('WorkspaceProvider gerekli');
  return ctx;
}
export function useImageAppearance(page: string) {
  return useContext(Context)?.data?.imageAppearance?.[page] === 'true';
}

/** Ortak kontroller mevcut sayfanın yetkisini kullanır; giriş ekranında işletme kapsamı yoktur. */
export function useWorkspacePermission(action: PermissionAction) {
  const ctx = useContext(Context);
  return !ctx || !ctx.resource || ctx.can(ctx.resource, action);
}

export function pageResource(path: string): WorkspaceResource | null {
  if (path.includes('/siparisler')) return 'orders';
  if (path.includes('/profil')) return null;
  if (path.includes('/kullanicilar')) return 'users';
  if (path.includes('/roller')) return 'roles';
  if (path.includes('/ayarlar')) return 'settings';
  if (path.includes('/loglar')) return 'logs';
  if (path.includes('/firsatlar')) return 'deals';
  if (path.includes('/urunler') || path.includes('/stok-karti')) return 'products';
  if (path.includes('/kategoriler')) return 'categories';
  if (path.includes('/markalar')) return 'brands';
  if (path.includes('/ozellikler')) return 'attributes';
  return null;
}
