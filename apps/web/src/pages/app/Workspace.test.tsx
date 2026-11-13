import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_RESOURCES, type WorkspaceContext } from '@gt/shared';
import { anonymousRoutes, jsonResponse, mockFetch, renderApp } from '../../test/utils';
import { grantDevAccess } from '../../features/dev-login/devAccess';

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
  it('test kullanıcısı profil sayfasını görebilir', async () => {
    mockFetch(anonymousRoutes);
    grantDevAccess();
    renderApp('/uygulama/profil');

    expect(await screen.findByRole('heading', { name: 'Profil Bilgileri' })).toBeVisible();
    expect(screen.getByLabelText('Ad Soyad')).toHaveValue('Test Kullanıcısı');
    expect(
      screen.queryByText('Hesap yönetimi için kendi hesabınızla giriş yapın.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument();
  });

  it('entegrasyonları üç sekmede toplar; iletişimde SMTP, IMAP ve WhatsApp birlikte görünür', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/imap': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/whatsapp': () => jsonResponse(200, { values: {}, configured: [] }),
      'POST /api/hesap/ayarlar/smtp': () => jsonResponse(200, {}),
    });
    renderApp('/uygulama/ayarlar/entegrasyonlar');
    const nav = await screen.findByRole('navigation', { name: 'Entegrasyonlar' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['İletişim', 'Doğrulama', 'Hızlı Giriş']);
    const smtp = await screen.findByRole('form', { name: 'SMTP' });
    await screen.findByRole('form', { name: 'IMAP' });
    await screen.findByRole('form', { name: 'Meta WhatsApp Cloud API' });
    expect(within(smtp).getByLabelText('Sunucu')).toHaveValue('smtp.gmail.com');
    expect(within(smtp).getByLabelText('Port')).toHaveValue('587');
    const imap = screen.getByRole('form', { name: 'IMAP' });
    expect(within(imap).getByLabelText('Sunucu')).toHaveValue('imap.gmail.com');
    expect(within(imap).getByLabelText('Port')).toHaveValue('993');
    await user.clear(within(smtp).getByLabelText('Sunucu'));
    await user.type(within(smtp).getByLabelText('Sunucu'), 'smtp.example.org');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(
      fetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([url]) => url),
    ).toEqual(['/api/hesap/ayarlar/smtp']);
  });

  it('SMS kartı Netgsm alanlarını yükler, kaydeder ve test SMS gönderir', async () => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/imap': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/whatsapp': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/sms': () =>
        jsonResponse(200, {
          values: {
            enabled: 'true',
            username: '8508859160',
            sender: 'GUZELTEKNO',
            testNumber: '5321234567',
          },
          configured: ['password'],
        }),
      'POST /api/hesap/ayarlar/sms': () => jsonResponse(200, {}),
      'POST /api/hesap/ayarlar/sms/test': () =>
        jsonResponse(200, { message: 'Test SMS 5321234567 numarasına gönderildi.' }),
    });
    renderApp('/uygulama/ayarlar/iletisim');
    const sms = await screen.findByRole('region', { name: 'SMS' });
    expect(await within(sms).findByLabelText('API Kullanıcı Adı')).toHaveValue('8508859160');
    expect(within(sms).getByText('Netgsm SMS')).toBeInTheDocument();
    expect(screen.queryByText(/Varsayılan departman/i)).not.toBeInTheDocument();
    expect(within(sms).getByText('Kayıtlı')).toBeInTheDocument();

    await user.clear(within(sms).getByLabelText('Gönderici Başlığı'));
    await user.type(within(sms).getByLabelText('Gönderici Başlığı'), 'YENIBASLIK');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([url, init]) => String(url).endsWith('/ayarlar/sms') && init?.method === 'POST',
        ),
      ).toBe(true),
    );

    await user.click(within(sms).getByRole('button', { name: 'Test SMS Gönder' }));
    expect(
      await within(sms).findByText(/Test SMS 5321234567 numarasına gönderildi/),
    ).toBeInTheDocument();
  });
  it('birden fazla iletişim kartı kirliyken tek ayrılma uyarısı gösterir', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      ...Object.fromEntries(
        ['smtp', 'imap', 'whatsapp'].map((section) => [
          `GET /api/hesap/ayarlar/${section}`,
          () => jsonResponse(200, { values: {}, configured: [] }),
        ]),
      ),
    });
    renderApp('/uygulama/ayarlar/iletisim');
    await user.type(
      within(await screen.findByRole('form', { name: 'SMTP' })).getByLabelText('Sunucu'),
      'smtp.gmail.com',
    );
    await user.type(
      within(await screen.findByRole('form', { name: 'IMAP' })).getByLabelText('Sunucu'),
      'imap.gmail.com',
    );
    await user.click(screen.getByRole('link', { name: 'Doğrulama' }));
    expect(
      await screen.findAllByRole('dialog', { name: 'Kaydedilmemiş Değişiklikler' }),
    ).toHaveLength(1);
  });

  it('SMTP sağlayıcısı seçilince sunucu ve port hazır gelir', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    const form = await screen.findByRole('form', { name: 'SMTP' });
    expect(within(form).getByLabelText('Sunucu')).toHaveValue('smtp.gmail.com');
    await user.click(within(form).getByRole('combobox', { name: 'Sağlayıcı' }));
    await user.click(await screen.findByRole('option', { name: 'Hotmail / Outlook' }));
    expect(within(form).getByLabelText('Sunucu')).toHaveValue('smtp-mail.outlook.com');
    expect(within(form).getByLabelText('Port')).toHaveValue('587');
  });
  it('sosyal girişte Google bağlantısı ile Apple sunucu durumunu aynı sayfada gösterir', async () => {
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/google': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/sosyal-giris': () =>
        jsonResponse(200, {
          google: true,
          apple: true,
          appleRedirect: 'https://pos.example.com/api/auth/apple/callback',
        }),
    });
    renderApp('/uygulama/ayarlar/sosyal-giris');
    await screen.findByRole('form', { name: 'Google' });
    expect(await screen.findByText('Apple ile giriş yapılandırılmış.')).toBeInTheDocument();
    expect(screen.getByText('https://pos.example.com/api/auth/apple/callback')).toBeInTheDocument();
  });
  it.each([
    ['smtp', 'SMTP bağlantısı'],
    ['imap', 'IMAP bağlantısı'],
    ['google', 'Google bağlantısı'],
  ])('%s Aktif/Pasif anahtarını kaydeder', async (section, label) => {
    const user = userEvent.setup();
    const fetch = mockFetch({
      ...login,
      [`GET /api/hesap/ayarlar/${section}`]: () =>
        jsonResponse(200, { values: {}, configured: [], source: 'unconfigured' }),
      [`POST /api/hesap/ayarlar/${section}`]: () => jsonResponse(200, {}),
      ...(section === 'google'
        ? {
            'GET /api/hesap/sosyal-giris': () =>
              jsonResponse(200, {
                google: false,
                apple: false,
                appleRedirect: '',
                googleRedirect: '',
              }),
          }
        : {}),
    });
    renderApp(`/uygulama/ayarlar/${section}`);
    const toggle = await screen.findByRole('switch', { name: label });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Ayarlar kaydedildi.');
    const call = fetch.mock.calls.find(
      ([url, init]) => String(url).endsWith(`/ayarlar/${section}`) && init?.method === 'POST',
    )!;
    expect(JSON.parse(String(call[1]?.body)).values.enabled).toBe('true');
  });
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
        'GET /api/hesap/ayarlar/images': () => jsonResponse(200, { values: {}, configured: [] }),
        'POST /api/hesap/ayarlar/smtp/test': () => (pending ? response : jsonResponse(200, {})),
      });
      renderApp('/uygulama/ayarlar/smtp');
      await user.click(await screen.findByRole('button', { name: 'Kayıtlı Bağlantıyı Test Et' }));
      if (!pending) await screen.findByText('Kayıtlı bağlantı doğrulandı. E-posta gönderilmedi.');
      await user.click(screen.getByRole('link', { name: 'Görseller' }));
      await screen.findByRole('heading', { name: 'Görsel Ayarları', level: 2 });
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
    expect(screen.getByRole('link', { name: 'Önceki Sayfaya Dön' })).toBeInTheDocument();
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
          values: { host: 'smtp.gmail.com', port: '465', secure: 'true', username: 'mail' },
          configured: ['password'],
        }),
      'POST /api/hesap/ayarlar/smtp': () =>
        jsonResponse(200, { values: {}, configured: ['password'] }),
      'POST /api/hesap/ayarlar/smtp/gizli/password': () =>
        jsonResponse(200, { value: 'new-secret' }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    const host = await screen.findByLabelText('Sunucu');
    expect(host).toHaveValue('smtp.gmail.com');
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

describe('Ayarlarda kaydedilmemiş değişiklik uyarısı', () => {
  it('ilk yüklemede hiçbir şey değişmemişken uyarı çıkmaz', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap': () => jsonResponse(200, { ...owner, imageAppearance: { brands: 'false' } }),
      'GET /api/hesap/ayarlar/images': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/general': () => jsonResponse(200, { values: {}, configured: [] }),
    });
    renderApp('/uygulama/ayarlar/images');
    await screen.findByRole('switch', { name: 'Markalarda Şeffaf Zemin' });
    await user.click(screen.getByRole('link', { name: 'Genel' }));
    await screen.findByRole('heading', { level: 2, name: 'Genel Ayarlar' });
    expect(screen.queryByText('Kaydedilmemiş Değişiklikler')).not.toBeInTheDocument();
  });

  it('değişiklik geri alınınca uyarı çıkmaz', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/images': () => jsonResponse(200, { values: {}, configured: [] }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    const username = await screen.findByLabelText('Kullanıcı Adı');
    await user.type(username, 'deneme');
    await user.clear(username);
    await user.click(screen.getByRole('link', { name: 'Görseller' }));
    await screen.findByRole('heading', { level: 2, name: 'Görsel Ayarları' });
    expect(screen.queryByText('Kaydedilmemiş Değişiklikler')).not.toBeInTheDocument();
  });

  it('başarılı kayıttan sonra uyarı çıkmaz', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
      'GET /api/hesap/ayarlar/images': () => jsonResponse(200, { values: {}, configured: [] }),
      'POST /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    await user.type(await screen.findByLabelText('Kullanıcı Adı'), 'deneme');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Ayarlar kaydedildi.');
    await user.click(screen.getByRole('link', { name: 'Görseller' }));
    await screen.findByRole('heading', { level: 2, name: 'Görsel Ayarları' });
    expect(screen.queryByText('Kaydedilmemiş Değişiklikler')).not.toBeInTheDocument();
  });

  it('başarısız kayıttan sonra uyarı devam eder', async () => {
    const user = userEvent.setup();
    mockFetch({
      ...login,
      'GET /api/hesap/ayarlar/smtp': () => jsonResponse(200, { values: {}, configured: [] }),
      'POST /api/hesap/ayarlar/smtp': () =>
        jsonResponse(500, { error: { code: 'SERVER', message: 'Kaydedilemedi.' } }),
    });
    renderApp('/uygulama/ayarlar/smtp');
    await user.type(await screen.findByLabelText('Kullanıcı Adı'), 'deneme');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));
    await screen.findByText('Kaydedilemedi.');
    await user.click(screen.getByRole('link', { name: 'Görseller' }));
    expect(
      await screen.findByRole('dialog', { name: 'Kaydedilmemiş Değişiklikler' }),
    ).toBeInTheDocument();
  });
});
