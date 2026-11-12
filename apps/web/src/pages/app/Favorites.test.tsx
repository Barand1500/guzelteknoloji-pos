import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

async function open(path = '/uygulama/urunler') {
  sessionStorage.setItem('gt-dev-access', '1'); // geçici test girişi
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp(path);
  await screen.findByRole('group', { name: 'Favori sayfalar' });
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

describe('Favori sayfalar (üst çubuk)', () => {
  it('üç boş yuva gelir; sayfa aranıp eklenir, tek tıkla açılır, ✕ ile kalkar; seçim saklanır', async () => {
    const user = await open();
    const bar = screen.getByRole('group', { name: 'Favori sayfalar' });
    expect(within(bar).getAllByRole('button', { name: /Favori ekle/ })).toHaveLength(3);
    await user.click(within(bar).getByRole('button', { name: 'Favori ekle 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Favori sayfa seç' });
    await user.type(within(dialog).getByRole('searchbox'), 'marka');
    await user.click(within(dialog).getByRole('button', { name: /Markalar/ }));
    expect(screen.queryByRole('dialog', { name: 'Favori sayfa seç' })).not.toBeInTheDocument();
    const link = within(bar).getByRole('link', { name: 'Favori: Markalar' });
    expect(link).toHaveAttribute('href', '/uygulama/markalar');
    expect(JSON.parse(localStorage.getItem('gt-favorites') ?? '[]')).toEqual(['/uygulama/markalar']);
    expect(within(bar).getAllByRole('button', { name: /Favori ekle/ })).toHaveLength(2);
    await user.click(within(bar).getByRole('button', { name: 'Markalar favoriden çıkar' }));
    expect(within(bar).getAllByRole('button', { name: /Favori ekle/ })).toHaveLength(3);
  });

  it('"şu anki sayfayı ekle" kısayolu bulunulan sayfayı tek dokunuşla ekler; eklenen sayfa seçili görünür', async () => {
    const user = await open('/uygulama/kategoriler');
    const bar = screen.getByRole('group', { name: 'Favori sayfalar' });
    await user.click(within(bar).getByRole('button', { name: 'Favori ekle 1' }));
    await user.click(await screen.findByRole('button', { name: /Şu anki sayfayı ekle: Kategoriler/ }));
    expect(within(bar).getByRole('link', { name: 'Favori: Kategoriler' })).toHaveAttribute('aria-current', 'page');
  });

  it('en çok üç favori eklenir', async () => {
    localStorage.setItem('gt-favorites', JSON.stringify(['/uygulama/urunler', '/uygulama/markalar', '/uygulama/kategoriler']));
    await open();
    const bar = screen.getByRole('group', { name: 'Favori sayfalar' });
    expect(await within(bar).findAllByRole('link')).toHaveLength(3);
    expect(within(bar).queryByRole('button', { name: /Favori ekle/ })).not.toBeInTheDocument();
  });
});
