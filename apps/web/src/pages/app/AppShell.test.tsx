import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, mockFetch, renderApp } from '../../test/utils';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Geçici test girişi ve uygulama kabuğu', () => {
  it('girişsiz kullanıcı /uygulama adresinden /login sayfasına döner', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/uygulama/stok-karti/yeni');
    expect(await screen.findByRole('heading', { name: /giriş yapın/i })).toBeInTheDocument();
  });

  it('"Test Kullanıcısı" butonu yeni stok kartı ekranını açar; gezinme ve gece modu çalışır', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    expect(await screen.findByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Stok Kodu')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gece Moduna Geç' }));
    expect(screen.getByRole('button', { name: 'Gündüz Moduna Geç' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Ürünler' }));
    expect(await screen.findByRole('heading', { name: 'Ürünler' })).toBeInTheDocument();
  });

  it('stok kartı sihirbazı adım adım ilerleyip kaydeder', async () => {
    mockFetch(anonymousRoutes);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Test Kullanıcısı Olarak Devam Et' }),
    );

    await user.type(await screen.findByLabelText('Stok Kodu'), 'A-1');
    await user.type(screen.getByLabelText('Stok Adı'), 'Deneme Ürünü');
    await user.click(screen.getByRole('button', { name: 'Devam Et' }));
    await user.click(await screen.findByRole('button', { name: 'Devam Et' }));
    await user.click(await screen.findByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByText('Deneme Ürünü')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Stok kartı kaydedildi!')).toBeInTheDocument();
  });
});
