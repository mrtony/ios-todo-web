import { Bookmark, Briefcase, ChevronRight, Flag, Heart, Home, List, ShoppingCart, Star, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ICON_MAP: Record<string, LucideIcon> = {
  list: List,
  cart: ShoppingCart,
  home: Home,
  briefcase: Briefcase,
  heart: Heart,
  star: Star,
  flag: Flag,
  bookmark: Bookmark,
};

interface ListItemProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
}

export default function ListItem({ id, name, color, icon, taskCount }: ListItemProps) {
  const navigate = useNavigate();
  const IconComponent = ICON_MAP[icon] || List;

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent"
      onClick={() => navigate(`/lists/${id}`)}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        <IconComponent className="h-4 w-4" />
      </div>
      <span className="flex-1 font-medium">{name}</span>
      <span className="text-sm text-muted-foreground">{taskCount}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
