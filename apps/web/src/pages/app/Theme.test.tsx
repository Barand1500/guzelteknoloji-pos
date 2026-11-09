import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoBrandService as brandService } from '../../features/brands/services/brand.demo';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem('gt-dev-access', '1');
  mockFetch(anonymousRoutes);
  brandService.reset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe('Gece/gündüz teması', () => {
  it("tema <html> üzerinde de durur: body'ye çizilen pencereler (Sheet, portal) de gece temasını alır", async () => {
    const user = userEvent.setup();
    renderApp('/uygulama/markalar');
    await screen.findByRole('list', { name: 'Markalar' });
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Gece Moduna Geç' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    // Pencere document.body'ye taşınır; temayı <html>'den alması gerekir.
    await user.dblClick(screen.getByRole('button', { name: 'ALATEL markasını düzenle' }));
    const dialog = await screen.findByRole('dialog', { name: 'Markayı Düzenle' });
    expect(dialog.closest('[data-theme="dark"]')).not.toBeNull();
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.closest('#root')).toBeNull(); // gerçekten kabın dışına çizilmiş
  });

  it('giriş ekranına dönünce tema niteliği kalkar (giriş her zaman gündüz)', async () => {
    const user = userEvent.setup();
    renderApp('/uygulama/markalar');
    await screen.findByRole('list', { name: 'Markalar' });
    await user.click(screen.getByRole('button', { name: 'Gece Moduna Geç' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Profil Menüsü' }));
    await user.click(screen.getByRole('button', { name: 'Çıkış Yap' }));
    await screen.findByRole('heading', { name: /giriş yapın/i });
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe('Alt menü', () => {
  it('seçili sayfanın arkasında kayan vurgu kutusu vardır, alttaki nokta yoktur', async () => {
    renderApp('/uygulama/markalar');
    await screen.findByRole('list', { name: 'Markalar' });
    const nav = screen.getByRole('navigation', { name: 'Ana gezinme' });
    expect(nav.querySelector('[data-dock-indicator]')).not.toBeNull();
    // Eski "nokta" vurgusu (4px'lik yuvarlak) kaldırıldı
    expect(nav.querySelector('span.size-1')).toBeNull();
    expect(screen.getByRole('link', { name: 'Markalar' })).toHaveAttribute('aria-current', 'page');
  });
});
