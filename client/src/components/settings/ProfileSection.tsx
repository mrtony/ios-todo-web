import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

export default function ProfileSection() {
  const { user, logout } = useAuth();

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{user?.name}</h3>
      <p className="text-sm text-muted-foreground">{user?.email}</p>
      <Button variant="outline" className="mt-4" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        登出
      </Button>
    </div>
  );
}
