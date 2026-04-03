import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  dueDate: string | null;
  flagged: boolean;
  color: string;
  onToggleComplete: (id: string) => void;
  onClick: (id: string) => void;
}

const priorityLabels: Record<number, { label: string; className: string }> = {
  1: { label: '低', className: 'bg-blue-100 text-blue-700' },
  2: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
  3: { label: '高', className: 'bg-red-100 text-red-700' },
};

export default function TaskItem({
  id,
  title,
  completed,
  priority,
  dueDate,
  flagged,
  color,
  onToggleComplete,
  onClick,
}: TaskItemProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-accent ${
        completed ? 'opacity-50' : ''
      }`}
      onClick={() => onClick(id)}
    >
      <button
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          completed ? 'border-transparent text-white' : 'border-current'
        }`}
        style={{ borderColor: completed ? undefined : color, backgroundColor: completed ? color : 'transparent' }}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete(id);
        }}
      >
        {completed && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>
          {title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {dueDate && (
            <span className="text-xs text-muted-foreground">{formatDate(dueDate)}</span>
          )}
          {priority > 0 && priorityLabels[priority] && (
            <Badge variant="secondary" className={`text-xs ${priorityLabels[priority].className}`}>
              {priorityLabels[priority].label}
            </Badge>
          )}
          {flagged && (
            <Badge variant="secondary" className="bg-orange-100 text-xs text-orange-700">⚑</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
