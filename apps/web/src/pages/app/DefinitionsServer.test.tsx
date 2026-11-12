import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const authenticated = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: 'user', email: 'test@example.com', displayName: null, avatarUrl: null },
    }),
};

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('Tanımlamalar sunucuya bağlı', () => {
  it('ödeme şekilleri API’den gelir; örnek veri notu görünmez', async () => {
    mockFetch({
      ...authenticated,
      'GET /api/odeme-sekilleri': () =>
        jsonResponse(200, [
          {
            id: '1',
            name: 'Nakit',
            icon: 'cash',
            iconUrl: null,
            active: true,
            isDefault: true,
            priceList: '',
            noShipping: false,
            allowAdjust: false,
          },
        ]),
    });
    renderApp('/uygulama/tanimlamalar/odeme-sekilleri');
    const list = await screen.findByRole('list', { name: 'Ödeme şekilleri' });
    expect(within(list).getByText('Nakit')).toBeInTheDocument();
    expect(screen.queryByText('ÖRNEK VERİ')).not.toBeInTheDocument();
  });

  it('resmi tatiller API’den gelir; özel tatil listede görünür', async () => {
    mockFetch({
      ...authenticated,
      'GET /api/resmi-tatiller': () =>
        jsonResponse(200, {
          official: [],
          custom: [{ id: '5', name: 'Sayım Günü', start: '2026-12-31', end: '2026-12-31' }],
          offline: false,
        }),
    });
    renderApp('/uygulama/tanimlamalar/resmi-tatiller');
    const list = await screen.findByRole('list', { name: 'Tatil listesi' });
    expect(await within(list).findByText('Sayım Günü')).toBeInTheDocument();
    expect(screen.queryByText('ÖRNEK VERİ')).not.toBeInTheDocument();
  });
});
