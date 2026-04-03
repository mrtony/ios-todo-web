import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskItem from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { useAllTasks } from '@/hooks/use-all-tasks';

const SMART_LIST_CONFIG: Record<string, { title: string; color: string }> = {
  today: { title: '今天', color: '#3b82f6' },
  scheduled: { title: '已排程', color: '#f97316' },
  all: { title: '全部', color: '#8b5cf6' },
  flagged: { title: '已標記', color: '#ef4444' },
};

export default function SmartListPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { data: allTasks = [] } = useAllTasks();

  const config = SMART_LIST_CONFIG[type || ''];
  if (!config) {
    return <div className="p-8 text-center">不存在的清單</div>;
  }

  const incomplete = allTasks.filter((task) => !task.completed_at);

  let filtered = incomplete;
  switch (type) {
    case 'today':
      filtered = incomplete.filter((task) => {
        if (!task.due_date) {
          return false;
        }
        const dueLocal = new Date(task.due_date).toLocaleDateString();
        const todayLocal = new Date().toLocaleDateString();
        return dueLocal === todayLocal;
      });
      break;
    case 'scheduled':
      filtered = incomplete.filter((task) => task.due_date);
      break;
    case 'flagged':
      filtered = incomplete.filter((task) => task.flagged === 1);
      break;
    case 'all':
    default:
      filtered = incomplete;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold" style={{ color: config.color }}>
          {config.title}
        </h2>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">沒有任務</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              completed={false}
              priority={task.priority}
              dueDate={task.due_date}
              flagged={task.flagged === 1}
              color={config.color}
              onToggleComplete={() => navigate(`/lists/${task.list_id}`)}
              onClick={() => navigate(`/lists/${task.list_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
