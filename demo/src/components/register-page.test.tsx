import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from './register-page';
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

describe('<RegisterPage />', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useAuth).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password, and confirm-password fields', () => {
    setAuth({});
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows a mismatch error and does not call register when passwords do not match', async () => {
    const register = vi.fn();
    setAuth({ register });
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'a@b.co');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('does not call register when password is shorter than 8 chars', async () => {
    const register = vi.fn();
    setAuth({ register });
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'a@b.co');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('calls register and navigates to "/" on success', async () => {
    const register = vi.fn().mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.co',
      createdAt: 'now',
    });
    setAuth({ register });
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByLabelText(/^email$/i), 'a@b.co');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(register).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'password123',
    });
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });
});
