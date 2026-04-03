import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ListItemProps {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

export default function ListItem({ id, name, color, taskCount }: ListItemProps) {
  const navigate = useNavigate();

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent"
      onClick={() => navigate(`/lists/${id}`)}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
        style={{ backgroundColor: color }}
      >
        ●
      </div>
      <span className="flex-1 font-medium">{name}</span>
      <span className="text-sm text-muted-foreground">{taskCount}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
