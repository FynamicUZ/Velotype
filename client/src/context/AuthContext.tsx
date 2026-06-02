import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, signOut } from '@/lib/firebase/auth';
import { fetchProfile, saveProfile } from '@/lib/firebase/firestore';
import { usePlayerStore, defaultProfile } from '@/store/usePlayerStore';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, setProfile, reset } = usePlayerStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const cloudProfile = await fetchProfile(firebaseUser.uid);
        if (cloudProfile) {
          // Load existing cloud profile
          setProfile({ ...cloudProfile, uid: firebaseUser.uid, displayName: firebaseUser.displayName ?? cloudProfile.displayName, photoURL: firebaseUser.photoURL });
        } else {
          // First sign-in: create a fresh profile (no inherited guest coins)
          const freshProfile = {
            ...defaultProfile,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? defaultProfile.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: Date.now(),
          };
          setProfile(freshProfile);
          await saveProfile(firebaseUser.uid, freshProfile);
        }
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  async function login() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut();
    reset();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
