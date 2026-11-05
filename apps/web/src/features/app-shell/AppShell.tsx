import { useLayoutEffect } from 'react';
import { Outlet } from 'react-router';
import { useTheme } from '../theme/ThemeProvider';
import { Dock } from './Dock';
import { TopBar } from './TopBar';

/**
 * Giriş sonrası tüm ekranların ortak çerçevesi: üst çubuk + sayfa içeriği + alttaki yüzen çubuk.
 *
 * TEMA (önemli): `data-theme` hem bu kapta hem de `<html>` üzerinde durur. Pencereler (Sheet),
 * açılır listeler gibi `document.body`'ye "portal" ile çizilen öğeler bu kabın DIŞINDA kalır;
 * temayı alabilmeleri için `<html>` üzerinde de tanımlanması şarttır. Uygulamadan çıkınca
 * (giriş ekranı) nitelik kaldırılır, giriş ekranı her zaman gündüz temasıdır.
 */
export function AppShell() {
  const { mode } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode;
    return () => {
      delete root.dataset.theme;
    };
  }, [mode]);

  return (
    <div data-theme={mode} className="min-h-dvh bg-surface text-ink">
      <TopBar />
      {/* pb-32: alttaki yüzen çubuğun içeriği kapatmaması için boşluk */}
      <main className="mx-auto w-full max-w-[120rem] px-4 pt-5 pb-32 tablet:px-8 2xl:px-12">
        <Outlet />
      </main>
      <Dock />
    </div>
  );
}
