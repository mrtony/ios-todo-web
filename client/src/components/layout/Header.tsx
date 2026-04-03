import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-2xl font-bold">我的清單</h1>
      <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
        <Settings className="h-5 w-5" />
      </Button>
    </header>
  );
}
