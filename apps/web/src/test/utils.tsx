import { render } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from '../app/App';
import { DEFAULT_STOCK_LOOKUPS } from '@gt/shared';

type Handler = (init?: RequestInit) => Response | Promise<Response>;

export const jsonResponse = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** fetch'i yol bazında taklit eder; tanımsız yollar ağ hatası gibi davranır. */
export function mockFetch(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, 'http://localhost').pathname;
    const handler = routes[`${init?.method ?? 'GET'} ${path}`];
    if (!handler) throw new TypeError('Failed to fetch');
    return handler(init);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const anonymousRoutes: Record<string, Handler> = {
  'GET /api/ozellikler': () => jsonResponse(200, { templates: [], groups: [], values: [] }),
  'GET /api/kategoriler': () => jsonResponse(200, []),
  'GET /api/firsatlar': () => jsonResponse(200, []),
  'GET /api/stok/secenekler': () => jsonResponse(200, DEFAULT_STOCK_LOOKUPS),
  'GET /api/auth/me': () =>
    jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Oturum bulunamadı.' } }),
  'GET /api/auth/providers': () => jsonResponse(200, { google: true, apple: false }),
};

export function renderApp(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** axe-core ile otomatik erişilebilirlik denetimi (renk kontrastı jsdom'da ölçülemediği için hariç). */
export async function axeViolations(container: Element) {
  const result = await axe.run(container, {
    // jsdom'da iframe içine girilemez; iframe'in kendisi (title vb.) yine denetlenir.
    iframes: false,
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}
