import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeUserDocument } from '../services/userDataService';
import { createEmptyUserDocument, type UserDocument } from '../types';

export function useUserData() {
  const { user } = useAuth();
  const [data, setData] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeUserDocument(
      user.uid,
      (docData) => {
        setData(
          docData ??
            createEmptyUserDocument(user.email ?? '', user.displayName ?? ''),
        );
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  return { data, loading, error, uid: user?.uid ?? null };
}
