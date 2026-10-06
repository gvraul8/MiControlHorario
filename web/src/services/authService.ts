import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { createEmptyUserDocument } from '../types';
import { normalizeEmail } from '../utils/validations';

const googleProvider = new GoogleAuthProvider();

let persistenceReady = false;

async function ensurePersistence() {
  if (!persistenceReady) {
    await setPersistence(auth, browserLocalPersistence);
    persistenceReady = true;
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

  const credential = await createUserWithEmailAndPassword(auth, normalized, password);
  return finalizeLogin(credential.user);
}

export async function loginWithGoogle(): Promise<User> {
  await ensurePersistence();
  const credential = await signInWithPopup(auth, googleProvider);
  return finalizeLogin(credential.user);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function validateExistingSession(user: User): Promise<User | null> {
  try {
    return await finalizeLogin(user);
  } catch {
    return null;
  }
}
