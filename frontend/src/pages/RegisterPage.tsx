import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle('Create your account');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError(new Error('Password must be at least 8 characters'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp(email, password, displayName.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={onSubmit}>
        <div className="brand brand-large">
          <span className="brand-mark" aria-hidden="true" />
          annotate
        </div>
        <h1>Create your account</h1>
        <label className="field">
          <span>Name (optional)</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <small className="muted">At least 8 characters.</small>
        </label>
        <ErrorMessage error={error} />
        <button type="submit" className="button primary block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted small">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
