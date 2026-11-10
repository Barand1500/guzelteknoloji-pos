import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PageBack } from './PageBack';
import { UnsavedChanges } from '../workspace/UnsavedChanges';

function setup(dirty = false, initial = '/ilk') {
  render(
    <MemoryRouter initialEntries={[initial]}>
      <PageBack />
      <Routes>
        <Route path="/ilk" element={<Link to="/ikinci">İkinci Sayfa</Link>} />
        <Route
          path="/ikinci"
          element={
            <>
              <h2>İkinci Ekran</h2>
              <input aria-label="Ad" />
              <UnsavedChanges dirty={dirty} />
            </>
          }
        />
        <Route path="/uygulama/urunler" element={<h2>Ürün Listesi</h2>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
describe('Sayfadan geri dönme', () => {
  it('doğrudan açılan sayfada ürün listesine döner', async () => {
    const user = setup(false, '/ikinci');
    await user.click(screen.getByRole('link', { name: 'Önceki Sayfaya Dön' }));
    expect(await screen.findByRole('heading', { name: 'Ürün Listesi' })).toBeInTheDocument();
  });
  it('yazarken siler; alan dışında Backspace önceki sayfaya döner', async () => {
    const user = setup();
    await user.click(screen.getByRole('link', { name: 'İkinci Sayfa' }));
    await user.type(screen.getByLabelText('Ad'), 'Ali{Backspace}');
    expect(screen.getByLabelText('Ad')).toHaveValue('Al');
    await user.click(screen.getByRole('heading', { name: 'İkinci Ekran' }));
    await user.keyboard('{Backspace}');
    expect(await screen.findByRole('link', { name: 'İkinci Sayfa' })).toBeInTheDocument();
  });
  it('geri bağlantısı kaydedilmemiş değişiklik onayını atlamaz', async () => {
    const user = setup(true);
    await user.click(screen.getByRole('link', { name: 'İkinci Sayfa' }));
    await user.click(screen.getByRole('link', { name: 'Önceki Sayfaya Dön' }));
    expect(
      await screen.findByRole('dialog', { name: 'Kaydedilmemiş Değişiklikler' }),
    ).toBeInTheDocument();
    await user.keyboard('{Backspace}');
    expect(screen.getByRole('heading', { name: 'İkinci Ekran' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kaydetmeden Ayrıl' }));
    expect(await screen.findByRole('link', { name: 'İkinci Sayfa' })).toBeInTheDocument();
  });
});
