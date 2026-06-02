import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useCloudSync } from '@/hooks/useCloudSync';
import {
  subscribeIncomingInvites,
  respondToGameInvite,
  type GameInvite,
} from '@/lib/firebase/firestore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import WelcomePage from '@/pages/WelcomePage';
import NicknameSetupPage from '@/pages/NicknameSetupPage';
import FriendsPage from '@/pages/FriendsPage';
import HomePage from '@/pages/HomePage';
import MultiplayerLobby from '@/pages/MultiplayerLobby';
import BattlePage from '@/pages/BattlePage';
import ResultsPage from '@/pages/ResultsPage';
import ShopPage from '@/pages/ShopPage';
import ProfilePage from '@/pages/ProfilePage';
import WorldMapPage from '@/pages/singleplayer/WorldMapPage';
import FightSelectPage from '@/pages/singleplayer/FightSelectPage';
import SurvivalPage from '@/pages/singleplayer/SurvivalPage';
import TournamentPage from '@/pages/singleplayer/TournamentPage';

function GameInviteOverlay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    return subscribeIncomingInvites(user.uid, setInvites);
  }, [user]);

  const visible = invites.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const invite = visible[0]!;

  const dismiss = (id: string) => setDismissed((s) => new Set(s).add(id));

  const handleAccept = async () => {
    await respondToGameInvite(invite.id, 'accepted');
    dismiss(invite.id);
    navigate('/play', {
      state: {
        autoJoin: true,
        roomCode: invite.roomCode,
        hostUsername: invite.fromUsername,
      },
    });
  };

  const handleDecline = async () => {
    await respondToGameInvite(invite.id, 'declined');
    dismiss(invite.id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-cast">
      <Card className="p-4 border-arcane-violet/70 max-w-xs shadow-xl">
        <p className="font-display text-xs text-arcane-violet mb-1">⚔️ Duel Challenge!</p>
        <p className="text-sm text-white/80 mb-3">
          <span className="font-semibold">{invite.fromUsername}</span> wants to battle you
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAccept}>Accept</Button>
          <Button size="sm" variant="ghost" onClick={handleDecline}>Decline</Button>
        </div>
      </Card>
    </div>
  );
}

function AppRoutes() {
  useCloudSync();
  const { user, loading } = useAuth();
  const username = usePlayerStore((s) => s.profile.username);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-arcane-violet animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return <WelcomePage />;
  if (!username) return <NicknameSetupPage />;

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<MultiplayerLobby />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/sp" element={<WorldMapPage />} />
        <Route path="/sp/world/:worldId" element={<FightSelectPage />} />
        <Route path="/sp/survival" element={<SurvivalPage />} />
        <Route path="/sp/tournament/:worldId" element={<TournamentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GameInviteOverlay />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
