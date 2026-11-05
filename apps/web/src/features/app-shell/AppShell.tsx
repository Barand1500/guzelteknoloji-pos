import { Outlet } from 'react-router';
import { useTheme } from '../theme/ThemeProvider';
import { Dock } from './Dock';
import { TopBar } from './TopBar';

/**
 * Giriş sonrası tüm ekranların ortak çerçevesi: üst çubuk + sayfa içeriği + alttaki yüzen çubuk.
 * `data-theme` bu kapta durur; gece renkleri yalnızca burada ve altında geçerlidir.
 */
export function AppShell() {
  const { mode } = useTheme();
  return (
    <div data-theme={mode} className="min-h-dvh bg-surface text-ink">
      <TopBar />
      {/* pb-32: alttaki yüzen çubuğun içeriği kapatmaması için boşluk */}
      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-32 tablet:px-8">
        <Outlet />
      </main>
      <Dock />
    </div>
  );
}
