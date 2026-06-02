import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePlayerStore, xpForNextLevel } from '@/store/usePlayerStore';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const profile = usePlayerStore((s) => s.profile);
  const reset = usePlayerStore((s) => s.reset);
  const { user, login, logout, loading } = useAuth();
  const nextXp = xpForNextLevel(profile.level);
  const winRate =
    profile.stats.totalMatches > 0
      ? Math.round((profile.stats.wins / profile.stats.totalMatches) * 100)
      : 0;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Home
        </Button>
        <h1 className="font-display text-2xl">Profile</h1>
        <div />
      </div>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-arcane-violet"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-arcane-violet to-arcane-cyan flex items-center justify-center text-3xl">
              🧙
            </div>
          )}
          <div>
            <h2 className="font-display text-xl">{profile.displayName}</h2>
            <div className="flex gap-2 mt-1">
              <Badge color="violet">ELO {profile.elo}</Badge>
              <Badge color="cyan">Lvl {profile.level}</Badge>
              <Badge color="gold">{profile.coins} 🪙</Badge>
            </div>
            {user && (
              <p className="text-xs text-white/40 mt-1">{user.email}</p>
            )}
          </div>
        </div>
        <div className="text-sm text-white/60 mb-1">
          XP {profile.xp} / {nextXp}
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-arcane-violet to-arcane-cyan"
            style={{ width: `${Math.min(100, (profile.xp / nextXp) * 100)}%` }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatBox label="Wins" value={profile.stats.wins} color="text-arcane-lime" />
        <StatBox label="Losses" value={profile.stats.losses} color="text-arcane-rose" />
        <StatBox label="Win rate" value={`${winRate}%`} color="text-arcane-cyan" />
      </div>

      <Card className="p-5 mb-4">
        <h3 className="font-display text-lg mb-3">Inventory</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(profile.inventory).map(([id, count]) => (
            <div
              key={id}
              className="flex justify-between bg-black/30 rounded-lg px-3 py-2"
            >
              <span className="text-white/70">{id}</span>
              <span className="font-mono text-arcane-gold">×{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Auth section */}
      <Card className="p-5 mb-4">
        <h3 className="font-display text-lg mb-3">Account</h3>
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Signed in with Google</p>
              <p className="text-xs text-white/40">{user.email}</p>
              <p className="text-xs text-arcane-lime mt-1">✓ Progress saved to cloud</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Not signed in</p>
              <p className="text-xs text-white/40">Sign in to save progress across devices</p>
            </div>
            <Button size="sm" onClick={login} disabled={loading}>
              {loading ? 'Loading...' : 'Sign in with Google'}
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm('Reset all progress? This cannot be undone.')) reset();
          }}
        >
          Reset progress
        </Button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-white/50 mb-1">{label}</div>
      <div className={`font-display text-2xl ${color}`}>{value}</div>
    </Card>
  );
}
