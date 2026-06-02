import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function TournamentPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sp')}>
        ← World Map
      </Button>
      <Card className="p-8 mt-6 text-center">
        <h1 className="font-display text-3xl mb-3">Tournament</h1>
        <p className="text-white/60 mb-6">
          Bracket of 8 bots. Win three rounds in a row to claim the prize.
        </p>
        <p className="text-sm text-arcane-orange mb-4">Coming soon — bracket structure in progress.</p>
        <Button variant="secondary" onClick={() => navigate('/sp')}>
          Back
        </Button>
      </Card>
    </div>
  );
}
