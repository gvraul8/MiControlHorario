import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
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
  const current = await getUserDocument(uid);
  if (!current) return;
  await saveUserDocument(uid, { ...current, jobs });
}

export async function updateEntries(
  uid: string,
  entries: Record<string, WorkEntry[]>,
): Promise<void> {
  const current = await getUserDocument(uid);
  if (!current) return;
  await saveUserDocument(uid, { ...current, entries });
}
