import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customAlphabet } from 'nanoid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { usePlayerStore } from '@/store/usePlayerStore';
import {
  searchUsersByUsername,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
  subscribeFriendRequests,
  sendGameInvite,
  type PublicUser,
  type FriendRequest,
} from '@/lib/firebase/firestore';

const makeRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = usePlayerStore((s) => s.profile);

  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [sentUids, setSentUids] = useState<Set<string>>(new Set());
  const [challenging, setChallenging] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeFriendRequests(user.uid, (incoming, accepted) => {
      setPendingRequests(incoming);
      setFriends(accepted);
    });
    return unsub;
  }, [user]);

  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchUsersByUsername(term);
    setSearchResults(results.filter((u) => u.uid !== user?.uid));
    setSearching(false);
  }, [user]);

  async function handleSendRequest(target: PublicUser) {
    if (!user || !profile.username) return;
    const me: PublicUser = {
      uid: user.uid,
      username: profile.username,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      elo: profile.elo,
      level: profile.level,
    };
    await sendFriendRequest(me, target);
    setSentUids((s) => new Set(s).add(target.uid));
  }

  async function handleChallenge(targetUid: string, targetUsername: string) {
    if (!user || !profile.username || challenging) return;
    setChallenging(targetUid);
    try {
      const code = makeRoomCode();
      await sendGameInvite(
        { uid: user.uid, username: profile.username, photoURL: profile.photoURL },
        { uid: targetUid, username: targetUsername },
        code,
      );
      navigate('/play', {
        state: { autoCreate: true, roomCode: code, challengedFriend: targetUsername },
      });
    } finally {
      setChallenging(null);
    }
  }

  const friendUids = new Set(friends.map((f) => f.fromUid === user?.uid ? f.toUid : f.fromUid));

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Home</Button>
        <h1 className="font-display text-2xl">Friends</h1>
        <div />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['friends', 'requests', 'search'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-arcane-violet/30 text-white border border-arcane-violet/50'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t === 'requests' && pendingRequests.length > 0
              ? `Requests (${pendingRequests.length})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-3">
          {friends.length === 0 ? (
            <Card className="p-8 text-center text-white/40">
              <div className="text-4xl mb-2">🧙</div>
              <p>No friends yet. Search for players to add!</p>
              <Button size="sm" className="mt-4" onClick={() => setTab('search')}>Find Players</Button>
            </Card>
          ) : (
            friends.map((f) => {
              const friendUid = f.fromUid === user?.uid ? f.toUid : f.fromUid;
              const friendName = f.fromUid === user?.uid ? f.toUsername : f.fromUsername;
              const friendPhoto = f.fromUid === user?.uid ? null : f.fromPhotoURL;
              return (
                <FriendCard
                  key={f.id}
                  uid={friendUid}
                  username={friendName}
                  photoURL={friendPhoto}
                  isChallenging={challenging === friendUid}
                  onRemove={() => user && removeFriend(user.uid, friendUid)}
                  onChallenge={() => handleChallenge(friendUid, friendName)}
                />
              );
            })
          )}
        </div>
      )}

      {/* Pending requests */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-3">
          {pendingRequests.length === 0 ? (
            <Card className="p-8 text-center text-white/40">No pending requests</Card>
          ) : (
            pendingRequests.map((req) => (
              <Card key={req.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar photoURL={req.fromPhotoURL} username={req.fromUsername} />
                  <div>
                    <p className="font-medium">{req.fromUsername}</p>
                    <p className="text-xs text-white/40">wants to be friends</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respondToRequest(req.id, 'accepted')}>Accept</Button>
                  <Button size="sm" variant="ghost" onClick={() => respondToRequest(req.id, 'rejected')}>Decline</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-arcane-violet/60 transition-colors"
          />
          {searching && <p className="text-white/40 text-sm text-center">Searching...</p>}
          {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
            <p className="text-white/40 text-sm text-center">No players found</p>
          )}
          {searchResults.map((u) => {
            const isFriend = friendUids.has(u.uid);
            const isSent = sentUids.has(u.uid);
            return (
              <Card key={u.uid} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar photoURL={u.photoURL} username={u.username} />
                  <div>
                    <p className="font-medium">{u.username}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge color="violet">ELO {u.elo}</Badge>
                      <Badge color="cyan">Lvl {u.level}</Badge>
                    </div>
                  </div>
                </div>
                {isFriend ? (
                  <span className="text-arcane-lime text-sm">Friends ✓</span>
                ) : isSent ? (
                  <span className="text-white/40 text-sm">Sent</span>
                ) : (
                  <Button size="sm" onClick={() => handleSendRequest(u)}>Add</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Avatar({ photoURL, username }: { photoURL: string | null; username: string }) {
  return photoURL ? (
    <img src={photoURL} alt={username} className="w-10 h-10 rounded-full object-cover" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-arcane-violet/30 flex items-center justify-center text-lg">
      🧙
    </div>
  );
}

function FriendCard({
  username,
  photoURL,
  uid,
  isChallenging,
  onRemove,
  onChallenge,
}: {
  uid: string;
  username: string;
  photoURL: string | null;
  isChallenging: boolean;
  onRemove: () => void;
  onChallenge: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar photoURL={photoURL} username={username} />
        <p className="font-medium">{username}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onChallenge}
          disabled={isChallenging}
          title="Challenge to duel"
          className="text-arcane-violet hover:text-arcane-cyan text-base transition-colors disabled:opacity-40"
        >
          {isChallenging ? '…' : '⚔️'}
        </button>
        {confirmRemove ? (
          <div className="flex gap-1 items-center">
            <span className="text-xs text-white/50">Remove?</span>
            <Button size="sm" variant="ghost" onClick={() => { onRemove(); setConfirmRemove(false); }}>Yes</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>No</Button>
          </div>
        ) : (
          <button onClick={() => setConfirmRemove(true)} className="text-white/30 hover:text-arcane-rose text-xs transition-colors">
            Remove
          </button>
        )}
      </div>
    </Card>
  );
}
