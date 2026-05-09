import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-context';
import * as api from './api';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider mount → me()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls api.me() and hydrates user when present; status: loading → ready', async () => {
    const meSpy = vi
      .spyOn(api, 'me')
      .mockResolvedValueOnce({
        user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
      });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.user?.email).toBe('me@example.com');
    expect(meSpy).toHaveBeenCalledTimes(1);
  });

  it('sets user to null when api.me() resolves to null (not authenticated)', async () => {
    vi.spyOn(api, 'me').mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.user).toBeNull();
  });

  it('treats api.me() rejection as unauthenticated and still transitions to ready', async () => {
    vi.spyOn(api, 'me').mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth().login / logout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('login() calls api.login and sets user', async () => {
    vi.spyOn(api, 'me').mockResolvedValueOnce(null);
    const loginSpy = vi
      .spyOn(api, 'login')
      .mockResolvedValueOnce({
        user: { id: 'u1', email: 'in@example.com', createdAt: 'now' },
      });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.login({ email: 'in@example.com', password: 'password123' });
    });

    expect(loginSpy).toHaveBeenCalledWith({
      email: 'in@example.com',
      password: 'password123',
    });
    expect(result.current.user?.email).toBe('in@example.com');
  });

  it('logout() calls api.logout and clears user', async () => {
    vi.spyOn(api, 'me').mockResolvedValueOnce({
      user: { id: 'u1', email: 'me@example.com', createdAt: 'now' },
    });
    const logoutSpy = vi.spyOn(api, 'logout').mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.email).toBe('me@example.com'));

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});

describe('useAuth() outside <AuthProvider>', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error', () => {
    // suppress the React error logging so the failed render is quiet
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
