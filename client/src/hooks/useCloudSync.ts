import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePlayerStore } from '@/store/usePlayerStore';
import { saveProfile } from '@/lib/firebase/firestore';

export function useCloudSync() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsub = usePlayerStore.subscribe((state) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveProfile(user.uid, state.profile).catch(console.error);
      }, 2000);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);
}
