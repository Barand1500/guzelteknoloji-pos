import { useLayoutEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { WorkspaceProvider, useWorkspace, pageResource } from '../workspace/workspace-context';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { CommandPalette } from './CommandPalette';
import { Dock } from './Dock';
import { TopBar } from './TopBar';
import { PageBack } from './PageBack';

/**
 * Giriş sonrası tüm ekranların ortak çerçevesi: üst çubuk + sayfa içeriği + alttaki yüzen çubuk.
 *
 * TEMA (önemli): `data-theme` hem bu kapta hem de `<html>` üzerinde durur. Pencereler (Sheet),
 * açılır listeler gibi `document.body`'ye "portal" ile çizilen öğeler bu kabın DIŞINDA kalır;
 * temayı alabilmeleri için `<html>` üzerinde de tanımlanması şarttır. Uygulamadan çıkınca
 * (giriş ekranı) nitelik kaldırılır, giriş ekranı her zaman gündüz temasıdır.
 */
export function AppShell() {
  return (
    <WorkspaceProvider>
      <ShellContent />
    </WorkspaceProvider>
  );
}
function ShellContent() {
  const { mode } = useTheme();
  const { data, loading, error, can, refresh } = useWorkspace();
  const { pathname } = useLocation();
  const resource = pageResource(pathname);
  const blocked =
    resource && !can(resource, pathname.endsWith('/stok-karti/yeni') ? 'save' : 'read');

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    return () => {
      delete root.dataset.theme;
    };
  }, [mode]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const pages = ['products', 'brands', 'categories', 'attributes'];
    for (const page of pages)
      root.setAttribute(
        `data-transparent-${page}`,
        String(data?.imageAppearance?.[page] === 'true'),
      );
    return () => {
      for (const page of pages) root.removeAttribute(`data-transparent-${page}`);
    };
  }, [data?.imageAppearance]);

  return (
    <div data-theme={mode} className="min-h-dvh bg-surface text-ink">
      <TopBar />
      {/* pb-32: alttaki yüzen çubuğun içeriği kapatmaması için boşluk */}
      <main className="mx-auto w-full max-w-[120rem] px-4 pt-5 pb-32 tablet:px-8 2xl:px-12">
        {pathname === '/uygulama/profil' && <PageBack />}
        {!loading && data && pathname.endsWith('/stok-karti/yeni') && !can('products', 'save') ? (
          <Navigate to={can('products') ? '/uygulama/urunler' : '/uygulama/profil'} replace />
        ) : loading ? (
          <p role="status" className="py-12 text-center text-ink-muted">
            Yükleniyor…
          </p>
        ) : error ? (
          <div className="mx-auto max-w-lg space-y-4">
            <Alert tone="error">{error}</Alert>
            <Button variant="outline" onClick={() => void refresh()}>
              Tekrar Dene
            </Button>
          </div>
        ) : blocked ? (
          <div className="mx-auto max-w-lg">
            <Alert tone="info">
              Bu sayfayı görüntüleme yetkiniz yok. İşletme sahibinden erişim isteyebilirsiniz.
            </Alert>
          </div>
        ) : data ? (
          <Outlet />
        ) : null}
      </main>
      <Dock />
      <CommandPalette />
    </div>
  );
}
