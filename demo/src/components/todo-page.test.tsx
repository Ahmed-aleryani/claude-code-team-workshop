import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Todo } from '../../shared/types';
import { TodoPage } from './todo-page';
import { renderWithRouter } from '../test/render';

interface MockResponseInit {
  status?: number;
  body?: unknown;
}

function jsonResponse({ status = 200, body }: MockResponseInit = {}): Response {
  if (status === 204) return new Response(null, { status });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  return new Response(JSON.stringify(body ?? null), { status, headers });
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? 't1',
    userId: overrides.userId ?? 'u1',
    title: overrides.title ?? 'demo todo',
    completed: overrides.completed ?? false,
    dueAt: overrides.dueAt ?? null,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

type FetchSpy = MockInstance<typeof fetch>;

describe('<TodoPage />', () => {
  let fetchSpy: FetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('fetches /api/todos on mount and renders the empty state for []', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ body: [] }));
    renderWithRouter(<TodoPage />);

    expect(await screen.findByText(/no todos yet/i)).toBeInTheDocument();
    // Default filter is 'all', default sort is 'createdAt-desc' → URL carries the sort param.
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/todos?sort=createdAt-desc',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('renders one TodoItem per todo when todos exist', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        body: [
          makeTodo({ id: 't1', title: 'first' }),
          makeTodo({ id: 't2', title: 'second' }),
        ],
      }),
    );
    renderWithRouter(<TodoPage />);

    expect(await screen.findByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('adds a todo via the composer (POST /api/todos) and shows it', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ body: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 201,
          body: makeTodo({ id: 't-new', title: 'fresh todo' }),
        }),
      );
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    await screen.findByText(/no todos yet/i);

    const input = screen.getByPlaceholderText(/what needs doing/i);
    await user.type(input, 'fresh todo');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(await screen.findByText('fresh todo')).toBeInTheDocument();

    const postCall = fetchSpy.mock.calls[1];
    expect(postCall?.[0]).toBe('/api/todos');
    const init = postCall?.[1] as RequestInit | undefined;
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      title: 'fresh todo',
      dueAt: null,
    });
  });

  it('shows error banner when listTodos fails on mount', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ status: 500, body: { error: 'Database unavailable' } }),
    );
    renderWithRouter(<TodoPage />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/database unavailable/i);
  });

  it('reverts the todo state when toggle API fails', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResponse({
          body: [makeTodo({ id: 't1', title: 'toggle me', completed: false })],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ status: 500, body: { error: 'Toggle failed' } }),
      );
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    const checkbox = (await screen.findByRole('checkbox')) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/toggle failed/i);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('reverts the todo state when delete API fails', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse({
            body: [makeTodo({ id: 't1', title: 'delete me' })],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ status: 500, body: { error: 'Delete failed' } }),
        );
      const user = userEvent.setup();
      renderWithRouter(<TodoPage />);

      expect(await screen.findByText('delete me')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /delete/i }));

      const banner = await screen.findByRole('alert');
      expect(banner).toHaveTextContent(/delete failed/i);
      expect(screen.getByText('delete me')).toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
    }
  });
});

describe('<TodoPage /> — sort/filter refetch', () => {
  let fetchSpy: FetchSpy;
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    process.env.TZ = 'UTC';
    // Only fake Date so userEvent's internal setTimeout/microtask scheduling stays real.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-09T12:00:00.000Z'));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
    vi.clearAllMocks();
  });

  function getCallUrl(callIndex: number): string {
    const call = fetchSpy.mock.calls[callIndex];
    if (!call) throw new Error(`fetch was not called at index ${callIndex}`);
    return String(call[0]);
  }

  it('changing sort triggers a refetch with sort=dueAt-asc', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ body: [] }));
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    await screen.findByText(/no todos yet/i);
    expect(getCallUrl(0)).toBe('/api/todos?sort=createdAt-desc');

    await user.selectOptions(
      screen.getByLabelText(/^sort$/i) as HTMLSelectElement,
      'dueAt-asc',
    );

    await vi.waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(getCallUrl(1)).toBe('/api/todos?sort=dueAt-asc');
  });

  it('clicking the Overdue filter refetches with ?to=<now>', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ body: [] }));
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    await screen.findByText(/no todos yet/i);
    await user.click(screen.getByRole('button', { name: /^overdue$/i }));

    await vi.waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    const url = new URL(getCallUrl(1), 'http://localhost');
    expect(url.pathname).toBe('/api/todos');
    expect(url.searchParams.get('sort')).toBe('createdAt-desc');
    expect(url.searchParams.get('to')).toBe('2026-05-09T12:00:00.000Z');
    expect(url.searchParams.get('from')).toBeNull();
  });

  it('clicking the This week filter refetches with from=now and to=now+7d', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ body: [] }));
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    await screen.findByText(/no todos yet/i);
    await user.click(screen.getByRole('button', { name: /^this week$/i }));

    await vi.waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    const url = new URL(getCallUrl(1), 'http://localhost');
    expect(url.searchParams.get('from')).toBe('2026-05-09T12:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-05-16T12:00:00.000Z');
  });

  it('clicking the Today filter refetches with start- and end-of-day in UTC', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ body: [] }));
    const user = userEvent.setup();
    renderWithRouter(<TodoPage />);

    await screen.findByText(/no todos yet/i);
    await user.click(screen.getByRole('button', { name: /^today$/i }));

    await vi.waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    const url = new URL(getCallUrl(1), 'http://localhost');
    // process.env.TZ=UTC → setHours(0,0,0,0) anchors to UTC midnight of 2026-05-09.
    // Today range = [start-of-today, start-of-tomorrow); the exclusive `<` operator
    // on the server makes this the closed-open interval that matches user intent.
    expect(url.searchParams.get('from')).toBe('2026-05-09T00:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-05-10T00:00:00.000Z');
  });
});
