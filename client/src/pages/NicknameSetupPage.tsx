import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAuth } from '@/context/AuthContext';
import { saveProfile } from '@/lib/firebase/firestore';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

export default function NicknameSetupPage() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { profile, setProfile } = usePlayerStore();

  function validate(v: string) {
    if (v.length < 3) return 'At least 3 characters';
    if (v.length > 16) return 'Max 16 characters';
    if (!USERNAME_RE.test(v)) return 'Letters, numbers, underscores only';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(value);
    if (err) { setError(err); return; }
    if (!user) return;

    setSaving(true);
    const updated = { ...profile, username: value, displayName: value };
    setProfile(updated);
    await saveProfile(user.uid, updated);
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧙</div>
          <h1 className="font-display text-2xl mb-2">Choose Your Name</h1>
          <p className="text-white/50 text-sm">
            This is how other players will see you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              placeholder="YourNickname"
              maxLength={16}
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 font-mono text-lg text-white placeholder-white/30 focus:outline-none focus:border-arcane-violet/60 transition-colors text-center"
            />
            {error && (
              <p className="text-arcane-rose text-xs mt-1 text-center">{error}</p>
            )}
            <p className="text-white/30 text-xs mt-1 text-center">
              3–16 chars · letters, numbers, underscores
            </p>
          </div>

          <Button type="submit" disabled={saving || value.length < 3}>
            {saving ? 'Saving...' : 'Enter the Arena →'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
