import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileSection from '@/components/settings/ProfileSection';
import ThemeToggle from '@/components/settings/ThemeToggle';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">設定</h2>
      </div>

      <div className="space-y-4">
        <ProfileSection />
        <ThemeToggle />
      </div>
    </div>
  );
}
