import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const authenticated = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: 'real-user', email: 'user@example.com', displayName: null, avatarUrl: null },
    }),
};

describe('Gerçek stok kayıt bağlantısı', () => {
  it('formu API’ye gönderir, başarıdan sonra yeni ve boş kayıt açar', async () => {
    const bodies: { requestId: string; draft: { code: string; name: string } }[] = [];
    mockFetch({
      ...authenticated,
      'POST /api/stok/kartlar': (init) => {
        bodies.push(JSON.parse(String(init?.body)) as (typeof bodies)[number]);
        return jsonResponse(201, { id: 'saved-card' });
      },
    });
    renderApp('/uygulama/stok-karti/yeni');
    await userEvent.type(await screen.findByLabelText('Stok Kodu'), 'A-123');
    await userEvent.type(screen.getByLabelText('Stok Adı'), 'Kalıcı Ürün');
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Stok kartı kaydedildi!')).toBeInTheDocument();
    expect(bodies[0]?.draft).toMatchObject({ code: 'A-123', name: 'Kalıcı Ürün' });
    expect(bodies[0]?.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionStorage.getItem('gt-dev-access')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Yeni Stok Kartı' }));
    expect(await screen.findByLabelText('Stok Kodu')).toHaveValue('');
  });

  it('ağ hatasında formu korur ve aynı kayıt kimliğiyle yeniden dener', async () => {
    const requests: string[] = [];
    mockFetch({
      ...authenticated,
      'POST /api/stok/kartlar': (init) => {
        requests.push(String(init?.body));
        if (requests.length === 1) throw new TypeError('network');
        return jsonResponse(201, { id: 'saved-card' });
      },
    });
    renderApp('/uygulama/stok-karti/yeni');
    await userEvent.type(await screen.findByLabelText('Stok Kodu'), 'KORUNAN');
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Bilgileriniz korundu');
    expect(screen.getByLabelText('Stok Kodu')).toHaveValue('KORUNAN');
    expect(screen.queryByText('Stok kartı kaydedildi!')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('Stok kartı kaydedildi!')).toBeInTheDocument();
    expect(requests[0]).toBe(requests[1]);
  });

  it('sunucu doğrulama hatasında sahte başarı göstermez ve düzenlemeye izin verir', async () => {
    mockFetch({
      ...authenticated,
      'POST /api/stok/kartlar': () =>
        jsonResponse(409, {
          error: { code: 'CONFLICT', message: 'Bu stok koduyla bir kart zaten var.' },
        }),
    });
    renderApp('/uygulama/stok-karti/yeni');
    await screen.findByLabelText('Stok Kodu');
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bu stok koduyla bir kart zaten var.',
    );
    expect(screen.getByLabelText('Stok Kodu')).toBeEnabled();
    expect(screen.queryByText('Stok kartı kaydedildi!')).not.toBeInTheDocument();
  });
});
