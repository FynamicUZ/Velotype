import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePlayerStore } from '@/store/usePlayerStore';
import { saveProfile } from '@/lib/firebase/firestore';

export function useCloudSync() {
  const { user, profileSynced } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Never write before the cloud profile has been read: on a network where
    // the read failed, the store still holds local-only state, and saving it
    // would overwrite the player's real profile with it.
    if (!user || !profileSynced) return;

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
  }, [user, profileSynced]);
}
