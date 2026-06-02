import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firebaseApp } from './config';
import type { PlayerProfile } from '@/store/usePlayerStore';

export const db = getFirestore(firebaseApp);

// ─── Private profiles ────────────────────────────────────────────────────────

export async function fetchProfile(uid: string): Promise<PlayerProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? (snap.data() as PlayerProfile) : null;
}

export async function saveProfile(uid: string, profile: PlayerProfile): Promise<void> {
  await setDoc(doc(db, 'profiles', uid), profile, { merge: true });
  await syncPublicUser(uid, profile);
}

export async function patchProfile(uid: string, partial: Partial<PlayerProfile>): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), partial as Record<string, unknown>);
}

// ─── Public user index (searchable) ──────────────────────────────────────────

export interface PublicUser {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  elo: number;
  level: number;
}

export async function syncPublicUser(uid: string, profile: PlayerProfile): Promise<void> {
  if (!profile.username) return;
  const pub: PublicUser = {
    uid,
    username: profile.username,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    elo: profile.elo,
    level: profile.level,
  };
  await setDoc(doc(db, 'users', uid), pub, { merge: true });
}

export async function searchUsersByUsername(term: string): Promise<PublicUser[]> {
  if (term.length < 2) return [];
  const q = query(
    collection(db, 'users'),
    where('username', '>=', term),
    where('username', '<=', term + ''),
    orderBy('username'),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as PublicUser);
}

// ─── Friend requests ──────────────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromUsername: string;
  fromPhotoURL: string | null;
  toUid: string;
  toUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}

function requestId(a: string, b: string) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export async function sendFriendRequest(
  from: PublicUser,
  to: PublicUser,
): Promise<void> {
  const id = requestId(from.uid, to.uid);
  const existing = await getDoc(doc(db, 'friendRequests', id));
  if (existing.exists()) return; // already sent
  const req: FriendRequest = {
    id,
    fromUid: from.uid,
    fromUsername: from.username,
    fromPhotoURL: from.photoURL,
    toUid: to.uid,
    toUsername: to.username,
    status: 'pending',
    createdAt: Date.now(),
  };
  await setDoc(doc(db, 'friendRequests', id), req);
}

export async function respondToRequest(
  id: string,
  status: 'accepted' | 'rejected',
): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', id), { status });
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const id = requestId(myUid, friendUid);
  await updateDoc(doc(db, 'friendRequests', id), { status: 'rejected' });
}

// ─── Game invites ─────────────────────────────────────────────────────────────

export interface GameInvite {
  id: string;
  fromUid: string;
  fromUsername: string;
  fromPhotoURL: string | null;
  toUid: string;
  toUsername: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

function gameInviteId(a: string, b: string) {
  return a < b ? `gi_${a}_${b}` : `gi_${b}_${a}`;
}

export async function sendGameInvite(
  from: { uid: string; username: string; photoURL: string | null },
  to: { uid: string; username: string },
  roomCode: string,
): Promise<void> {
  const id = gameInviteId(from.uid, to.uid);
  const invite: GameInvite = {
    id,
    fromUid: from.uid,
    fromUsername: from.username,
    fromPhotoURL: from.photoURL,
    toUid: to.uid,
    toUsername: to.username,
    roomCode,
    status: 'pending',
    createdAt: Date.now(),
  };
  await setDoc(doc(db, 'gameInvites', id), invite);
}

export async function respondToGameInvite(
  id: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  await updateDoc(doc(db, 'gameInvites', id), { status });
}

export function subscribeIncomingInvites(
  myUid: string,
  onInvites: (invites: GameInvite[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'gameInvites'),
    where('toUid', '==', myUid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, (snap) => {
    onInvites(snap.docs.map((d) => d.data() as GameInvite));
  });
}

// ─── Friend requests ──────────────────────────────────────────────────────────

export function subscribeFriendRequests(
  myUid: string,
  onChange: (incoming: FriendRequest[], friends: FriendRequest[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('toUid', '==', myUid),
  );
  const q2 = query(
    collection(db, 'friendRequests'),
    where('fromUid', '==', myUid),
    where('status', '==', 'accepted'),
  );

  let incoming: FriendRequest[] = [];
  let sentAccepted: FriendRequest[] = [];

  const unsub1 = onSnapshot(q, (snap) => {
    incoming = snap.docs.map((d) => d.data() as FriendRequest);
    onChange(incoming.filter((r) => r.status === 'pending'), [
      ...incoming.filter((r) => r.status === 'accepted'),
      ...sentAccepted,
    ]);
  });

  const unsub2 = onSnapshot(q2, (snap) => {
    sentAccepted = snap.docs.map((d) => d.data() as FriendRequest);
    onChange(incoming.filter((r) => r.status === 'pending'), [
      ...incoming.filter((r) => r.status === 'accepted'),
      ...sentAccepted,
    ]);
  });

  return () => { unsub1(); unsub2(); };
}
