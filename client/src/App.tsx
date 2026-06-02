import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play" element={<MultiplayerLobby />} />
      <Route path="/battle" element={<BattlePage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/sp" element={<WorldMapPage />} />
      <Route path="/sp/world/:worldId" element={<FightSelectPage />} />
      <Route path="/sp/survival" element={<SurvivalPage />} />
      <Route path="/sp/tournament/:worldId" element={<TournamentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
