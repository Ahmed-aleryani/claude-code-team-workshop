import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '../../shared/schemas';
import { ApiClientError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ErrorBanner } from './error-banner';

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const emailErrorId = `${emailId}-error`;
  const passwordErrorId = `${passwordId}-error`;
  const confirmErrorId = `${confirmId}-error`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({ email, password });
    const next: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' && !next.email) next.email = issue.message;
        if (key === 'password' && !next.password) next.password = issue.message;
      }
    }
    if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    if (Object.keys(next).length > 0 || !parsed.success) {
      setFieldErrors(next);
      return;
    }

    setPending(true);
    try {
      await register(parsed.data);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.body.details) {
          const serverFields: FieldErrors = {};
          for (const [key, messages] of Object.entries(error.body.details)) {
            const message = messages[0];
            if (!message) continue;
            if (key === 'email') serverFields.email = message;
            if (key === 'password') serverFields.password = message;
          }
          setFieldErrors(serverFields);
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
    <section className="auth-card" aria-labelledby="register-title">
      <h2 id="register-title" className="auth-card__title">
        Create your account
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
            minLength={8}
            required
          />
          {fieldErrors.password ? (
            <span id={passwordErrorId} className="form-error">
              {fieldErrors.password}
            </span>
          ) : null}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={confirmId}>
            Confirm password
          </label>
          <input
            id={confirmId}
            className="form-input"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={fieldErrors.confirmPassword ? true : undefined}
            aria-describedby={fieldErrors.confirmPassword ? confirmErrorId : undefined}
            required
          />
          {fieldErrors.confirmPassword ? (
            <span id={confirmErrorId} className="form-error">
              {fieldErrors.confirmPassword}
            </span>
          ) : null}
        </div>
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-card__footer">
        Already have an account? <Link to="/login">Log in</Link>.
      </p>
    </section>
  );
}
