import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

afterEach(() => sessionStorage.clear());

async function openApp() {
  sessionStorage.setItem('gt-dev-access', '1');
  mockFetch(anonymousRoutes);
  const user = userEvent.setup();
  renderApp('/uygulama/urunler');
  await screen.findByRole('searchbox', { name: 'Ürün ara' });
  return user;
}

describe('Ctrl + K hızlı arama', () => {
  it('Ctrl+K ortada tek bir arama kutusu açar; Esc kapatır', async () => {
    const user = await openApp();
    expect(screen.queryByRole('dialog', { name: 'Hızlı arama' })).not.toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Hızlı arama' });
    expect(within(dialog).getByRole('combobox', { name: 'Hızlı arama' })).toHaveFocus();
    // Boşken sayfalar listelenir.
    expect(within(dialog).getByRole('option', { name: /Kategoriler/ })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Hızlı arama' })).not.toBeInTheDocument();
  });

  it('sayfa adı yazılınca o sayfa gelir; Enter açar', async () => {
    const user = await openApp();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('marka{Enter}');
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Marka ara' })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('dialog', { name: 'Hızlı arama' })).not.toBeInTheDocument();
  });

  it('ürün kodu yazılınca ürün sonuçta çıkar; seçince stok kartı açılır', async () => {
    const user = await openApp();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog', { name: 'Hızlı arama' });
    await user.type(within(dialog).getByRole('combobox'), 'FP-503');
    const options = await within(dialog).findAllByRole(
      'option',
      { name: /FLEXYPOS FP-503/ },
      { timeout: 3000 },
    );
    await user.click(options[0]!);
    expect(await screen.findByLabelText('Ürün Kodu')).toHaveValue('FLEXYPOS.FP-503');
  });
});
