import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function WelcomePage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center">
        <h1
          className="font-display text-5xl md:text-7xl tracking-wider mb-4"
          style={{ textShadow: '0 0 40px rgba(168,85,247,0.7)' }}
        >
          <span className="text-arcane-violet">VELO</span>
          <span className="text-arcane-cyan">TYPE</span>
        </h1>
        <p className="text-white/50 text-sm md:text-base max-w-sm mx-auto">
          Type words. Cast spells. Destroy your opponents.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold rounded-xl px-6 py-3 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <p className="text-white/30 text-xs text-center">
          Your progress is saved to the cloud automatically.
        </p>
      </div>

      <div className="flex gap-8 text-center text-white/40 text-xs">
        <div>
          <div className="text-2xl mb-1">⚔️</div>
          <div>Real-time PvP</div>
        </div>
        <div>
          <div className="text-2xl mb-1">📜</div>
          <div>Story Campaign</div>
        </div>
        <div>
          <div className="text-2xl mb-1">🏆</div>
          <div>Ranked ELO</div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
