import { Check } from 'lucide-react';

interface SubtaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  color: string;
  onToggleComplete: (id: string) => void;
}

export default function SubtaskItem({
  id,
  title,
  completed,
  color,
  onToggleComplete,
}: SubtaskItemProps) {
  return (
    <div className={`flex items-center gap-3 py-2 pl-12 pr-3 ${completed ? 'opacity-50' : ''}`}>
      <button
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          completed ? 'border-transparent text-white' : 'border-current'
        }`}
        style={{ borderColor: completed ? undefined : color, backgroundColor: completed ? color : 'transparent' }}
        onClick={() => onToggleComplete(id)}
      >
        {completed && <Check className="h-3 w-3" />}
      </button>
      <span className={`text-sm text-muted-foreground ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </div>
  );
}
