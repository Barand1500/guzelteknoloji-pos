import { useSession } from '../features/auth/hooks/session-context';
import { hasDevAccess } from '../features/dev-login/devAccess';
import { API_BASE_URL, ApiError } from './http';

/** Deneme verisi yalnızca açıkça seçilen anonim test oturumunda kullanılır. */
export function useDataService<T>(api: T, demo: T): T {
  const { session } = useSession();
  return session.status === 'anonymous' && hasDevAccess() ? demo : api;
}
export const imageAddress = (value: string | null) =>
  value && value.startsWith('/api/') ? API_BASE_URL + value : value;
export const imagePayload = (value: string | null) =>
  API_BASE_URL && value?.startsWith(API_BASE_URL + '/api/')
    ? value.slice(API_BASE_URL.length)
    : value;
export const dataError = (error: unknown) =>
  error instanceof ApiError || (error instanceof Error && error.message !== 'network')
    ? error.message
    : 'Sunucuya ulaşılamadı. Tekrar deneyin.';
