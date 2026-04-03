import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
}

export function useAllTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.get('/tasks/all').then((res) => res.data),
  });
}

export function useSmartListCounts() {
  const { data: tasks = [] } = useAllTasks();
  const incomplete = tasks.filter((task) => !task.completed_at);

  const todayCount = incomplete.filter((task) => {
    if (!task.due_date) {
      return false;
    }
    const dueLocal = new Date(task.due_date).toLocaleDateString();
    const todayLocal = new Date().toLocaleDateString();
    return dueLocal === todayLocal;
  }).length;

  const scheduledCount = incomplete.filter((task) => task.due_date).length;
  const allCount = incomplete.length;
  const flaggedCount = incomplete.filter((task) => task.flagged === 1).length;

  const taskCountsByList: Record<string, number> = {};
  for (const task of incomplete) {
    taskCountsByList[task.list_id] = (taskCountsByList[task.list_id] || 0) + 1;
  }

  return { todayCount, scheduledCount, allCount, flaggedCount, taskCountsByList };
}
