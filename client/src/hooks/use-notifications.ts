import { useEffect, useRef } from 'react';
import { useAllTasks } from './use-all-tasks';

interface NotificationTask {
  id: string;
  title?: string;
  completed_at: string | null;
  due_date: string | null;
}

export function useTaskNotifications() {
  const { data: tasks = [] } = useAllTasks();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return undefined;
    }

    const interval = setInterval(() => {
      const now = new Date();

      (tasks as NotificationTask[]).forEach((task) => {
        if (task.completed_at || !task.due_date) {
          return;
        }
        if (notifiedRef.current.has(task.id)) {
          return;
        }

        const dueDate = new Date(task.due_date);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffMin = diffMs / (1000 * 60);

        if (diffMin > 0 && diffMin <= 15) {
          new Notification('待辦事項提醒', {
            body: `「${task.title ?? '未命名任務'}」即將到期`,
            icon: '/favicon.svg',
          });
          notifiedRef.current.add(task.id);
        }

        if (diffMin <= 0 && diffMin > -1) {
          new Notification('待辦事項已到期', {
            body: `「${task.title ?? '未命名任務'}」已過期`,
            icon: '/favicon.svg',
          });
          notifiedRef.current.add(task.id);
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);
}
