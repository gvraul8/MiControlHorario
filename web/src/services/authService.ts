import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthCredential,
  type AuthError,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { createEmptyUserDocument } from '../types';
import { isIos, isStandalonePwa } from '../utils/platform';
import { normalizeEmail } from '../utils/validations';

const googleProvider = new GoogleAuthProvider();

let pendingGoogleCredential: AuthCredential | null = null;
let pendingGoogleEmail: string | null = null;

export class PendingGoogleLinkError extends Error {
  readonly email: string;

  constructor(email: string) {
    super('Este email ya tiene contraseña. Introdúcela para entrar con Google.');
    this.name = 'PendingGoogleLinkError';
    this.email = email;
  }
}

function getAuthErrorCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as AuthError).code) : '';
}

function stashPendingGoogleLink(err: unknown): boolean {
  const code = getAuthErrorCode(err);
  if (code !== 'auth/account-exists-with-different-credential') {
    return false;
  }
  const authError = err as AuthError;
  const pending = GoogleAuthProvider.credentialFromError(authError);
  const email = authError.customData?.email;
  if (!pending || !email) {
    return false;
  }
  pendingGoogleCredential = pending;
  pendingGoogleEmail = normalizeEmail(email);
  return true;
}

export function getPendingGoogleLinkRequest(): { email: string } | null {
  if (pendingGoogleEmail && pendingGoogleCredential) {
    return { email: pendingGoogleEmail };
  }
  return null;
}

export function clearPendingGoogleLink(): void {
  pendingGoogleCredential = null;
  pendingGoogleEmail = null;
}

let persistenceReady = false;
let persistenceInit: Promise<void> | null = null;

/** Llamar al arrancar la app para no retrasar popups de Google en el clic (Safari/iOS). */
export function initAuthPersistence(): Promise<void> {
  if (persistenceReady) {
    return Promise.resolve();
  }
  if (!persistenceInit) {
    persistenceInit = setPersistence(auth, browserLocalPersistence).then(() => {
      persistenceReady = true;
    });
  }
  return persistenceInit;
}

async function ensurePersistence() {
  await initAuthPersistence();
}

/**
 * Safari en pestaña: redirect. Acceso directo (PWA): popup — el redirect en iOS standalone
 * suele perder la sesión al volver y deja el botón en "Procesando".
 */
export function preferGoogleRedirect(): boolean {
  if (isStandalonePwa()) return false;
  return isIos();
}

export async function completeGoogleRedirectIfNeeded(): Promise<void> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await finalizeLogin(result.user);
    }
  } catch (err) {
    if (stashPendingGoogleLink(err)) {
      return;
    }
    throw err;
  }
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const snap = await getDoc(doc(db, 'allowedEmails', normalized));
  return snap.exists();
}

export async function markInviteActive(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const ref = doc(db, 'allowedEmails', normalized);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data()?.status === 'pending') {
    await updateDoc(ref, { status: 'active' });
  }
}

export async function ensureUserDocument(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const email = user.email ?? '';

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...createEmptyUserDocument(email, user.displayName ?? ''),
      createdAt: serverTimestamp(),
    });
  }

  await markInviteActive(email);
}

async function finalizeLogin(user: User): Promise<User> {
  const email = user.email;
  if (!email) {
    await signOut(auth);
    throw new Error('Tu cuenta no tiene email asociado.');
  }

  const allowed = await isEmailAllowed(email);
  if (!allowed) {
    await signOut(auth);
    throw new Error('Acceso no autorizado. Contacta con tu administrador para recibir una invitación.');
  }

  await ensureUserDocument(user);
  return user;
}

export async function checkEmailRegistration(email: string): Promise<'login' | 'register'> {
  const normalized = normalizeEmail(email);
  const allowed = await isEmailAllowed(normalized);
  if (!allowed) {
    throw new Error('Este email no está invitado. Contacta con tu administrador.');
  }

  const methods = await fetchSignInMethodsForEmail(auth, normalized);
  return methods.length > 0 ? 'login' : 'register';
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  await ensurePersistence();
  const normalized = normalizeEmail(email);
  const credential = await signInWithEmailAndPassword(auth, normalized, password);
  return finalizeLogin(credential.user);
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  await ensurePersistence();
  const normalized = normalizeEmail(email);
  const allowed = await isEmailAllowed(normalized);
  if (!allowed) {
    throw new Error('Este email no está invitado. Contacta con tu administrador.');
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, normalized, password);
    return finalizeLogin(credential.user);
  } catch (err) {
    if (getAuthErrorCode(err) === 'auth/email-already-in-use') {
      throw new Error(
        'Ya hay una cuenta con este email (por ejemplo con Google). Entra con ese método o vincula contraseña en Cuenta.',
      );
    }
    throw err;
  }
}

/** En iOS usa redirect (navega a Google y vuelve). En desktop, popup. Redirect devuelve null. */
export async function loginWithGoogle(): Promise<User | null> {
  if (preferGoogleRedirect()) {
    await ensurePersistence();
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
  await ensurePersistence();
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    clearPendingGoogleLink();
    return finalizeLogin(credential.user);
  } catch (err) {
    if (stashPendingGoogleLink(err)) {
      throw new PendingGoogleLinkError(pendingGoogleEmail!);
    }
    throw err;
  }
}

/** Tras Google bloqueado por cuenta existente con contraseña: entra y vincula Google. */
export async function completeGoogleLinkWithPassword(password: string): Promise<User> {
  if (!pendingGoogleCredential || !pendingGoogleEmail) {
    throw new Error('No hay un inicio con Google pendiente. Vuelve a pulsar Continuar con Google.');
  }
  await ensurePersistence();
  const normalized = pendingGoogleEmail;
  const userCredential = await signInWithEmailAndPassword(auth, normalized, password);
  const linked = await linkWithCredential(userCredential.user, pendingGoogleCredential);
  clearPendingGoogleLink();
  await linked.user.reload();
  return finalizeLogin(linked.user);
}

export type LinkedAuthMethod = 'google' | 'password';

export function getLinkedMethodsFromUser(user: User): LinkedAuthMethod[] {
  const methods = new Set<LinkedAuthMethod>();
  for (const provider of user.providerData) {
    if (provider.providerId === 'google.com') methods.add('google');
    if (provider.providerId === 'password') methods.add('password');
  }
  return [...methods];
}

export async function fetchLinkedSignInMethods(email: string): Promise<string[]> {
  return fetchSignInMethodsForEmail(auth, normalizeEmail(email));
}

export async function linkPasswordToAccount(user: User, password: string): Promise<User> {
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  const email = user.email;
  if (!email) {
    throw new Error('Tu cuenta no tiene email.');
  }
  await ensurePersistence();
  const credential = EmailAuthProvider.credential(normalizeEmail(email), password);
  try {
    const result = await linkWithCredential(user, credential);
    await result.user.reload();
    return result.user;
  } catch (err) {
    if (getAuthErrorCode(err) === 'auth/provider-already-linked') {
      throw new Error('Este email ya tiene contraseña. Usa entrar con email y contraseña.');
    }
    if (getAuthErrorCode(err) === 'auth/email-already-in-use') {
      throw new Error('Este email ya está en otra cuenta. Contacta con el administrador.');
    }
    throw err;
  }
}

/** Vincula Google a la sesión actual. Redirect devuelve null (la página se recarga). */
export async function linkGoogleToAccount(user: User): Promise<User | null> {
  await ensurePersistence();
  if (preferGoogleRedirect()) {
    await linkWithRedirect(user, googleProvider);
    return null;
  }
  try {
    const result = await linkWithPopup(user, googleProvider);
    await result.user.reload();
    return result.user;
  } catch (err) {
    if (getAuthErrorCode(err) === 'auth/provider-already-linked') {
      throw new Error('Google ya está vinculado a esta cuenta.');
    }
    if (getAuthErrorCode(err) === 'auth/credential-already-in-use') {
      throw new Error('Esa cuenta de Google ya está vinculada a otro usuario.');
    }
    throw err;
  }
}

export function formatAuthError(err: unknown): string {
  if (err instanceof PendingGoogleLinkError) {
    return err.message;
  }
  const code = getAuthErrorCode(err);
  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana de Google. Vuelve a pulsar el botón o prueba con email y contraseña.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Has cerrado el inicio de sesión con Google.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Contraseña incorrecta.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Este email ya tiene cuenta. Entra con Google o con tu contraseña.';
  }
  return err instanceof Error ? err.message : 'Error al iniciar sesión';
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

function isTransientValidationError(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'failed-precondition' ||
    code === 'auth/network-request-failed'
  );
}

/** Restaura sesión guardada (persistencia local) sin pedir login en cada apertura. */
export async function validateExistingSession(user: User): Promise<User | null> {
  try {
    return await finalizeLogin(user);
  } catch (err) {
    if (isTransientValidationError(err)) {
      return user;
    }
    return null;
  }
}
