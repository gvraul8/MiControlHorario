import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserDocument, WorkEntry } from '../types';

async function getUserDocument(uid: string): Promise<UserDocument | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDocument;
}

export function subscribeUserDocument(
  uid: string,
  onData: (data: UserDocument | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserDocument) : null);
    },
    (error) => onError?.(error),
  );
}

export async function saveUserDocument(uid: string, data: UserDocument): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function updateProfile(uid: string, name: string, email: string): Promise<void> {
  const current = await getUserDocument(uid);
  if (!current) return;
  await saveUserDocument(uid, {
    ...current,
    profile: { name, email },
  });
}

export async function updateJobs(
  uid: string,
  jobs: UserDocument['jobs'],
): Promise<void> {
  // updateDoc sustituye el mapa entero. setDoc({ merge: true }) fusiona
  // y deja las claves borradas o renombradas, así que el trabajo se duplica.
  await updateDoc(doc(db, 'users', uid), { jobs });
}

export async function updateEntries(
  uid: string,
  entries: Record<string, WorkEntry[]>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { entries });
}

/** Sustituye trabajos y horas a la vez (borrar un trabajo y sus registros). */
export async function updateJobsAndEntries(
  uid: string,
  jobs: UserDocument['jobs'],
  entries: Record<string, WorkEntry[]>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { jobs, entries });
}
