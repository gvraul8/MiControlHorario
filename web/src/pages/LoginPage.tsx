import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  checkEmailRegistration,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from '../services/authService';
import { isFirebaseConfigured } from '../lib/firebase';
import BrandMark from '../components/BrandMark';
import GoogleIcon from '../components/GoogleIcon';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const nextMode = await checkEmailRegistration(email);
      setMode(nextMode);

      if (nextMode === 'register') {
        if (!password) {
          return;
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        await registerWithEmail(email, password);
        return;
      }

      if (!password) {
        throw new Error('Introduce tu contraseña.');
      }
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error con Google');
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
            onChange={(e) => {
              setEmail(e.target.value);
              setMode('login');
            }}
            placeholder="tu@empresa.com"
            required
            autoComplete="email"
          />

          {mode === 'register' && (
            <p className="info-text">Primera vez: crea tu contraseña para este email invitado.</p>
          )}

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
            required={mode === 'register'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          {mode === 'register' && (
            <>
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
                autoComplete="new-password"
              />
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? 'Procesando...'
              : mode === 'register'
                ? 'Crear cuenta'
                : 'Continuar con email'}
          </button>
        </form>

        <div className="divider">o</div>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogleLogin}
          disabled={submitting}
        >
          <GoogleIcon />
          <span>Continuar con Google</span>
        </button>

        <p className="login-hint">
          Solo puedes entrar si tu administrador ha autorizado tu email. Con Google debes usar el
          mismo correo invitado.
        </p>
      </div>
    </div>
  );
}
