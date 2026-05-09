import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '../../shared/schemas';
import { ApiClientError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ErrorBanner } from './error-banner';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = `${emailId}-error`;
  const passwordErrorId = `${passwordId}-error`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' && !next.email) next.email = issue.message;
        if (key === 'password' && !next.password) next.password = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setPending(true);
    try {
      await login(parsed.data);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.body.details) {
          const next: FieldErrors = {};
          for (const [key, messages] of Object.entries(error.body.details)) {
            const message = messages[0];
            if (!message) continue;
            if (key === 'email') next.email = message;
            if (key === 'password') next.password = message;
          }
          setFieldErrors(next);
        }
        setFormError(error.body.error);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <h2 id="login-title" className="auth-card__title">
        Log in
      </h2>
      <ErrorBanner error={formError} />
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label className="form-label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            className="form-input"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            required
          />
          {fieldErrors.email ? (
            <span id={emailErrorId} className="form-error">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={passwordId}>
            Password
          </label>
          <input
            id={passwordId}
            className="form-input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
            required
          />
          {fieldErrors.password ? (
            <span id={passwordErrorId} className="form-error">
              {fieldErrors.password}
            </span>
          ) : null}
        </div>
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="auth-card__footer">
        New here? <Link to="/register">Create an account</Link>.
      </p>
    </section>
  );
}
