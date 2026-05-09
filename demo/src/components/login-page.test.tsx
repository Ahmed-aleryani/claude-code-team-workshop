import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './login-page';
import { ApiClientError } from '../lib/api';
import { renderWithRouter, buildAuthValue, type AuthStub } from '../test/render';
import { useAuth } from '../lib/auth-context';

vi.mock('../lib/auth-context', async () => {
  const actual = await vi.importActual<typeof import('../lib/auth-context')>(
    '../lib/auth-context',
  );
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const navigateMock = vi.fn<(path: string, opts?: { replace?: boolean }) => void>();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function setAuth(stub: AuthStub): void {
  vi.mocked(useAuth).mockReturnValue(buildAuthValue(stub));
}

describe('<LoginPage />', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useAuth).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    setAuth({});
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors and does not call login when fields are invalid', async () => {
    const login = vi.fn();
    setAuth({ login });
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'x');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('calls useAuth().login (which fetches /api/auth/login) on valid submit', async () => {
    const login = vi.fn().mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.co',
      createdAt: 'now',
    });
    setAuth({ login });
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.co');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'password123',
    });
  });

  it('renders the error message in <ErrorBanner /> on 401', async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError(401, { error: 'Invalid email or password' }),
      );
    setAuth({ login });
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.co');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/invalid email or password/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('calls navigate("/") on success', async () => {
    const login = vi.fn().mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.co',
      createdAt: 'now',
    });
    setAuth({ login });
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.co');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });
});
