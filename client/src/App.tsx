import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useCloudSync } from '@/hooks/useCloudSync';
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
