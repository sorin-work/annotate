const TOKEN_KEY = 'annotate.token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Called when the API rejects our token, so the app can sign the user out. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function send(
  method: Method,
  path: string,
  body?: BodyInit,
  json = false,
  keepalive = false,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    // keepalive lets a request finish while the page is being closed.
    res = await fetch(`/api${path}`, { method, headers, body, ...(keepalive && { keepalive }) });
  } catch {
    // fetch only rejects when the request never got an answer.
    throw new ApiError(
      0,
      'Could not reach the server. Check your connection and try again.',
      'network_error',
    );
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error = data?.error;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, error?.message ?? `Request failed (${res.status})`, error?.code);
  }
  return res;
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  keepalive = false,
): Promise<T> {
  const res = await send(
    method,
    path,
    body === undefined ? undefined : JSON.stringify(body),
    body !== undefined,
    keepalive,
  );
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown, { keepalive = false } = {}) =>
    request<T>('PUT', path, body, keepalive),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
  upload: async <T>(path: string, form: FormData): Promise<T> =>
    (await (await send('POST', path, form)).json()) as T,
  /** Fetches a file and returns it with the name the server suggested. */
  download: async (path: string): Promise<{ blob: Blob; filename: string | null }> => {
    const res = await send('GET', path);
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return { blob: await res.blob(), filename: match?.[1] ?? null };
  },
};

/** Builds `?a=1&b=2`, skipping empty values. Returns '' when nothing is set. */
export function toQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
