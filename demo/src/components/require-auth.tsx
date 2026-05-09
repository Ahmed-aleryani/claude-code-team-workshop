import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
