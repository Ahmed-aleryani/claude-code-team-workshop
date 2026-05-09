import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function Header() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="app-header">
      <h1 className="app-header__title">Todos</h1>
      {status === 'ready' && user ? (
        <div className="app-header__user">
          <span className="app-header__email" aria-label="Signed in as">
            {user.email}
          </span>
          <button
            type="button"
            className="button button--secondary"
            onClick={handleLogout}
            disabled={pending}
          >
            {pending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      ) : null}
    </header>
  );
}
