import type {
  EmailStartResponse,
  EmailVerifyInput,
  LoginInput,
  MeResponse,
  ProvidersResponse,
  PublicUser,
} from '@gt/shared';
import { API_BASE_URL, ApiError, apiRequest } from '../../../lib/http';

/**
 * Auth API'si için ince istemci katmanı. Bileşenler doğrudan fetch kullanmaz;
 * ileride e-posta+şifre yerine e-posta+kod (OTP) akışı eklendiğinde yalnızca burası
 * ve ilgili form değişir.
 */
export const authApi = {
  async login(input: LoginInput): Promise<PublicUser> {
    const { user } = await apiRequest<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: input,
    });
    return user;
  },

  /** E-Posta İle Devam Et adım 1: hesap kayıtlıysa 'password', değilse kod gönderilir ('code'). */
  emailStart(email: string): Promise<EmailStartResponse> {
    return apiRequest<EmailStartResponse>('/api/auth/email/start', {
      method: 'POST',
      body: { email },
    });
  },

  async emailVerify(input: EmailVerifyInput): Promise<PublicUser> {
    const { user } = await apiRequest<MeResponse>('/api/auth/email/verify', {
      method: 'POST',
      body: input,
    });
    return user;
  },

  /** Oturum yoksa null döner; diğer hatalar fırlatılır. */
  async me(): Promise<PublicUser | null> {
    try {
      const { user } = await apiRequest<MeResponse>('/api/auth/me');
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  logout(): Promise<void> {
    return apiRequest<void>('/api/auth/logout', { method: 'POST' });
  },

  providers(): Promise<ProvidersResponse> {
    return apiRequest<ProvidersResponse>('/api/auth/providers');
  },

  /** OAuth tam sayfa yönlendirme ile başlar (popup değil): mobil tarayıcılarda en güvenilir yol. */
  providerStartUrl: (provider: 'google' | 'apple') => `${API_BASE_URL}/api/auth/${provider}`,
};
