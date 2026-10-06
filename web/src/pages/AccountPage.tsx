import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchLinkedSignInMethods,
  getLinkedMethodsFromUser,
  linkGoogleToAccount,
  linkPasswordToAccount,
  changeAccountPassword,
  type LinkedAuthMethod,
} from '../services/authService';
import GoogleIcon from '../components/GoogleIcon';

export default function AccountPage() {
  const { user, refreshProfile } = useAuth();
  const [methods, setMethods] = useState<LinkedAuthMethod[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleLinkBusy, setGoogleLinkBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const fromUser = getLinkedMethodsFromUser(user);
      if (user.email) {
        const remote = await fetchLinkedSignInMethods(user.email);
        const merged = new Set<LinkedAuthMethod>(fromUser);
        if (remote.includes('google.com')) merged.add('google');
        if (remote.includes('password')) merged.add('password');
        setMethods([...merged]);
      } else {
        setMethods(fromUser);
      }
    })();
  }, [user]);

  if (!user) {
    return null;
  }

  const currentUser = user;

  const hasGoogle = methods.includes('google');
  const hasPassword = methods.includes('password');

  async function handleLinkPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await linkPasswordToAccount(currentUser, password);
      await refreshProfile();
      setPassword('');
      setConfirmPassword('');
      setInfo('Contraseña vinculada. Ya puedes entrar con email y contraseña.');
      setMethods((prev) => (prev.includes('password') ? prev : [...prev, 'password']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await changeAccountPassword(currentUser, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setInfo('Contraseña actualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkGoogle() {
    setError(null);
    setInfo(null);
    setGoogleLinkBusy(true);
    let awaitingRedirect = false;
    try {
      const updated = await linkGoogleToAccount(currentUser);
      if (updated === null) {
        awaitingRedirect = true;
        return;
      }
      await refreshProfile();
      setInfo('Google vinculado. Ya puedes entrar con Google.');
      setMethods((prev) => (prev.includes('google') ? prev : [...prev, 'google']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vincular Google.');
    } finally {
      if (!awaitingRedirect) {
        setGoogleLinkBusy(false);
      }
    }
  }

  return (
    <div className="page-stack">
      <h1 className="page-title">Cuenta</h1>
      <p className="page-lead">{user.email}</p>

      {error && <p className="error-text">{error}</p>}
      {info && <p className="info-text">{info}</p>}

      <section className="card-panel">
        <h2 className="section-title">Formas de entrar</h2>
        <ul className="account-methods">
          <li className={hasPassword ? 'account-method on' : 'account-method'}>
            Email y contraseña {hasPassword ? '✓' : '—'}
          </li>
          <li className={hasGoogle ? 'account-method on' : 'account-method'}>
            Google {hasGoogle ? '✓' : '—'}
          </li>
        </ul>
        <p className="login-hint">
          Puedes usar cualquiera de los métodos marcados con ✓ para la misma cuenta y los mismos
          datos.
        </p>
      </section>

      {!hasPassword && (
        <section className="card-panel">
          <h2 className="section-title">Crear contraseña</h2>
          <p className="login-hint">
            La contraseña se crea aquí. Después podrás entrar con email y contraseña.
          </p>
          <form className="login-form" onSubmit={handleLinkPassword}>
            <label htmlFor="link-password">Nueva contraseña</label>
            <input
              id="link-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <label htmlFor="link-password-confirm">Confirmar</label>
            <input
              id="link-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </section>
      )}

      {hasPassword && (
        <section className="card-panel">
          <h2 className="section-title">Cambiar contraseña</h2>
          <form className="login-form" onSubmit={handleChangePassword}>
            <label htmlFor="current-password">Contraseña actual</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <label htmlFor="new-password">Nueva contraseña</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <label htmlFor="confirm-new-password">Confirmar nueva contraseña</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </form>
        </section>
      )}

      {!hasGoogle && (
        <section className="card-panel">
          <h2 className="section-title">Añadir Google</h2>
          <button
            type="button"
            className="btn btn-google"
            onClick={handleLinkGoogle}
            disabled={googleLinkBusy}
          >
            <GoogleIcon />
            <span>{googleLinkBusy ? 'Abriendo Google…' : 'Vincular Google'}</span>
          </button>
        </section>
      )}
    </div>
  );
}
