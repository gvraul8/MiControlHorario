import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '../lib/firebase';
import {
  completeGoogleRedirectIfNeeded,
  initAuthPersistence,
  logout,
  validateExistingSession,
} from '../services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      await initAuthPersistence();
      if (cancelled) return;

      try {
        await completeGoogleRedirectIfNeeded();
      } catch {
        // finalizeLogin ya hace signOut si no está invitado
      }
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const validated = await validateExistingSession(firebaseUser);
        setUser(validated);
        setLoading(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setUser(null);
      return;
    }
    await firebaseUser.reload();
    const validated = await validateExistingSession(firebaseUser);
    setUser(validated);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signOut: logout,
      refreshProfile,
    }),
    [user, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
