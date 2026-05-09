import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { User } from '../../shared/types';
import type { AuthContextValue, AuthStatus } from '../lib/auth-context';

export interface AuthStub {
  user?: User | null;
  status?: AuthStatus;
  login?: AuthContextValue['login'];
  register?: AuthContextValue['register'];
  logout?: AuthContextValue['logout'];
}

export function buildAuthValue(stub: AuthStub | undefined): AuthContextValue {
  return {
    user: stub?.user ?? null,
    status: stub?.status ?? 'ready',
    login: stub?.login ?? (() => Promise.reject(new Error('login stub not provided'))),
    register:
      stub?.register ?? (() => Promise.reject(new Error('register stub not provided'))),
    logout: stub?.logout ?? (() => Promise.resolve()),
  };
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routes?: Array<{ path: string; element: ReactNode }>;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', routes, ...rest }: RenderWithProvidersOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    const content = routes ? (
      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    ) : (
      children
    );
    return <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
