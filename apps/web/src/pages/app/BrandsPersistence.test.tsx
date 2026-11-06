import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';
import type { Brand } from '@gt/shared';

const brand: Brand = {
  id: 'real-brand',
  name: 'Kalıcı Marka',
  description: '',
  logoUrl: null,
  active: true,
  seoTitle: '',
  seoDescription: '',
  productCount: 1,
};
const authenticated = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: 'user', email: 'test@example.com', displayName: null, avatarUrl: null },
    }),
  'GET /api/markalar': () => jsonResponse(200, [brand]),
};
const failed = () => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Hata' } });

describe('Gerçek marka bağlantısı ve hata koruması', () => {
  it('test erişimi bulunsa da gerçek oturum markaları API’den yükler; yükleme hatası yeniden denenir', async () => {
    sessionStorage.setItem('gt-dev-access', '1');
    let calls = 0;
    mockFetch({
      ...authenticated,
      'GET /api/markalar': () => (++calls === 1 ? failed() : jsonResponse(200, [brand])),
    });
    renderApp('/uygulama/markalar');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Henüz marka yok')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden Yükle' }));
    expect(await screen.findByRole('switch', { name: 'Kalıcı Marka aktif' })).toBeChecked();
    sessionStorage.clear();
  });
  it('kayıt hatasında form kapanmaz, bilgiler korunur ve tekrar gönderilebilir', async () => {
    let calls = 0;
    mockFetch({
      ...authenticated,
      'POST /api/markalar': (init) => {
        calls++;
        expect(JSON.parse(String(init?.body))).toMatchObject({ name: 'Yeni Marka', active: true });
        return calls === 1
          ? failed()
          : jsonResponse(201, { ...brand, id: 'new', name: 'Yeni Marka', productCount: 0 });
      },
    });
    renderApp('/uygulama/markalar');
    await screen.findByRole('switch');
    await userEvent.click(screen.getAllByRole('button', { name: 'Marka Ekle' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Marka Ekle' });
    await userEvent.type(within(dialog).getByLabelText('Marka Adı'), 'Yeni Marka');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Marka Adı')).toHaveValue('Yeni Marka');
    expect(within(dialog).getByRole('button', { name: 'Kaydet' })).toBeEnabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('switch', { name: 'Yeni Marka aktif' })).toBeChecked();
  });
  it('aktiflik kaydedilemezse eski durumu korur', async () => {
    mockFetch({ ...authenticated, 'POST /api/markalar/real-brand/aktiflik': failed });
    renderApp('/uygulama/markalar');
    const toggle = await screen.findByRole('switch', { name: 'Kalıcı Marka aktif' });
    await userEvent.click(toggle);
    await screen.findByRole('alert');
    expect(toggle).toBeChecked();
  });
  it('ürün atama reddedilirse iyimser ekran güncellemesini geri alır ve başarı göstermez', async () => {
    mockFetch({
      ...authenticated,
      'GET /api/markalar/urunler': () =>
        jsonResponse(200, [
          { id: 'p', code: 'P-1', name: 'Kalıcı Ürün', barcode: '001', brandId: null },
        ]),
      'POST /api/markalar/real-brand/urunler/ata': failed,
    });
    renderApp('/uygulama/markalar');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Kalıcı Marka markasının ürünlerini yönet' }),
    );
    const panel = await screen.findByRole('dialog', { name: 'Kalıcı Marka · Ürünler' });
    await userEvent.click(within(panel).getByRole('tab', { name: 'Ürün Ekle' }));
    await userEvent.click(
      await within(panel).findByRole('checkbox', { name: 'Kalıcı Ürün ürününü seç' }),
    );
    await userEvent.click(within(panel).getByRole('button', { name: 'Ekle' }));
    expect(await within(panel).findByRole('alert')).toBeInTheDocument();
    expect(within(panel).getByRole('tab', { name: 'Bu Markada (0)' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(within(panel).getByRole('checkbox', { name: 'Kalıcı Ürün ürününü seç' })).toBeChecked();
  });
});
