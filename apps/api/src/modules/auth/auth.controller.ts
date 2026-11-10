import type {
  EmailStartResponse,
  GoogleErrorCode,
  MeResponse,
  ProvidersResponse,
} from '@gt/shared';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { Logger } from '../../lib/logger';
import {
  clearOAuthCookie,
  clearSessionCookie,
  readOAuthCookie,
  readSessionToken,
  setOAuthCookie,
  setSessionCookie,
} from './auth.cookies';
import {
  emailStartSchema,
  emailVerifySchema,
  googleCallbackQuerySchema,
  loginSchema,
} from './auth.schemas';
import { GoogleLoginError, type AuthService } from './auth.service';
import { toPublicUser, type RequestMeta } from './auth.types';
import type { GoogleOidcClient } from './google.client';
import type { WorkspaceChallenge } from '../workspace/workspace.integrations';
import { setAppleFlow, readAppleFlow, clearAppleFlow } from './auth.cookies';

export interface AuthControllerDeps {
  env: Env;
  service: AuthService;
  google: GoogleOidcClient | null;
  apple?: GoogleOidcClient | null;
  logger: Logger;
  challenge?: WorkspaceChallenge;
}

function requestMeta(req: Request): RequestMeta {
  return { ipAddress: req.ip ?? null, userAgent: req.get('user-agent') ?? null };
}

export function createAuthController({
  env,
  service,
  google,
  apple,
  logger,
  challenge,
}: AuthControllerDeps) {
  const loginPageUrl = (error?: GoogleErrorCode) => {
    const url = new URL('/login', env.APP_URL);
    if (error) url.searchParams.set('hata', error);
    return url.href;
  };

  return {
    async robotConfig(req: Request, res: Response) {
      const email = req.body?.email;
      if (email !== undefined && !emailStartSchema.safeParse({ email }).success)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli e-posta adresi girin.');
      res.set('Cache-Control', 'no-store');
      res.json({ challenge: (await challenge?.publicConfig(email)) ?? null });
    },
    providers(_req: Request, res: Response<ProvidersResponse>) {
      // Apple ile giriş arayüzde vardır ama henüz yapılandırılmamıştır (Apple Developer hesabı gerekir).
      res.json({ google: google !== null, apple: Boolean(apple) });
    },

    async emailStart(req: Request, res: Response<EmailStartResponse>) {
      const { email } = emailStartSchema.parse(req.body);
      await challenge?.enforce(email, req.body.challengeToken, req.ip);
      res.set('Cache-Control', 'no-store');
      res.json(await service.startEmail(email, requestMeta(req)));
    },

    async emailVerify(req: Request, res: Response<MeResponse>) {
      const { email, code } = emailVerifySchema.parse(req.body);
      await challenge?.enforce(email, req.body.challengeToken, req.ip);
      const session = await service.verifyEmailCode(
        email,
        code,
        requestMeta(req),
        readSessionToken(req, env),
      );
      setSessionCookie(res, env, session.token, session.expiresAt);
      res.json({ user: toPublicUser(session.user) });
    },

    async appleStart(_req: Request, res: Response) {
      if (!apple) return res.redirect(303, loginPageUrl('apple_yapilandirilmamis'));
      try {
        const flow = await apple.createAuthRequest();
        setAppleFlow(res, env, flow);
        res.redirect(303, flow.url);
      } catch {
        res.redirect(303, loginPageUrl('apple_dogrulama'));
      }
    },

    async appleCallback(req: Request, res: Response) {
      const flow = readAppleFlow(req);
      clearAppleFlow(res, env);
      if (!apple) return res.redirect(303, loginPageUrl('apple_yapilandirilmamis'));
      const parsed = googleCallbackQuerySchema.safeParse(req.body);
      if (!flow || !parsed.success || !parsed.data.code || parsed.data.state !== flow.state) {
        return res.redirect(303, loginPageUrl('apple_dogrulama'));
      }
      try {
        const params = new URLSearchParams({ code: parsed.data.code, state: parsed.data.state });
        const claims = await apple.exchangeCode(params, flow);
        // Lax session cookies are intentionally unavailable on Apple's cross-site POST.
        const session = await service.loginWithProvider('APPLE', claims, requestMeta(req));
        setSessionCookie(res, env, session.token, session.expiresAt);
        return res.redirect(303, new URL(env.POST_LOGIN_PATH, env.APP_URL).href);
      } catch (error) {
        const code =
          error instanceof GoogleLoginError && error.code === 'google_hesap_mevcut'
            ? 'apple_hesap_mevcut'
            : 'apple_dogrulama';
        return res.redirect(303, loginPageUrl(code));
      }
    },

    async login(req: Request, res: Response<MeResponse>) {
      const input = loginSchema.parse(req.body);
      await challenge?.enforce(input.email, req.body.challengeToken, req.ip);
      const session = await service.loginWithPassword(
        input,
        requestMeta(req),
        readSessionToken(req, env),
      );
      setSessionCookie(res, env, session.token, session.expiresAt);
      res.json({ user: toPublicUser(session.user) });
    },

    async me(req: Request, res: Response<MeResponse>) {
      const token = readSessionToken(req, env);
      const found = token ? await service.getSession(token) : null;
      if (!found) {
        if (token) clearSessionCookie(res, env);
        throw new HttpError(401, 'UNAUTHENTICATED', 'Oturum bulunamadı.');
      }
      res.set('Cache-Control', 'no-store');
      res.json({ user: toPublicUser(found.user) });
    },

    async logout(req: Request, res: Response) {
      const token = readSessionToken(req, env);
      if (token) await service.logout(token);
      clearSessionCookie(res, env);
      res.status(204).end();
    },

    async googleStart(_req: Request, res: Response) {
      if (!google) return res.redirect(303, loginPageUrl('google_yapilandirilmamis'));
      try {
        const { url, state, nonce, codeVerifier } = await google.createAuthRequest();
        setOAuthCookie(res, env, { state, nonce, codeVerifier });
        res.redirect(303, url);
      } catch (error) {
        logger.error({ err: error }, 'Google OIDC başlatılamadı');
        res.redirect(303, loginPageUrl('google_dogrulama'));
      }
    },

    async googleCallback(req: Request, res: Response) {
      const flow = readOAuthCookie(req);
      // State/nonce/verifier tek kullanımlıktır: sonuç ne olursa olsun silinir.
      clearOAuthCookie(res, env);

      if (!google) return res.redirect(303, loginPageUrl('google_yapilandirilmamis'));

      const query = googleCallbackQuerySchema.safeParse(req.query);
      if (query.success && query.data.error === 'access_denied') {
        return res.redirect(303, loginPageUrl('google_iptal'));
      }
      if (!query.success || !query.data.code || !flow) {
        return res.redirect(303, loginPageUrl('google_dogrulama'));
      }

      let claims;
      try {
        const params = new URL(req.originalUrl, 'http://placeholder').searchParams;
        claims = await google.exchangeCode(params, flow);
      } catch (error) {
        // Hata nesnesi loglanır; code/token gibi hassas değerler loglanmaz.
        logger.warn(
          { err: { name: (error as Error).name, message: (error as Error).message } },
          'Google callback doğrulaması başarısız',
        );
        return res.redirect(303, loginPageUrl('google_dogrulama'));
      }

      try {
        const session = await service.loginWithGoogle(
          claims,
          requestMeta(req),
          readSessionToken(req, env),
        );
        setSessionCookie(res, env, session.token, session.expiresAt);
        res.redirect(303, new URL(env.POST_LOGIN_PATH, env.APP_URL).href);
      } catch (error) {
        if (error instanceof GoogleLoginError) {
          return res.redirect(303, loginPageUrl(error.code));
        }
        // Veritabanı vb. beklenmeyen hata: kullanıcı JSON hata sayfasında kalmasın, /login'e dönsün.
        logger.error({ err: error }, 'Google girişi tamamlanamadı');
        return res.redirect(303, loginPageUrl('google_sunucu'));
      }
    },
  };
}
