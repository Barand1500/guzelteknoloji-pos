import type { ApiErrorBody, ApiErrorCode } from '@gt/shared';

/** Ayrı domain dağıtımında API adresi; tek origin'de boş bırakılır. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Sunucuya hiç ulaşılamadı (çevrimdışı, zaman aşımı, DNS vb.). */
export class NetworkError extends Error {
  constructor() {
    super('network');
    this.name = 'NetworkError';
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error?.code === 'string'
  );
}

export async function apiRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      credentials: API_BASE_URL ? 'include' : 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : null,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // JSON olmayan yanıt (ör. proxy hata sayfası) aşağıda genel hataya dönüşür.
  }

  if (!response.ok) {
    if (isApiErrorBody(data)) {
      throw new ApiError(response.status, data.error.code, data.error.message);
    }
    throw new ApiError(response.status, 'INTERNAL_ERROR', 'Beklenmeyen bir hata oluştu.');
  }
  return data as T;
}
