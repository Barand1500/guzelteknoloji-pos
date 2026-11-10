import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_RESOURCES, type WorkspaceContext } from '@gt/shared';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';

const owner: WorkspaceContext = {
  business: { id: 1, name: 'Güzel İşletme' },
  user: { id: 1, name: 'Yunus', email: 'yunus@example.com' },
  owner: true,
  permissions: WORKSPACE_RESOURCES.map((r) => ({
    resource: r.key,
    read: true,
    save: true,
    delete: true,
  })),
};
const login = {
  ...anonymousRoutes,
  'GET /api/auth/me': () =>
    jsonResponse(200, {
      user: { id: '1', displayName: 'Yunus', email: 'yunus@example.com', avatarUrl: null },
    }),
  'GET /api/hesap': () => jsonResponse(200, owner),
};
beforeEach(() => sessionStorage.clear());

describe('Profil ve işletme ekranları', () => {
  it('rol izinlerini topluca seçip temizler ve log yazma izinlerini kapalı tutar', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/roller': () => jsonResponse(200, []),
      'POST /api/hesap/roller': () => jsonResponse(200, { id: 1 }),
    });
    renderApp('/uygulama/roller');
    await user.click(await screen.findByRole('button', { name: 'Rol Ekle' }));
    expect(screen.queryByText(/Kaydet: yeni kayıt/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tümünü Seç' }));
    expect(screen.getByRole('checkbox', { name: 'Ürünler Sil' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Log Kayıtları Görüntüle' })).toBeChecked();
    expect(
      screen.queryByRole('checkbox', { name: 'Log Kayıtları Kaydet' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Log Kayıtları Sil' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Seçimi Temizle' }));
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Tümünü Seç' }));
    await user.type(screen.getByLabelText('Rol Adı'), 'Yönetici');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith('/hesap/roller') && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body)).permissions).toContainEqual({
      resource: 'logs',
      read: true,
      save: false,
      delete: false,
    });
  });
  it.each([false, true])(
    'bağlantı bildirimi başka ayar sayfasına taşınmaz (bekleyen: %s)',
    async (pending) => {
      const user = userEvent.setup();
      let finish = () => {};
      const response = new Promise<Response>((resolve) => {
        finish = () => resolve(jsonResponse(200, {}));
      });
      mockFetch({
        ...login,
        'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
        'GET /api/hesap/ayarlar/imap': () => jsonResponse(200, { values: {}, configured: [] }),
        'POST /api/hesap/ayarlar/smtp/test': () => (pending ? response : jsonResponse(200, {})),
      });
      renderApp('/uygulama/ayarlar/smtp');
      await user.click(await screen.findByRole('button', { name: 'Kayıtlı Bağlantıyı Test Et' }));
      if (!pending) await screen.findByText('Kayıtlı bağlantı doğrulandı. E-posta gönderilmedi.');
      await user.click(screen.getByRole('link', { name: 'Gelen E-Posta (IMAP)' }));
      await screen.findByRole('heading', { name: 'IMAP' });
      finish();
      await response;
      expect(
        screen.queryByText('Kayıtlı bağlantı doğrulandı. E-posta gönderilmedi.'),
      ).not.toBeInTheDocument();
    },
  );
  it.each([
    ['/uygulama/roller', 'Rol Ekle', 'Rol Adı'],
    ['/uygulama/kullanicilar', 'Kullanıcı Ekle', 'Ad Soyad'],
  ])('%s formunda Vazgeç doğrudan kapatır ve butonlarda ok yoktur', async (path, action, label) => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/roller': () => jsonResponse(200, []),
      'GET /api/hesap/kullanicilar': () => jsonResponse(200, []),
    });
    renderApp(path!);
    const add = await screen.findByRole('button', { name: action });
    expect(add.querySelector('.lucide-arrow-right')).toBeNull();
    await user.click(add);
    await user.type(screen.getByLabelText(label!), 'Deneme');
    const cancel = screen.getByRole('button', { name: 'Vazgeç' });
    expect(cancel.querySelector('.lucide-arrow-right')).toBeNull();
    await user.click(cancel);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Kaydedilmemiş Değişiklikler')).not.toBeInTheDocument();
  });
  it('profil simgesi menü açmaz, doğrudan profile götürür; çıkış ayrı düğmedir', async () => {
    const user = userEvent.setup();
    mockFetch(login);
    renderApp('/uygulama/kullanicilar');
    await screen.findByRole('heading', { name: 'Kullanıcılar' });
    expect(screen.queryByRole('button', { name: 'Profil Menüsü' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Çıkış Yap' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Profil' }));
    expect(await screen.findByRole('heading', { name: 'Profil Bilgileri' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('Kaydet seçilince Görüntüle de açılır; rol izinleri API’ye gider', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/roller': () => jsonResponse(200, []),
      'POST /api/hesap/roller': () => jsonResponse(200, { id: 1 }),
    });
    renderApp('/uygulama/roller');
    await user.click(await screen.findByRole('button', { name: 'Rol Ekle' }));
    await user.type(screen.getByLabelText('Rol Adı'), 'Kasiyer');
    await user.click(screen.getByRole('checkbox', { name: 'Ürünler Kaydet' }));
    expect(screen.getByRole('checkbox', { name: 'Ürünler Görüntüle' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith('/hesap/roller') && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({
      name: 'Kasiyer',
      permissions: expect.arrayContaining([
        { resource: 'products', read: true, save: true, delete: false },
      ]),
    });
  });
  it('kullanıcı eklerken rol ve doğrulanacak e-posta kaydedilir', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/kullanicilar': () => jsonResponse(200, []),
      'GET /api/hesap/roller': () =>
        jsonResponse(200, [{ id: 2, name: 'Personel', permissions: [], users: 0 }]),
      'POST /api/hesap/kullanicilar': () => jsonResponse(201, { id: 2 }),
    });
    renderApp('/uygulama/kullanicilar');
    await user.click(await screen.findByRole('button', { name: 'Kullanıcı Ekle' }));
    await user.type(screen.getByLabelText('Ad Soyad'), 'Ayşe');
    await user.type(screen.getByLabelText('E-posta'), 'ayse@example.com');
    await user.click(screen.getByRole('combobox', { name: 'Rol' }));
    await user.click(await screen.findByRole('option', { name: 'Personel' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith('/hesap/kullanicilar') && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      name: 'Ayşe',
      email: 'ayse@example.com',
      roleId: 2,
      active: true,
    });
  });
  it('salt görüntüleme rolü yönetim sayfasına erişemez', async () => {
    mockFetch({
      ...login,
      'GET /api/hesap': () =>
        jsonResponse(200, {
          ...owner,
          owner: false,
          permissions: [{ resource: 'products', read: true, save: false, delete: false }],
        }),
    });
    renderApp('/uygulama/roller');
    expect(await screen.findByText(/Bu sayfayı görüntüleme yetkiniz yok/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Rol Ekle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Yeni Stok Kartı' })).not.toBeInTheDocument();
  });
  it('SMTP şifresi kayıt sonrası maskeli kalır, göz düğmesiyle gösterilir', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () =>
        jsonResponse(200, {
          values: { host: 'smtp.example.com', port: '465', secure: 'true', username: 'mail' },
          configured: ['password'],
        }),
      'POST /api/hesap/ayarlar/smtp': () =>
        jsonResponse(200, { values: {}, configured: ['password'] }),
      'POST /api/hesap/ayarlar/smtp/gizli/password': () =>
        jsonResponse(200, { value: 'new-secret' }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    const host = await screen.findByLabelText('Sunucu');
    expect(host).toHaveValue('smtp.example.com');
    expect(screen.getByLabelText('Şifre')).toHaveValue('••••••••');
    await user.type(screen.getByLabelText('Şifre'), 'new-secret');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Ayarlar kaydedildi.');
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith('/ayarlar/smtp') && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body)).values.password).toBe('new-secret');
    expect(screen.getByLabelText('Şifre')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Şifre')).not.toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Şifre Göster' }));
    await waitFor(() => expect(screen.getByLabelText('Şifre')).toHaveValue('new-secret'));
    expect(screen.getByLabelText('Şifre')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Şifre Gizle' }));
    expect(screen.getByLabelText('Şifre')).toHaveAttribute('type', 'password');
  });
  it('şeffaflık seçimini kaydeder ve işletmenin görsel görünümünü yeniler', async () => {
    const user = userEvent.setup();
    let saved = false;
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap': () =>
        jsonResponse(200, { ...owner, imageAppearance: { brands: String(saved) } }),
      'GET /api/hesap/ayarlar/images': () =>
        jsonResponse(200, { values: { brands: String(saved) }, configured: [] }),
      'POST /api/hesap/ayarlar/images': () => {
        saved = true;
        return jsonResponse(200, {});
      },
    });
    renderApp('/uygulama/ayarlar/images');
    await user.click(await screen.findByRole('switch', { name: 'Markalarda Şeffaf Zemin' }));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Ayarlar kaydedildi.');
    expect(document.documentElement).toHaveAttribute('data-transparent-brands', 'true');
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith('/ayarlar/images') && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body)).values.brands).toBe('true');
  });
  it.each([
    ['imap', 'password', 'Şifre'],
    ['google', 'clientSecret', 'İstemci Anahtarı'],
    ['cloudflare', 'secretKey', 'Secret Key'],
    ['recaptcha', 'secretKey', 'Secret Key'],
    ['whatsapp', 'appSecret', 'Uygulama Gizli Anahtarı'],
    ['whatsapp', 'accessToken', 'Erişim Belirteci'],
    ['whatsapp', 'verifyToken', 'Webhook Doğrulama Belirteci'],
  ])(
    '%s gizli alanı maskeli kalır ve gözle açılır; kaldırma seçeneği yoktur',
    async (section, field, label) => {
      const user = userEvent.setup();
      mockFetch({
        ...login,
        [`GET /api/hesap/ayarlar/${section}`]: () =>
          jsonResponse(200, { values: {}, configured: [field] }),
        [`POST /api/hesap/ayarlar/${section}/gizli/${field}`]: () =>
          jsonResponse(200, { value: 'saved-value' }),
      });
      renderApp(`/uygulama/ayarlar/${section}`);
      expect(await screen.findByLabelText(label!)).toHaveValue('••••••••');
      expect(screen.queryByText(/Kayıtlı bilgiyi kaldır/)).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: `${label} Göster` }));
      await waitFor(() => expect(screen.getByLabelText(label!)).toHaveValue('saved-value'));
      expect(screen.getByLabelText(label!)).toHaveAttribute('type', 'text');
    },
  );
  it('şifresiz hesapta mevcut şifre istemez; oluşturunca şifre değiştirmeye geçer', async () => {
    const user = userEvent.setup();
    let hasPassword = false;
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap': () => jsonResponse(200, { ...owner, hasPassword }),
      'POST /api/hesap/profil/sifre': () => {
        hasPassword = true;
        return new Response(null, { status: 204 });
      },
    });
    renderApp('/uygulama/profil');
    await user.click(await screen.findByRole('button', { name: 'Şifre Oluştur' }));
    expect(screen.queryByLabelText('Mevcut Şifre')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Yeni Şifre', { exact: true }), 'example-password');
    await user.type(screen.getByLabelText('Yeni Şifre Tekrar'), 'example-password');
    const dialog = screen.getByRole('dialog', { name: 'Şifre Oluştur' });
    await user.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await screen.findByRole('button', { name: 'Şifreyi Değiştir' });
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith('/profil/sifre'))!;
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      current: '',
      password: 'example-password',
    });
  });
  it('profilde yazılan yeni şifre göz düğmesiyle gösterilir', async () => {
    const user = userEvent.setup();
    mockFetch(login);
    renderApp('/uygulama/profil');
    await user.click(await screen.findByRole('button', { name: 'Şifreyi Değiştir' }));
    await user.type(screen.getByLabelText('Yeni Şifre', { exact: true }), 'example-password');
    await user.click(screen.getByRole('button', { name: 'Yeni Şifre Göster' }));
    expect(screen.getByLabelText('Yeni Şifre', { exact: true })).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Yeni Şifre', { exact: true })).toHaveValue('example-password');
  });
  it('log ayrıntısında eski ve yeni değeri gösterir', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/loglar': () =>
        jsonResponse(200, {
          total: 1,
          items: [
            {
              id: 1,
              user: 'Yunus',
              section: 'products',
              action: 'Kaydet',
              target: '3',
              time: new Date().toISOString(),
              status: 'Başarılı',
              changes: [
                { field: 'Ürün Adı', before: 'Eski Ürün', after: 'Yeni Ürün' },
                { field: 'Birimler[1].stokKartiKimligi', before: null, after: '14' },
                { field: 'markaKimligi', before: null, after: '13' },
                { field: 'Birimler[1].kimlik', before: null, after: '38' },
                { field: 'Birimler[1].Sıra', before: null, after: '0' },
                { field: 'Satış Açık', before: 'false', after: 'true' },
              ],
            },
          ],
        }),
    });
    renderApp('/uygulama/loglar');
    expect(screen.queryByRole('button', { name: 'Süz' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Başlangıç')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Kaydet' }));
    const detail = screen.getByRole('dialog', { name: 'Ürünler · Kaydet' });
    expect(within(detail).getByText('Eski Ürün')).toBeVisible();
    expect(within(detail).getByText('Yeni Ürün')).toBeVisible();
    expect(within(detail).getByText('Evet')).toBeVisible();
    expect(within(detail).getByText('Hayır')).toBeVisible();
    expect(within(detail).queryByText(/kimli|Sıra|true|false/)).not.toBeInTheDocument();
  });
});
