import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  anonymousRoutes,
  axeViolations,
  jsonResponse,
  mockFetch,
  renderApp,
} from '../../test/utils';

const user = {
  id: 'u1',
  email: 'kullanici@example.com',
  displayName: 'Ayşe Yılmaz',
  avatarUrl: null,
};

const optionsHeading = 'Hesabınıza giriş yapın!';

describe('Giriş seçenekleri ekranı', () => {
  it('Google, Apple, "veya" ayracı, E-Posta ve yardım seçeneklerini bu sırayla gösterir', async () => {
    mockFetch(anonymousRoutes);
    renderApp();

    expect(await screen.findByRole('heading', { name: optionsHeading })).toBeInTheDocument();
    const buttons = screen
      .getAllByRole('button')
      .map((b) => b.textContent?.trim())
      .filter(Boolean);
    expect(buttons).toEqual([
      'Google ile Devam Et',
      'Apple ile Devam Et',
      'E-Posta ile Devam Et',
      'Yardıma mı İhtiyacınız Var?',
      // GEÇİCİ: gerçek giriş gelince bu satır ve buton silinir (features/dev-login).
      'Test Kullanıcısı Olarak Devam Et',
    ]);
    expect(screen.getByRole('separator')).toHaveTextContent('veya');
    expect(screen.queryByText(/facebook/i)).not.toBeInTheDocument();
    // Kayıt/şifre sıfırlama için çalışmayan sahte bağlantı olmamalı.
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('marka adı ve Türkçe başlık görünür', async () => {
    mockFetch(anonymousRoutes);
    renderApp();
    expect(await screen.findByText('Güzel Teknoloji')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/güvenle/);
  });

  it('erişilebilirlik ihlali içermez', async () => {
    mockFetch(anonymousRoutes);
    const { container } = renderApp();
    await screen.findByRole('heading', { name: optionsHeading });
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Google yapılandırılmamışsa yönlendirmez, anlaşılır mesaj gösterir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'GET /api/auth/providers': () => jsonResponse(200, { google: false, apple: false }),
    });
    renderApp();
    const button = await screen.findByRole('button', { name: /Google ile Devam Et/ });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google ile giriş şu anda kullanılamıyor',
    );
  });

  it('Apple yapılandırılmamışsa yönlendirmez, anlaşılır mesaj gösterir', async () => {
    mockFetch(anonymousRoutes); // google: true, apple: false
    renderApp();
    const button = await screen.findByRole('button', { name: /Apple ile Devam Et/ });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Apple ile giriş şu anda kullanılamıyor',
    );
  });

  it('Google dönüş hatasını (?hata=) Türkçe gösterir', async () => {
    mockFetch(anonymousRoutes);
    renderApp('/login?hata=google_hesap_mevcut');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bu e-posta ile kayıtlı bir hesap zaten var',
    );
  });

  it("bilinmeyen yolları /login'e yönlendirir", async () => {
    mockFetch(anonymousRoutes);
    renderApp('/panel');
    expect(await screen.findByRole('heading', { name: optionsHeading })).toBeInTheDocument();
  });
});

describe('E-Posta ile Devam Et', () => {
  async function openEmailForm() {
    const ue = userEvent.setup();
    renderApp();
    await ue.click(await screen.findByRole('button', { name: /E-Posta ile Devam Et/ }));
    await screen.findByRole('heading', { name: 'E-Posta ile giriş' });
    return ue;
  }
  const submitEmail = async (ue: ReturnType<typeof userEvent.setup>, email: string) => {
    await ue.type(screen.getByLabelText('E-Posta'), email);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
  };

  it('açıldığında yalnızca e-posta sorar, e-posta alanına odaklanır, geri dönülebilir', async () => {
    mockFetch(anonymousRoutes);
    const ue = await openEmailForm();
    expect(screen.getByLabelText('E-Posta')).toHaveFocus();
    expect(screen.queryByLabelText('Şifre')).not.toBeInTheDocument();
    await ue.click(screen.getByRole('button', { name: /Diğer Seçenekler/ }));
    expect(await screen.findByRole('heading', { name: optionsHeading })).toBeInTheDocument();
  });

  it('robot doğrulamasını Devam Et düğmesinin altında tam genişlikli alanda gösterir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/robot': () =>
        jsonResponse(200, {
          challenge: { provider: 'recaptcha', siteKey: 'test-site-key' },
        }),
    });
    const ue = await openEmailForm();
    const emailField = screen.getByLabelText('E-Posta');
    const continueButton = screen.getByRole('button', { name: 'Devam Et' });
    await waitFor(() => expect(emailField).toBeInTheDocument());
    const form = emailField.closest('form');
    expect(form).not.toBeNull();
    const children = Array.from(form!.children);
    expect(children.indexOf(emailField.parentElement!)).toBeLessThan(
      children.indexOf(continueButton),
    );
    const challengeContainer = form!.querySelector('[aria-label="Robot doğrulaması"]');
    expect(challengeContainer).not.toBeNull();
    const challenge = challengeContainer!.closest('.challenge-full-width');
    expect(challenge).not.toBeNull();
    expect(
      continueButton.compareDocumentPosition(challenge!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(challenge!.parentElement).toHaveClass('w-full');
  });
  it('boş ve geçersiz e-postada hata gösterir (ünlem düğmesi), istek göndermez', async () => {
    const fetchMock = mockFetch(anonymousRoutes);
    const ue = await openEmailForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(
      await screen.findByRole('button', { name: 'E-posta adresinizi girin.' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('E-Posta')).toHaveAttribute('aria-invalid', 'true');

    await ue.type(screen.getByLabelText('E-Posta'), 'gecersiz-adres');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(
      await screen.findByRole('button', { name: 'Geçerli bir e-posta adresi girin.' }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => init?.method === 'POST' && String(url) !== '/api/auth/robot',
      ),
    ).toBe(false);
  });

  it('ünleme tıklanınca hata kutusu açılır, Escape ile kapanır', async () => {
    mockFetch(anonymousRoutes);
    const ue = await openEmailForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    const icon = await screen.findByRole('button', { name: 'E-posta adresinizi girin.' });
    expect(icon).toHaveAttribute('aria-expanded', 'false');
    await ue.click(icon);
    expect(icon).toHaveAttribute('aria-expanded', 'true');
    await ue.keyboard('{Escape}');
    expect(icon).toHaveAttribute('aria-expanded', 'false');
  });

  it('kayıtlı hesap: şifre adımı açılır, doğru şifreyle doğrulanmış oturuma geçilir', async () => {
    let resolveLogin: (r: Response) => void = () => {};
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'kullanici@example.com' });
        return jsonResponse(200, { step: 'password' });
      },
      'POST /api/auth/login': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          email: 'kullanici@example.com',
          password: 'Dogru-Sifre-123',
        });
        return new Promise<Response>((resolve) => (resolveLogin = resolve));
      },
    });
    const ue = await openEmailForm();
    await submitEmail(ue, '  kullanici@example.com ');

    expect(await screen.findByRole('heading', { name: 'Şifrenizi girin' })).toBeInTheDocument();
    expect(screen.getByText('kullanici@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Şifre')).toHaveFocus();

    await ue.type(screen.getByLabelText('Şifre'), 'Dogru-Sifre-123');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    const busy = await screen.findByRole('button', { name: 'Giriş Yapılıyor…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    resolveLogin(jsonResponse(200, { user }));
    expect(await screen.findByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme' })).toBeInTheDocument();
    expect(sessionStorage.getItem('gt-dev-access')).toBeNull();
  });

  it('şifre görünürlüğünü değiştirir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () => jsonResponse(200, { step: 'password' }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'kullanici@example.com');
    const password = await screen.findByLabelText('Şifre');
    expect(password).toHaveAttribute('type', 'password');
    await ue.click(screen.getByRole('button', { name: 'Şifreyi Göster' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Şifreyi Gizle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('yanlış şifrede sunucu mesajını gösterir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () => jsonResponse(200, { step: 'password' }),
      'POST /api/auth/login': () =>
        jsonResponse(401, {
          error: { code: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' },
        }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'kullanici@example.com');
    await ue.type(await screen.findByLabelText('Şifre'), 'yanlis-sifre');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-Posta veya şifre hatalı');
  });

  it('şifre adımında e-postayı değiştirmek ilk adıma döndürür (e-posta korunur)', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () => jsonResponse(200, { step: 'password' }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'kullanici@example.com');
    await ue.click(await screen.findByRole('button', { name: 'E-Posta Adresini Değiştir' }));
    expect(await screen.findByLabelText('E-Posta')).toHaveValue('kullanici@example.com');
  });

  it('kayıtlı olmayan e-posta: kod adımı açılır, kodla oturum açılır', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () =>
        jsonResponse(200, { step: 'code', resendAfterSeconds: 60, expiresInSeconds: 600 }),
      'POST /api/auth/email/verify': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          email: 'yeni@example.com',
          code: '123456',
        });
        return jsonResponse(200, { user: { ...user, email: 'yeni@example.com' } });
      },
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'yeni@example.com');

    expect(await screen.findByRole('heading', { name: 'Kodu girin' })).toBeInTheDocument();
    const code = screen.getByLabelText('Doğrulama Kodu');
    expect(code).toHaveFocus();
    // Rakam dışı karakterler atılır, en fazla 6 hane.
    await ue.type(code, '12 3-456789');
    expect(code).toHaveValue('123456');
    // Geri sayım bitmeden "tekrar gönder" kapalıdır.
    expect(screen.getByRole('button', { name: /Kodu Tekrar Gönder \(\d+ sn\)/ })).toBeDisabled();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
  });

  it('kod adımında ilk doğrulamanın akış anahtarını gönderir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () =>
        jsonResponse(200, {
          step: 'code',
          resendAfterSeconds: 60,
          expiresInSeconds: 600,
          flowToken: 'flow-abc',
        }),
      'POST /api/auth/email/verify': (init) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          email: 'yeni@example.com',
          code: '123456',
          flowToken: 'flow-abc',
        });
        return jsonResponse(200, { user: { ...user, email: 'yeni@example.com' } });
      },
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'yeni@example.com');
    const code = await screen.findByLabelText('Doğrulama Kodu');
    await ue.type(code, '123456');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByRole('heading', { name: 'Yeni Stok Kartı' })).toBeInTheDocument();
  });

  it('hatalı kodda Türkçe mesaj gösterir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () =>
        jsonResponse(200, { step: 'code', resendAfterSeconds: 60, expiresInSeconds: 600 }),
      'POST /api/auth/email/verify': () =>
        jsonResponse(400, { error: { code: 'CODE_INVALID', message: 'Kod hatalı.' } }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'yeni@example.com');
    await ue.type(await screen.findByLabelText('Doğrulama Kodu'), '000000');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kod hatalı ya da süresi dolmuş');
  });

  it('eksik haneli kod için istek göndermez', async () => {
    const fetchMock = mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () =>
        jsonResponse(200, { step: 'code', resendAfterSeconds: 60, expiresInSeconds: 600 }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'yeni@example.com');
    await ue.type(await screen.findByLabelText('Doğrulama Kodu'), '123');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(
      await screen.findByRole('button', { name: 'Kod 6 haneli olmalıdır.' }),
    ).toBeInTheDocument();
    const verifyCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/verify'));
    expect(verifyCalls).toHaveLength(0);
  });

  it('e-posta gönderilemezse kullanıcı dostu mesaj gösterir', async () => {
    mockFetch({
      ...anonymousRoutes,
      'POST /api/auth/email/start': () =>
        jsonResponse(503, { error: { code: 'EMAIL_UNAVAILABLE', message: 'x' } }),
    });
    const ue = await openEmailForm();
    await submitEmail(ue, 'yeni@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Doğrulama e-postası şu anda gönderilemiyor',
    );
  });

  it('ağ hatasında kullanıcı dostu mesaj gösterir', async () => {
    // POST /api/auth/email/start tanımsız → fetch "Failed to fetch" fırlatır.
    mockFetch(anonymousRoutes);
    const ue = await openEmailForm();
    await submitEmail(ue, 'kullanici@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('Sunucuya ulaşılamadı');
  });

  it('erişilebilirlik ihlali içermez (hata durumunda da)', async () => {
    mockFetch(anonymousRoutes);
    const ue = await openEmailForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Devam Et' })).toBeEnabled());
    await ue.click(screen.getByRole('button', { name: 'Devam Et' }));
    await screen.findByRole('button', { name: 'E-posta adresinizi girin.' });
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe('Oturum', () => {
  it.each(['/login', '/login/e-posta'])(
    'aktif oturumla %s stok ekranini acar ve cikis yapilabilir',
    async (path) => {
      let loggedIn = true;
      mockFetch({
        ...anonymousRoutes,
        'GET /api/auth/me': () =>
          loggedIn
            ? jsonResponse(200, { user })
            : jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: '' } }),
        'POST /api/auth/logout': () => {
          loggedIn = false;
          return new Response(null, { status: 204 });
        },
      });
      renderApp(path);
      await screen.findByRole('heading', { name: 'Yeni Stok Kartı' });
      expect(screen.queryByText(/Hesap paneli bir sonraki/)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /Çıkış Yap/ }));
      expect(await screen.findByRole('heading', { name: optionsHeading })).toBeInTheDocument();
    },
  );
});
