import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import {
  apiFetch,
  ApiClientError,
  createTodo,
  deleteTodo,
  listTodos,
  login,
  logout,
  me,
  register,
  updateTodo,
} from './api';

interface MockResponseInit {
  status?: number;
  body?: unknown;
  contentType?: string;
}

function mockResponse({
  status = 200,
  body,
  contentType = 'application/json',
}: MockResponseInit = {}): Response {
  if (status === 204) {
    return new Response(null, { status });
  }
  const headers = new Headers({ 'Content-Type': contentType });
  if (body === undefined) {
    return new Response(null, { status, headers });
  }
  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify(body), { status, headers });
  }
  return new Response(String(body), { status, headers });
}

type FetchSpy = MockInstance<typeof fetch>;

function getCallInit(spy: FetchSpy, callIndex = 0): RequestInit {
  const call = spy.mock.calls[callIndex];
  if (!call) throw new Error(`fetch was not called at index ${callIndex}`);
  const init = call[1];
  if (!init) throw new Error('fetch called without an init argument');
  return init as RequestInit;
}

function getCallUrl(spy: FetchSpy, callIndex = 0): string {
  const call = spy.mock.calls[callIndex];
  if (!call) throw new Error(`fetch was not called at index ${callIndex}`);
  return String(call[0]);
}

function readHeader(init: RequestInit, name: string): string | null {
  const headers = new Headers(init.headers);
  return headers.get(name);
}

describe('apiFetch', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("attaches credentials: 'include' on every request", async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { ok: true } }));
    await apiFetch<{ ok: boolean }>('/api/anything');
    const init = getCallInit(fetchSpy);
    expect(init.credentials).toBe('include');
  });

  it('sets Content-Type: application/json when a body is present', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { ok: true } }));
    await apiFetch<{ ok: boolean }>('/api/anything', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
    const init = getCallInit(fetchSpy);
    expect(readHeader(init, 'Content-Type')).toBe('application/json');
  });

  it('does not override an existing Content-Type', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: { ok: true } }));
    await apiFetch<{ ok: boolean }>('/api/anything', {
      method: 'POST',
      body: 'raw',
      headers: { 'Content-Type': 'text/plain' },
    });
    const init = getCallInit(fetchSpy);
    expect(readHeader(init, 'Content-Type')).toBe('text/plain');
  });

  it('parses JSON response on 2xx', async () => {
    const payload = { hello: 'world' };
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: payload }));
    const result = await apiFetch<typeof payload>('/api/anything');
    expect(result).toEqual(payload);
  });

  it('returns undefined for 204', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 204 }));
    const result = await apiFetch<void>('/api/anything', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws ApiClientError with status + parsed body on non-2xx JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 400,
        body: { error: 'Validation failed', details: { email: ['bad'] } },
      }),
    );

    await expect(apiFetch('/api/anything')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 400,
      body: {
        error: 'Validation failed',
        details: { email: ['bad'] },
      },
    });
  });

  it('throws ApiClientError with synthetic body when non-2xx response has no JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ status: 502, body: 'gateway down', contentType: 'text/plain' }),
    );

    await expect(apiFetch('/api/anything')).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe('me()', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns null on 401 (does not throw)', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ status: 401, body: { error: 'Unauthorized' } }),
    );
    const result = await me();
    expect(result).toBeNull();
  });

  it('returns AuthResponse on 200', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 200,
        body: { user: { id: '1', email: 'a@b.c', createdAt: 'now' } },
      }),
    );
    const result = await me();
    expect(result?.user.email).toBe('a@b.c');
  });

  it('rethrows non-401 errors', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ status: 500, body: { error: 'boom' } }),
    );
    await expect(me()).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe('endpoint helpers issue the right HTTP request', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('login(input) POSTs to /api/auth/login with the input as JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ body: { user: { id: '1', email: 'a@b.c', createdAt: 'now' } } }),
    );
    await login({ email: 'a@b.c', password: 'password123' });
    expect(getCallUrl(fetchSpy)).toBe('/api/auth/login');
    const init = getCallInit(fetchSpy);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'a@b.c',
      password: 'password123',
    });
    expect(readHeader(init, 'Content-Type')).toBe('application/json');
  });

  it('register(input) POSTs to /api/auth/register with the input as JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 201,
        body: { user: { id: '1', email: 'r@b.c', createdAt: 'now' } },
      }),
    );
    await register({ email: 'r@b.c', password: 'password123' });
    expect(getCallUrl(fetchSpy)).toBe('/api/auth/register');
    const init = getCallInit(fetchSpy);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'r@b.c',
      password: 'password123',
    });
  });

  it('logout() POSTs to /api/auth/logout', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 204 }));
    await logout();
    expect(getCallUrl(fetchSpy)).toBe('/api/auth/logout');
    expect(getCallInit(fetchSpy).method).toBe('POST');
  });

  it('listTodos() GETs /api/todos', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: [] }));
    const result = await listTodos();
    expect(result).toEqual([]);
    expect(getCallUrl(fetchSpy)).toBe('/api/todos');
    const init = getCallInit(fetchSpy);
    // GET requests may omit method (default is GET); accept both
    expect(init.method ?? 'GET').toMatch(/^GET$/i);
  });

  it('createTodo(input) POSTs to /api/todos', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 201,
        body: {
          id: 't1',
          userId: 'u1',
          title: 'buy milk',
          completed: false,
          dueAt: null,
          createdAt: 'now',
          updatedAt: 'now',
        },
      }),
    );
    const t = await createTodo({ title: 'buy milk' });
    expect(t.title).toBe('buy milk');
    expect(getCallUrl(fetchSpy)).toBe('/api/todos');
    const init = getCallInit(fetchSpy);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ title: 'buy milk' });
  });

  it('createTodo(input) sends dueAt when provided', async () => {
    const dueAt = '2026-06-15T17:00:00.000Z';
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        status: 201,
        body: {
          id: 't1',
          userId: 'u1',
          title: 'pay rent',
          completed: false,
          dueAt,
          createdAt: 'now',
          updatedAt: 'now',
        },
      }),
    );
    const t = await createTodo({ title: 'pay rent', dueAt });
    expect(t.dueAt).toBe(dueAt);
    const init = getCallInit(fetchSpy);
    expect(JSON.parse(String(init.body))).toEqual({ title: 'pay rent', dueAt });
  });

  it('updateTodo(id, input) PATCHes /api/todos/:id', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          id: 't1',
          userId: 'u1',
          title: 'x',
          completed: true,
          dueAt: null,
          createdAt: 'now',
          updatedAt: 'now',
        },
      }),
    );
    await updateTodo('t1', { completed: true });
    expect(getCallUrl(fetchSpy)).toBe('/api/todos/t1');
    const init = getCallInit(fetchSpy);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ completed: true });
  });

  it('updateTodo(id, { dueAt: null }) sends explicit null in body', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          id: 't1',
          userId: 'u1',
          title: 'x',
          completed: false,
          dueAt: null,
          createdAt: 'now',
          updatedAt: 'now',
        },
      }),
    );
    await updateTodo('t1', { dueAt: null });
    const init = getCallInit(fetchSpy);
    const parsed = JSON.parse(String(init.body)) as { dueAt: unknown };
    expect(parsed).toEqual({ dueAt: null });
    expect(parsed.dueAt).toBeNull();
  });

  it('deleteTodo(id) DELETEs /api/todos/:id', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ status: 204 }));
    await deleteTodo('t1');
    expect(getCallUrl(fetchSpy)).toBe('/api/todos/t1');
    expect(getCallInit(fetchSpy).method).toBe('DELETE');
  });

  it('updateTodo url-encodes the id', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        body: {
          id: 'a/b',
          userId: 'u1',
          title: 'x',
          completed: false,
          dueAt: null,
          createdAt: 'now',
          updatedAt: 'now',
        },
      }),
    );
    await updateTodo('a/b', { title: 'x' });
    expect(getCallUrl(fetchSpy)).toBe('/api/todos/a%2Fb');
  });
});

describe('listTodos query params', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('omits the query string entirely when no params are given', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: [] }));
    await listTodos();
    expect(getCallUrl(fetchSpy)).toBe('/api/todos');
  });

  it('includes ?sort=dueAt-asc when sort is set', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: [] }));
    await listTodos({ sort: 'dueAt-asc' });
    expect(getCallUrl(fetchSpy)).toBe('/api/todos?sort=dueAt-asc');
  });

  it('URL-encodes from and to ISO strings', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: [] }));
    const from = '2026-06-01T00:00:00.000Z';
    const to = '2026-07-01T00:00:00.000Z';
    await listTodos({ from, to });
    const url = getCallUrl(fetchSpy);
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/todos');
    expect(parsed.searchParams.get('from')).toBe(from);
    expect(parsed.searchParams.get('to')).toBe(to);
    expect(url).toContain('from=2026-06-01T00%3A00%3A00.000Z');
    expect(url).toContain('to=2026-07-01T00%3A00%3A00.000Z');
  });

  it('includes all three params together', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ body: [] }));
    await listTodos({
      sort: 'dueAt-asc',
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
    });
    const parsed = new URL(getCallUrl(fetchSpy), 'http://localhost');
    expect(parsed.searchParams.get('sort')).toBe('dueAt-asc');
    expect(parsed.searchParams.get('from')).toBe('2026-06-01T00:00:00.000Z');
    expect(parsed.searchParams.get('to')).toBe('2026-07-01T00:00:00.000Z');
  });
});
