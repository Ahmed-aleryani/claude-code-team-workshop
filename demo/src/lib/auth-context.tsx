import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest, RegisterRequest, User } from '../../shared/types';
import * as api from './api';

export type AuthStatus = 'loading' | 'ready';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginRequest) => Promise<User>;
  register: (input: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.me();
        if (cancelled) return;
        setUser(result?.user ?? null);
      } catch {
        if (cancelled) return;
        setUser(null);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginRequest): Promise<User> => {
    const { user: nextUser } = await api.login(input);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (input: RegisterRequest): Promise<User> => {
    const { user: nextUser } = await api.register(input);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setUser(null);
    await api.logout().catch(() => {
      // best-effort; cookie will expire server-side regardless
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
