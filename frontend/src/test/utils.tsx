import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ToastProvider } from '../components/Toast';

type Handler = (init: RequestInit & { url: string }) => unknown;

/**
 * Replaces `fetch` with a tiny router: keys are "METHOD /path" (path without
 * the /api prefix and query string), values are JSON bodies or functions.
 */
export function mockApi(routes: Record<string, unknown | Handler>) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api/, '');
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ method, path, body });

    const key = `${method} ${path}`;
    if (!(key in routes)) {
      return new Response(JSON.stringify({ error: { code: 'not_found', message: key } }), {
        status: 404,
      });
    }
    const route = routes[key];
    const result =
      typeof route === 'function' ? (route as Handler)({ ...init, url: url.href }) : route;
    if (result instanceof Response) return result;
    if (result === undefined) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(result), {
      status: method === 'POST' ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

export function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function renderApp(
  ui: ReactElement,
  { route = '/', path = '*', queryClient = testQueryClient() } = {},
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="*" element={<div>Other page</div>} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const user = {
  id: 1,
  email: 'reader@example.com',
  display_name: 'Reader',
  created_at: '2026-01-01T00:00:00Z',
};
