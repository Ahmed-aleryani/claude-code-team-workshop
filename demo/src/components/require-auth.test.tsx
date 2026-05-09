import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { RequireAuth } from './require-auth';
import { renderWithRouter, buildAuthValue, type AuthStub } from '../test/render';
import { useAuth } from '../lib/auth-context';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>(
    '../lib/auth-context',
  );
  return { ...actual, useAuth: vi.fn() };
});

function setAuth(stub: AuthStub): void {
  vi.mocked(useAuth).mockReturnValue(buildAuthValue(stub));
}

describe('<RequireAuth />', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the loading placeholder when status === 'loading'", () => {
    setAuth({ status: 'loading' });
    renderWithRouter(
      <RequireAuth>
        <div>secret content</div>
      </RequireAuth>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.queryByText(/secret content/i)).not.toBeInTheDocument();
  });

  it('redirects to /login when status === ready and user is null', () => {
    setAuth({ status: 'ready', user: null });
    renderWithRouter(
      <RequireAuth>
        <div>secret content</div>
      </RequireAuth>,
      {
        route: '/',
        routes: [
          {
            path: '/',
            element: (
              <RequireAuth>
                <div>secret content</div>
              </RequireAuth>
            ),
          },
          { path: '/login', element: <div>login screen</div> },
        ],
      },
    );
    expect(screen.getByText(/login screen/i)).toBeInTheDocument();
    expect(screen.queryByText(/secret content/i)).not.toBeInTheDocument();
  });

  it('renders children when user is set', () => {
    setAuth({
      status: 'ready',
      user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
    });
    renderWithRouter(
      <RequireAuth>
        <div>secret content</div>
      </RequireAuth>,
    );
    expect(screen.getByText(/secret content/i)).toBeInTheDocument();
  });
});
