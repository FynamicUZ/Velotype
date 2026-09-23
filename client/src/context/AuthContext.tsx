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

// Firestore calls can hang indefinitely when its transport is blocked rather
// than failing fast, so every startup call is bounded.
// Long polling makes the first profile read slower than a streaming one, and a
// network that forced the fallback is usually the slow kind, so this is
// generous — it exists to stop the app hanging, not to police latency.
const PROFILE_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timed out')), PROFILE_TIMEOUT_MS),
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setProfile, reset } = usePlayerStore();

  useEffect(() => {
    // If Firebase Auth itself cannot reach the network, onAuthStateChanged may
    // never fire at all. Release the splash screen regardless so the app is
    // usable rather than stuck behind "Loading…".
    const splashGuard = setTimeout(() => setLoading(false), PROFILE_TIMEOUT_MS + 4000);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(splashGuard);
      setUser(firebaseUser);

      try {
        if (firebaseUser) {
          const cloudProfile = await withTimeout(fetchProfile(firebaseUser.uid));
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
            await withTimeout(saveProfile(firebaseUser.uid, freshProfile));
          }
        }
      } catch (err) {
        // Firestore can be unreachable even when the user is online — its
        // streaming transport is blocked by some networks, which surfaces as
        // "client is offline". That must not strand the app on "Loading…":
        // matches run over WebRTC and the signaling Worker, neither of which
        // needs Firestore. Fall back to a local profile and carry on.
        console.warn('[velotype] profile sync unavailable, continuing without it', err);
        if (firebaseUser) {
          setProfile({
            ...defaultProfile,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? defaultProfile.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: Date.now(),
          });
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(splashGuard);
      unsub();
    };
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
