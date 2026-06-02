import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firebaseApp } from './config';
import type { PlayerProfile } from '@/store/usePlayerStore';

export const db = getFirestore(firebaseApp);

export async function fetchProfile(uid: string): Promise<PlayerProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? (snap.data() as PlayerProfile) : null;
}

export async function saveProfile(uid: string, profile: PlayerProfile): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), profile, { merge: true });
}

export async function patchProfile(uid: string, partial: Partial<PlayerProfile>): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), partial as Record<string, unknown>);
}
