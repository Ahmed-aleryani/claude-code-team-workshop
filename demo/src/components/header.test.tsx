import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './header';
import { renderWithRouter, buildAuthValue, type AuthStub } from '../test/render';
import { useAuth } from '../lib/auth-context';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>(
    '../lib/auth-context',
  );
  return { ...actual, useAuth: vi.fn() };
});

const navigateMock = vi.fn<(path: string, opts?: { replace?: boolean }) => void>();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function setAuth(stub: AuthStub): void {
  vi.mocked(useAuth).mockReturnValue(buildAuthValue(stub));
}

describe('<Header />', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useAuth).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and Log out button when authenticated', () => {
    setAuth({
      status: 'ready',
      user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
    });
    renderWithRouter(<Header />);

    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('does not render the user block when unauthenticated', () => {
    setAuth({ status: 'ready', user: null });
    renderWithRouter(<Header />);
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('does not render the user block while still loading', () => {
    setAuth({
      status: 'loading',
      user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
    });
    renderWithRouter(<Header />);
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('clicking Log out calls useAuth().logout()', async () => {
    const logout = vi.fn().mockResolvedValueOnce(undefined);
    setAuth({
      status: 'ready',
      user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
      logout,
    });
    const user = userEvent.setup();
    renderWithRouter(<Header />);

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
