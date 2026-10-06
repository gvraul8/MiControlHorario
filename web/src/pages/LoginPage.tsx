import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  loginWithEmail,
  completeGoogleLinkWithPassword,
  formatAuthError,
  getPendingGoogleLinkRequest,
  loginWithGoogle,
  PendingGoogleLinkError,
} from '../services/authService';
import { isFirebaseConfigured } from '../lib/firebase';
import BrandMark from '../components/BrandMark';
import GoogleIcon from '../components/GoogleIcon';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleLinkEmail, setGoogleLinkEmail] = useState<string | null>(null);
  const [linkPassword, setLinkPassword] = useState('');

  useEffect(() => {
    const pending = getPendingGoogleLinkRequest();
    if (pending) {
      setGoogleLinkEmail(pending.email);
      setEmail(pending.email);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!password) {
        throw new Error('Introduce tu contraseña.');
      }
      await loginWithEmail(email, password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err instanceof PendingGoogleLinkError) {
        setGoogleLinkEmail(err.email);
        setEmail(err.email);
        setError(null);
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleGoogleLinkPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await completeGoogleLinkWithPassword(linkPassword);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className="login-page">
        <div className="login-card">
          <BrandMark variant="hero" />
          <p className="error-text">
            Firebase no está configurado. Copia <code>.env.example</code> a <code>.env</code> y
            añade tus credenciales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <BrandMark variant="hero" />
        <p className="login-subtitle">Acceso solo por invitación</p>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleEmailContinue} className="login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            required
            autoComplete="email"
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {googleLinkEmail && (
          <form className="login-form google-link-box" onSubmit={handleGoogleLinkPassword}>
            <p className="info-text">
              El email <strong>{googleLinkEmail}</strong> ya tiene contraseña. Introdúcela una vez
              para vincular Google a la misma cuenta.
            </p>
            <label htmlFor="googleLinkPassword">Contraseña de la app</label>
            <input
              id="googleLinkPassword"
              type="password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Vinculando…' : 'Entrar y vincular Google'}
            </button>
          </form>
        )}

        <div className="divider">o</div>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogleLogin}
          disabled={submitting || googleBusy}
        >
          <GoogleIcon />
          <span>
            {googleBusy ? 'Abriendo Google…' : 'Continuar con Google'}
          </span>
        </button>

        <p className="login-hint">
          Solo puedes entrar si tu email está invitado. Si aún no tienes contraseña, entra con
          Google y créala en Cuenta.
        </p>
      </div>
    </div>
  );
}
