import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePlayerStore, xpForNextLevel } from '@/store/usePlayerStore';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const nextXp = xpForNextLevel(profile.level);
  const { user, login } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 gap-10">
      <header className="w-full max-w-5xl flex items-center justify-between">
        <h1
          className="font-display text-4xl tracking-wider"
          style={{ textShadow: '0 0 24px rgba(168,85,247,0.6)' }}
        >
          <span className="text-arcane-violet">VELO</span>
          <span className="text-arcane-cyan">TYPE</span>
        </h1>
        <div className="flex items-center gap-3">
          <Badge color="gold">{profile.coins} 🪙</Badge>
          <Badge color="cyan">Lvl {profile.level}</Badge>
          <Badge color="violet">ELO {profile.elo}</Badge>
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-full overflow-hidden border border-white/20 hover:border-arcane-violet/60 transition-colors"
              title={profile.displayName}
            >
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="avatar" className="w-8 h-8 object-cover" />
              ) : (
                <div className="w-8 h-8 bg-arcane-violet/40 flex items-center justify-center text-sm">🧙</div>
              )}
            </button>
          ) : (
            <Button size="sm" onClick={login}>
              Sign in
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
            Profile
          </Button>
        </div>
      </header>

      <Card className="w-full max-w-md p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white/70">XP {profile.xp} / {nextXp}</span>
          <span className="text-white/50">{nextXp - profile.xp} to next level</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-arcane-violet to-arcane-cyan transition-all"
            style={{ width: `${Math.min(100, (profile.xp / nextXp) * 100)}%` }}
          />
        </div>
      </Card>

      <main className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
        <Card className="p-6 flex flex-col gap-4 hover:border-arcane-violet/50 transition-colors">
          <div className="text-5xl">⚔️</div>
          <h2 className="font-display text-xl">Multiplayer</h2>
          <p className="text-white/60 text-sm flex-1">
            Duel a real player. Ranked changes ELO; private rooms don't.
          </p>
          <Button onClick={() => navigate('/play')}>Play</Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 hover:border-arcane-cyan/50 transition-colors">
          <div className="text-5xl">📜</div>
          <h2 className="font-display text-xl">Singleplayer</h2>
          <p className="text-white/60 text-sm flex-1">
            Story chapters, bosses, survival, and tournaments. Earn coins and XP.
          </p>
          <Button variant="secondary" onClick={() => navigate('/sp')}>
            World Map
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 hover:border-arcane-gold/50 transition-colors">
          <div className="text-5xl">🪄</div>
          <h2 className="font-display text-xl">Practice</h2>
          <p className="text-white/60 text-sm flex-1">
            Train against a dummy. No stakes, just typing.
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              navigate('/battle', { state: { mode: 'solo-practice' } })
            }
          >
            Train
          </Button>
        </Card>

        <Card className="p-6 flex flex-col gap-4 hover:border-arcane-rose/50 transition-colors">
          <div className="text-5xl">👑</div>
          <h2 className="font-display text-xl">Battle Royale</h2>
          <p className="text-white/60 text-sm flex-1">
            Up to 4 mages fight at once. Last one standing wins.
          </p>
          <Button
            variant="secondary"
            className="border-arcane-rose/40 hover:border-arcane-rose/70 text-arcane-rose"
            onClick={() => navigate('/br')}
          >
            Enter
          </Button>
        </Card>
      </main>

      <footer className="w-full max-w-5xl flex justify-center gap-4 mt-auto pt-10">
        <Button variant="ghost" onClick={() => navigate('/shop')}>
          🛒 Shop
        </Button>
        <Button variant="ghost" onClick={() => navigate('/friends')}>
          👥 Friends
        </Button>
      </footer>
    </div>
  );
}
