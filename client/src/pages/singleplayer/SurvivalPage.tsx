import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SurvivalPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sp')}>
        ← World Map
      </Button>
      <Card className="p-8 mt-6 text-center">
        <h1 className="font-display text-3xl mb-3">Survival</h1>
        <p className="text-white/60 mb-6">
          Endless waves of enemies. HP carries between fights. Defeat as many as you can.
        </p>
        <p className="text-sm text-arcane-orange mb-4">Coming soon — wave loop wiring in progress.</p>
        <Button variant="secondary" onClick={() => navigate('/sp')}>
          Back
        </Button>
      </Card>
    </div>
  );
}
