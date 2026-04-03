import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
}

export function useAllTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.get('/tasks/all').then((res) => res.data),
  });
}

export function useSmartListCounts() {
  const { data: tasks = [] } = useAllTasks();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const incomplete = tasks.filter((task) => !task.completed_at);

  const todayCount = incomplete.filter(
    (task) => task.due_date && task.due_date >= todayStart && task.due_date < todayEnd,
  ).length;

  const scheduledCount = incomplete.filter((task) => task.due_date).length;
  const allCount = incomplete.length;
  const flaggedCount = incomplete.filter((task) => task.flagged === 1).length;

  const taskCountsByList: Record<string, number> = {};
  for (const task of incomplete) {
    taskCountsByList[task.list_id] = (taskCountsByList[task.list_id] || 0) + 1;
  }

  return { todayCount, scheduledCount, allCount, flaggedCount, taskCountsByList };
}
