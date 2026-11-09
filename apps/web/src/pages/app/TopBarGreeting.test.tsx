import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

/** Dar ekranı taklit eder: hiçbir min-width sorgusu eşleşmez → telefon düzeni çizilir. */
function stubNarrowScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

/** Yalnızca saat taklit edilir; zamanlayıcılar gerçek kalır (testler beklemeden bozulmasın). */
function atHour(hour: number) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 6, hour, 30));
}

const loggedIn = (displayName: string | null, email = 'a@b.com') => ({
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, { user: { id: 'u1', email, displayName, avatarUrl: null } }),
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Üst çubuk selamlaması', () => {
  it('test girişinde saate göre selamlar; sıra: gece/gündüz, selamlama, çıkış', async () => {
    atHour(9);
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yeni');
    const hello = await screen.findByText(/^Günaydın/);
    expect(hello).toHaveTextContent('Günaydın, Test Kullanıcısı');

    const theme = screen.getByRole('button', { name: 'Gece Moduna Geç' });
    const logout = screen.getByRole('button', { name: 'Çıkış Yap' });
    expect(theme.compareDocumentPosition(hello) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hello.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    [9, 'Günaydın'],
    [14, 'Tünaydın'],
    [20, 'İyi Akşamlar'],
    [23, 'İyi Geceler'],
  ])('gerçek hesapta saat %i: "%s, Baran" (görünen adın ilk sözcüğü)', async (hour, hello) => {
    atHour(hour);
    mockFetch(loggedIn('Baran Demir'));
    renderApp('/uygulama/stok-karti/yeni');
    expect(await screen.findByText(new RegExp(`^${hello}`))).toHaveTextContent(`${hello}, Baran`);
  });

  it('görünen ad ve kullanılabilir e-posta adı yoksa yalnızca selamlama yazar', async () => {
    atHour(14);
    mockFetch(loggedIn(null, '21baran51@gmail.com'));
    renderApp('/uygulama/stok-karti/yeni');
    const hello = await screen.findByText('Tünaydın');
    expect(hello.textContent).toBe('Tünaydın');
  });

  it('telefonda selamlama başlığın altında küçük yazılır (üst çubukta yer dar)', async () => {
    atHour(9);
    stubNarrowScreen();
    sessionStorage.setItem('gt-dev-access', '1');
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yeni');
    const hello = await screen.findByText(/^Günaydın/);
    const title = screen.getByRole('heading', { level: 1 });
    // Başlıkla aynı kapta (sağ kenardaki düğmelerin arasında değil).
    expect(title.parentElement).toContainElement(hello);
    expect(screen.getAllByText(/Günaydın/)).toHaveLength(1);
  });
});
