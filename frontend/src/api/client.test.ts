import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthorizedHandler, toQuery, tokenStore } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStore.set('abc');
    const fetchMock = stubFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(api.post('/things', { a: 1 })).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/things');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
  });

  it('explains network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = await api.get('/documents').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'network_error' });
    expect((error as ApiError).message).toMatch(/could not reach the server/i);
  });

  it('turns error responses into ApiError', async () => {
    stubFetch(
      new Response(
        JSON.stringify({ error: { code: 'not_found', message: 'Document not found' } }),
        {
          status: 404,
        },
      ),
    );
    const error = await api.get('/documents/1').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'Document not found' });
  });

  it('calls the unauthorized handler when a token is rejected', async () => {
    tokenStore.set('expired');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(new Response('{}', { status: 401 }));
    await expect(api.get('/auth/me')).rejects.toThrow('Request failed (401)');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('returns undefined for 204 responses', async () => {
    stubFetch(new Response(null, { status: 204 }));
    await expect(api.delete('/highlights/1')).resolves.toBeUndefined();
  });

  it('reads the download filename from Content-Disposition', async () => {
    stubFetch(
      new Response('# Notes', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="notes.md"' },
      }),
    );
    const { filename, blob } = await api.download('/documents/1/export?format=md');
    expect(filename).toBe('notes.md');
    expect(await blob.text()).toBe('# Notes');
  });
});

describe('toQuery', () => {
  it('skips empty values', () => {
    expect(toQuery({ q: 'fox', tag: '', color: null, limit: 20, offset: undefined })).toBe(
      '?q=fox&limit=20',
    );
    expect(toQuery({})).toBe('');
  });
});
